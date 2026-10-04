export interface FrameCrop { zoom: number; x: number; y: number }
export interface ImageSize { width: number; height: number }
export const DEFAULT_FRAME_CROP: FrameCrop = { zoom: 1, x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function normalizeFrameCrop(crop: FrameCrop): FrameCrop {
  return {
    zoom: clamp(Number.isFinite(crop.zoom) ? crop.zoom : 1, 1, 4),
    x: clamp(Number.isFinite(crop.x) ? crop.x : 0, -1, 1),
    y: clamp(Number.isFinite(crop.y) ? crop.y : 0, -1, 1),
  };
}

// Cover-fit is the minimum zoom. Normalized pan survives responsive resizing
// and orientation/size changes without exposing blank edges.
export function framePlacement(image: ImageSize, area: ImageSize, crop: FrameCrop) {
  const view = normalizeFrameCrop(crop);
  const scale = Math.max(area.width / image.width, area.height / image.height) * view.zoom;
  const width = image.width * scale, height = image.height * scale;
  return { width, height, x: -(width - area.width) * (1 - view.x) / 2, y: -(height - area.height) * (1 - view.y) / 2 };
}

export function panFrameCrop(image: ImageSize, area: ImageSize, crop: FrameCrop, dx: number, dy: number): FrameCrop {
  const placed = framePlacement(image, area, crop);
  const extraX = placed.width - area.width, extraY = placed.height - area.height;
  return normalizeFrameCrop({
    zoom: crop.zoom,
    x: extraX > 0.00001 ? crop.x + 2 * dx / extraX : 0,
    y: extraY > 0.00001 ? crop.y + 2 * dy / extraY : 0,
  });
}

export function wheelFrameZoom(zoom: number, deltaY: number, deltaMode = 0): number {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 400 : 1);
  return normalizeFrameCrop({ zoom: zoom * Math.exp(-clamp(pixels, -100, 100) * 0.002), x: 0, y: 0 }).zoom;
}

// Shared by preview and export; the matte border is part of the outer dimensions.
export function frameAperture(dimensions: ImageSize): ImageSize {
  return { width: dimensions.width - 0.6, height: dimensions.height - 0.6 };
}

export function frameSourceCrop(image: ImageSize, area: ImageSize, crop: FrameCrop) {
  const placement = framePlacement(image, area, crop);
  const scale = placement.width / image.width;
  return { sx: -placement.x / scale, sy: -placement.y / scale, sw: area.width / scale, sh: area.height / scale };
}

export function validateFramePhoto(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Please choose a JPG, PNG or WebP photo.';
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) return 'Choose a non-empty photo smaller than 10 MB.';
  return null;
}