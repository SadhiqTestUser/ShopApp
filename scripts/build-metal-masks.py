"""Author source-aligned masks for the current blank metal keychain photos.

Uses the existing Pillow/NumPy/SciPy tools. No segmentation runs in the browser.
Run with --check to verify committed masks without writing. Metadata printed
below belongs in metalSurfaces.ts; visible clipping always uses the PNGs.
Source hashes deliberately reject replacement photos until re-authored.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
# Each seed is on the white print inset, not the reflective metal surround.
# On the right love face, a 190 threshold bridges into the silver rim; 195
# separates it. Preserve attachment recesses instead of filling their holes.
SOURCES = [
    ('metal-love', 'd3e3e64510715475d0eaa4170064bfdd8eb5818e25e297dae2e17c45ace979eb',
     [('left', 350, 730, 190), ('right', 860, 740, 195)]),
    ('metal-square', 'c9355e5961fd7208240adf7fa35997cb37c85ef2b3ced8765924bbf82ddb7bfb',
     [('face', 627, 800, 190)]),
    ('metal-rectangle', '97c64f2ef5e6109013809f5fcb3d96c913fa9211e3cbc48757d59bd86251e9cc',
     [('face', 627, 815, 190)]),
    ('metal-hexagon', '2d1351ea3b0c44c1f05edcfd4f009ffa41878b83cec5a00ae4e39c0442bc1591',
     [('face', 627, 800, 190)]),
]


def simplify(points, tolerance=1.5):
    """Simplify a pointer hit outline, NEVER the visible alpha selection."""
    if len(points) < 3:
        return points
    direction = points[-1] - points[0]
    squared_length = np.sum(direction * direction)
    if squared_length == 0:
        return points[[0, -1]]
    t = np.clip(np.sum((points - points[0]) * direction, axis=1) / squared_length, 0, 1)
    distances = np.linalg.norm(points - (points[0] + t[:, None] * direction), axis=1)
    split = int(np.argmax(distances))
    if distances[split] <= tolerance:
        return points[[0, -1]]
    return np.concatenate((simplify(points[:split + 1])[:-1], simplify(points[split:])))


def matte(rgb, face):
    distance = ndimage.distance_transform_edt(face)
    support = ndimage.binary_dilation(face)
    band = ndimage.binary_dilation(face, iterations=4)
    _, bi = ndimage.distance_transform_edt(band, return_indices=True)
    _, fi = ndimage.distance_transform_edt(distance < 4, return_indices=True)
    # Recover antialiasing from local foreground/background samples in linear
    # light. This retains the inset edge without painting the bezel or shadow.
    linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    background, foreground = linear[bi[0], bi[1]], linear[fi[0], fi[1]]
    direction = foreground - background
    alpha = np.clip(np.sum((linear - background) * direction, axis=2)
                    / np.maximum(np.sum(direction * direction, axis=2), 1e-6), 0, 1)
    alpha[~support] = 0
    alpha[distance >= 2] = 1
    rgba = np.full((*face.shape, 4), 255, dtype=np.uint8)
    rgba[:, :, 3] = np.rint(alpha * 255).astype(np.uint8)
    assert np.all(rgba[:, :, 3][distance >= 2] == 255), 'Incomplete print interior'
    assert np.all(rgba[:, :, 3][~support] == 0), 'Mask extends outside the inset'
    return rgba


def describe(face, rgba):
    # The upright print faces are vertically monotone apart from hardware
    # recesses; their exterior silhouette is sufficient for pointer input.
    columns = np.flatnonzero(face.any(axis=0))
    upper = np.array([(x + .5, np.flatnonzero(face[:, x])[0]) for x in columns])
    lower = np.array([(x + .5, np.flatnonzero(face[:, x])[-1] + 1) for x in columns[::-1]])
    outline = np.concatenate((simplify(upper), simplify(lower)))
    commands = [('M' if i == 0 else 'L') + f'{x:g} {y:g}' for i, (x, y) in enumerate(outline)]
    ys, xs = np.where(rgba[:, :, 3] > 0)
    frame = dict(x=int(xs.min()), y=int(ys.min()), width=int(xs.max() + 1 - xs.min()),
                 height=int(ys.max() + 1 - ys.min()))
    return frame, ' '.join(commands) + ' Z'


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
metadata = {}
for name, expected_hash, selections in SOURCES:
    source = ROOT / f'public/keychains/{name}.png'
    if sha256(source.read_bytes()).hexdigest() != expected_hash:
        raise SystemExit(f'{name} changed. Re-author its face selection first.')
    image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    rgb = np.asarray(image, dtype=np.float64) / 255
    regions, occupied = [], np.zeros(rgb.shape[:2], dtype=bool)
    for slot, (region_id, x, y, threshold) in enumerate(selections):
        labels, _ = ndimage.label(np.min(rgb, axis=2) > threshold / 255)
        if not labels[y, x]:
            raise SystemExit(f'{name}/{region_id}: seed is not on a white print inset.')
        face = labels == labels[y, x]
        rgba = matte(rgb, face)
        visible = rgba[:, :, 3] > 0
        assert not np.any(occupied & visible), 'Photo regions must not overlap'
        occupied |= visible
        suffix = '' if region_id == 'face' else '-' + region_id
        filename = f'{name}{suffix}-mask.png'
        output = ROOT / 'public/keychains' / filename
        if args.check:
            if not output.exists() or not np.array_equal(np.asarray(Image.open(output)), rgba):
                raise SystemExit(f'{filename} is missing or differs from its source selection.')
        else:
            Image.fromarray(rgba).save(output, optimize=True)
        frame, path = describe(face, rgba)
        regions.append(dict(id=region_id, photo='active' if len(selections) == 1 else slot,
                            maskUrl='/keychains/' + filename, frame=frame, path=path))
    metadata['keychain-' + name] = dict(width=image.width, height=image.height,
                                      sourceSha256=expected_hash, regions=regions)
if args.check:
    committed = json.loads(subprocess.check_output([
        'node', '--input-type=module', '-e',
        "import { METAL_SURFACES } from './src/components/keychain/metalSurfaces.ts'; "
        "console.log(JSON.stringify(METAL_SURFACES));",
    ], cwd=ROOT, text=True))
    if committed != metadata:
        raise SystemExit('metalSurfaces.ts does not match the measured source masks.')
    print('All five masks verified; source hashes, frames and hit targets match metadata.')
else:
    print(json.dumps(metadata, indent=2))
    print('Generated all five metal print masks.')