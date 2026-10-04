"""Author the current blank MDF square's source-aligned alpha mask.

Uses the existing Pillow, NumPy and SciPy authoring tools, not browser code.
Run with --check to verify the committed mask without writing any files.
The source hash guards against reusing this selection on a different photo.
"""
import argparse
from hashlib import sha256
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public/keychains/mdf-square.png'
OUTPUT = ROOT / 'public/keychains/mdf-square-mask.png'
SOURCE_HASH = '31c0253c037870eac5e77428ea020af4a176998fc6581a42e0ab4d67e270d3df'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()

if sha256(SOURCE.read_bytes()).hexdigest() != SOURCE_HASH:
    raise SystemExit('The MDF square photograph changed. Re-author its face selection first.')

image = Image.open(SOURCE).convert('RGB')
rgb = np.asarray(image, dtype=np.float64) / 255
labels, _ = ndimage.label(np.min(rgb, axis=2) > 190 / 255)
face_label = labels[815, 627]
if not face_label:
    raise SystemExit('The selection seed is not on the white square plate.')
# The table and other bright objects are separate components. Preserve the
# chain's intrusion into the top edge, including the small attachment holes.
face = labels == face_label
distance = ndimage.distance_transform_edt(face)
support = ndimage.binary_dilation(face)
background_band = ndimage.binary_dilation(face, iterations=4)
_, background_index = ndimage.distance_transform_edt(background_band, return_indices=True)
_, foreground_index = ndimage.distance_transform_edt(distance < 4, return_indices=True)

# Local foreground/background colour unmixing in linear light preserves the
# photographed rounded corners without repainting the MDF rim or its shadow.
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
        raise SystemExit('The committed square mask is missing or differs from its source selection.')
else:
    mask.save(OUTPUT, optimize=True)


def simplify(points, tolerance=1.5):
    """Simplify ONLY the pointer hit target; visible clipping uses the PNG."""
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


# The square is vertically monotone apart from its attachment holes; an outer
# silhouette is sufficient for the non-rendering pointer/keyboard hit target.
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
assert np.all(rgba[:, :, 3][distance >= 2] == 255), 'Interior coverage is incomplete'
assert np.all(rgba[:, :, 3][~support] == 0), 'Mask extends outside the photographed plate'
print('Opaque print interior and transparent exterior verified.')