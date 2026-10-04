export interface Point { x: number; y: number }
export interface Size { width: number; height: number }
export interface PhotoView extends Point {
  zoom: number;
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
}
export type Matrix = [number, number, number, number, number, number];
export interface PhotoRegion {
  id: string;
  path: string;
  pathTransform?: Matrix;
  // Optional alpha matte on the same full image canvas as the product photo.
  // When present it replaces the vector crop; the path is only a hit target.
  maskUrl?: string;
  // Maps the local photo-box centre (0,0) to the photographed print surface.
  matrix: Matrix;
  photo: number | 'active';
}
export interface MockupTemplate {
  box: Size;
  regions: PhotoRegion[];
}

export const INITIAL_VIEW: PhotoView = {
  x: 0, y: 0, zoom: 1, rotation: 0, brightness: 1, contrast: 1, saturation: 1,
};
// Zooming out deliberately keeps the photo centered and shows the print's
// white background around it. This matches the white export canvas.
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 5;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function photoLayout(photo: Size, box: Size, view: PhotoView) {
  const sideways = view.rotation % 180 !== 0;
  const rotated = sideways ? { width: photo.height, height: photo.width } : photo;
  const scale = Math.max(box.width / rotated.width, box.height / rotated.height) * view.zoom;
  return { scale, width: rotated.width * scale, height: rotated.height * scale };
}

export function fitView(view: PhotoView, photo: Size, box: Size): PhotoView {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  const size = photoLayout(photo, box, { ...view, zoom });
  const dx = Math.max(0, (size.width - box.width) / 2);
  const dy = Math.max(0, (size.height - box.height) / 2);
  return { ...view, zoom, x: clamp(view.x, -dx, dx), y: clamp(view.y, -dy, dy) };
}

// Keep the point under the wheel / pinch midpoint fixed unless a boundary is hit.
export function zoomAt(view: PhotoView, photo: Size, box: Size, factor: number, point: Point): PhotoView {
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const k = zoom / view.zoom;
  return fitView({ ...view, zoom, x: point.x - (point.x - view.x) * k,
    y: point.y - (point.y - view.y) * k }, photo, box);
}

export function toLocal(matrix: Matrix, point: Point): Point {
  const [a, b, c, d, e, f] = matrix;
  const determinant = a * d - b * c;
  return { x: (d * (point.x - e) - c * (point.y - f)) / determinant,
    y: (-b * (point.x - e) + a * (point.y - f)) / determinant };
}

export function transformPoint(matrix: Matrix, point: Point): Point {
  const [a, b, c, d, e, f] = matrix;
  return { x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f };
}

export function placement(angle: number, center: Point, boxCenter = center): Matrix {
  const a = angle * Math.PI / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  return [cos, sin, -sin, cos,
    center.x + cos * (boxCenter.x - center.x) - sin * (boxCenter.y - center.y),
    center.y + sin * (boxCenter.x - center.x) + cos * (boxCenter.y - center.y)];
}

export function movePhoto(view: PhotoView, photo: Size, box: Size, from: Point, to: Point): PhotoView {
  return fitView({ ...view, x: view.x + to.x - from.x, y: view.y + to.y - from.y }, photo, box);
}

export function pinchPhoto(view: PhotoView, photo: Size, box: Size,
  from: Point, to: Point, other: Point): PhotoView {
  const before = Math.hypot(from.x - other.x, from.y - other.y);
  const after = Math.hypot(to.x - other.x, to.y - other.y);
  if (before < 0.01 || after < 0.01) return view;
  const oldMid = { x: (from.x + other.x) / 2, y: (from.y + other.y) / 2 };
  const newMid = { x: (to.x + other.x) / 2, y: (to.y + other.y) / 2 };
  const zoom = clamp(view.zoom * after / before, MIN_ZOOM, MAX_ZOOM);
  const k = zoom / view.zoom;
  return fitView({ ...view, zoom, x: newMid.x - (oldMid.x - view.x) * k,
    y: newMid.y - (oldMid.y - view.y) * k }, photo, box);
}

// Coordinates in the rotated ORIGINAL image; never re-crop a previously saved JPEG.
export function cropPixels(photo: Size, box: Size, view: PhotoView) {
  const fitted = fitView(view, photo, box);
  const size = photoLayout(photo, box, fitted);
  return { sx: (size.width / 2 - box.width / 2 - fitted.x) / size.scale,
    sy: (size.height / 2 - box.height / 2 - fitted.y) / size.scale,
    sw: box.width / size.scale, sh: box.height / size.scale };
}

export function regionPhotoIndex(region: PhotoRegion, active: number, count: number) {
  return region.photo === 'active' ? active : Math.min(region.photo, count - 1);
}

export function serializeDesign(templateId: string, photos: ({ url: string; view: PhotoView } & Size)[]) {
  return { template_id: templateId, version: 1,
    photos: photos.map((photo) => ({ original_url: photo.url, width: photo.width,
      height: photo.height, view: { ...photo.view } })) };
}