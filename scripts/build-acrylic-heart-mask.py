"""Author the acrylic face's alpha matte; never run segmentation in the browser.

Run with python3 scripts/build-acrylic-heart-mask.py. Uses the authoring
environment's Pillow, NumPy and SciPy, not additional app dependencies.
The original photograph is read-only. The generated PNG retains its full canvas
so SVG xMidYMid meet aligns the photo and matte without separately fitted paths.
"""
from hashlib import sha256
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public/keychains/acrylic-heart.jpg'
OUTPUT = ROOT / 'public/keychains/acrylic-heart-mask.png'
SOURCE_HASH = '20363e03610270939377e810a975c51afa464dc0af127658051db68ebebccf36'

if sha256(SOURCE.read_bytes()).hexdigest() != SOURCE_HASH:
    raise SystemExit('The photograph changed. Re-author the face selection before generating its mask.')

image = Image.open(SOURCE).convert('RGB')
rgb = np.asarray(image, dtype=np.float64) / 255

# Select the connected white plate, not the blue backdrop, the other objects,
# or the disconnected metallic highlights. The seed lies inside the plate.
labels, _ = ndimage.label(np.min(rgb, axis=2) > 190 / 255)
face_label = labels[480, 400]
if not face_label:
    raise SystemExit('The face selection seed is not on the white plate.')
face = ndimage.binary_fill_holes(labels == face_label)

# Interior markings in the sample photograph must not punch holes in the print.
# Only a two-pixel edge band needs matting; the actual print interior is opaque.
interior_distance = ndimage.distance_transform_edt(face)
support = ndimage.binary_dilation(face)
background_band = ndimage.binary_dilation(face, iterations=4)
_, background_index = ndimage.distance_transform_edt(background_band, return_indices=True)

# Foreground/background colour unmixing, C = alpha*F + (1-alpha)*B, evaluated
# in linear light. White is F; B is sampled just outside the local face edge.
# This retains the photographed antialiased edge instead of expanding a curve
# over the acrylic rim or smoothing across the attachment recess.
linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
background = linear[background_index[0], background_index[1]]
direction = 1 - background
denominator = np.sum(direction * direction, axis=2)
alpha = np.clip(np.sum((linear - background) * direction, axis=2)
                / np.maximum(denominator, 1e-6), 0, 1)
alpha[~support] = 0
alpha[interior_distance >= 2] = 1

rgba = np.full((*face.shape, 4), 255, dtype=np.uint8)
rgba[:, :, 3] = np.rint(alpha * 255).astype(np.uint8)
mask = Image.fromarray(rgba)
mask.save(OUTPUT, optimize=True)

ys, xs = np.where(rgba[:, :, 3] > 0)
print('Generated:', OUTPUT.relative_to(ROOT))
print('Dimensions:', mask.size, 'alpha bounds:', (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
print('Opaque print interior:', bool(np.all(rgba[:, :, 3][interior_distance >= 2] == 255)))
print('Transparent outside selection:', bool(np.all(rgba[:, :, 3][~support] == 0)))