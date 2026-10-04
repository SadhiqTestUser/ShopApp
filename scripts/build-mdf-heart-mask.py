"""Author the current blank MDF heart's source-aligned alpha mask.

Uses the existing Pillow, NumPy and SciPy authoring tools, not browser code.
Run with --check to verify the committed mask without writing any files.
Printed source images need a different selection; never reuse these seeds
after replacing the photograph. The source hash intentionally guards that.
"""
import argparse
from hashlib import sha256
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public/keychains/mdf-heart.png'
OUTPUT = ROOT / 'public/keychains/mdf-heart-mask.png'
SOURCE_HASH = 'd5a0c622679a047fbfd9395eaf54743fd622e595e8c83f37f54eade144b865c0'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()

if sha256(SOURCE.read_bytes()).hexdigest() != SOURCE_HASH:
    raise SystemExit('The MDF photograph changed. Re-author its face selection first.')

image = Image.open(SOURCE).convert('RGB')
rgb = np.asarray(image, dtype=np.float64) / 255
labels, _ = ndimage.label(np.min(rgb, axis=2) > 190 / 255)
face_label = labels[752, 752]
if not face_label:
    raise SystemExit('The selection seed is not on the white MDF plate.')
# Keep attachment recesses/holes; do not fill across the metal hardware.
face = labels == face_label
distance = ndimage.distance_transform_edt(face)
support = ndimage.binary_dilation(face)
background_band = ndimage.binary_dilation(face, iterations=4)
_, background_index = ndimage.distance_transform_edt(background_band, return_indices=True)
_, foreground_index = ndimage.distance_transform_edt(distance < 4, return_indices=True)

# Recover the photographed antialiasing in linear light. Local foreground
# samples account for the off-white plate, rather than assuming pure white.
linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
background = linear[background_index[0], background_index[1]]
foreground = linear[foreground_index[0], foreground_index[1]]
direction = foreground - background
alpha = np.clip(np.sum((linear - background) * direction, axis=2)
                / np.maximum(np.sum(direction * direction, axis=2), 1e-6), 0, 1)
alpha[~support] = 0
alpha[distance >= 2] = 1
rgba = np.full((*face.shape, 4), 255, dtype=np.uint8)
rgba[:, :, 3] = np.rint(alpha * 255).astype(np.uint8)
mask = Image.fromarray(rgba)
if args.check:
    if not OUTPUT.exists() or not np.array_equal(np.asarray(Image.open(OUTPUT)), rgba):
        raise SystemExit('The committed MDF mask is missing or differs from its source selection.')
else:
    mask.save(OUTPUT, optimize=True)


def simplify(points, tolerance=1.5):
    """Simplify ONLY the pointer hit target. Never use this as the alpha mask."""
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


# This upright heart is vertically monotone apart from small attachment holes.
# Its outside silhouette is sufficient for pointer/keyboard interaction.
columns = np.flatnonzero(face.any(axis=0))
upper = np.array([(x + 0.5, np.flatnonzero(face[:, x])[0]) for x in columns])
lower = np.array([(x + 0.5, np.flatnonzero(face[:, x])[-1] + 1) for x in columns[::-1]])
outline = np.concatenate((simplify(upper), simplify(lower)))
commands = [('M' if i == 0 else 'L') + f'{x:g} {y:g}' for i, (x, y) in enumerate(outline)]
ys, xs = np.where(rgba[:, :, 3] > 0)
print('Verified:' if args.check else 'Generated:', OUTPUT.relative_to(ROOT))
print('Source dimensions:', image.size)
print('Frame x/y/width/height:', (int(xs.min()), int(ys.min()),
      int(xs.max() + 1 - xs.min()), int(ys.max() + 1 - ys.min())))
print('Hit target (not clipping geometry):', ' '.join(commands) + ' Z')
print('Opaque print interior:', bool(np.all(rgba[:, :, 3][distance >= 2] == 255)))
print('Transparent outside selection:', bool(np.all(rgba[:, :, 3][~support] == 0)))