// Canvas helpers for the in-browser photo editor: rotation, filters, and crop.
// All work is done on same-origin blob object URLs so the canvas is never tainted.

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface EditParams {
  brightness: number; // 1 = unchanged
  contrast: number; // 1 = unchanged
  saturation: number; // 1 = unchanged
  rotation: number; // 0 | 90 | 180 | 270
  crop: CropRect | null; // in rotated-image pixel coordinates
}

export const DEFAULT_EDIT: Omit<EditParams, 'crop'> = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  rotation: 0,
};

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for editing.'));
    img.src = url;
  });
}

// Size of an image after applying a 0/90/180/270 rotation.
export function getRotatedSize(w: number, h: number, rotation: number) {
  const r = ((rotation % 360) + 360) % 360;
  return r === 90 || r === 270 ? { width: h, height: w } : { width: w, height: h };
}

export function filterString(brightness: number, contrast: number, saturation: number): string {
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
}

// Draw the source image rotated (no filters) onto a fresh canvas.
function drawRotated(img: HTMLImageElement, rotation: number, filter?: string): HTMLCanvasElement {
  const r = ((rotation % 360) + 360) % 360;
  const { width, height } = getRotatedSize(img.naturalWidth, img.naturalHeight, r);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  if (filter) ctx.filter = filter;
  ctx.translate(width / 2, height / 2);
  ctx.rotate((r * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvas;
}

// Produce a rotated (unfiltered) preview URL plus its dimensions. Used by the
// editor to lay out the crop frame; filters are applied live via CSS on top.
export async function renderRotated(
  url: string,
  rotation: number
): Promise<{ url: string; width: number; height: number }> {
  const img = await loadImage(url);
  const canvas = drawRotated(img, rotation);
  return {
    url: canvas.toDataURL('image/jpeg', 0.95),
    width: canvas.width,
    height: canvas.height,
  };
}

// Bake rotation + filters + crop into a single JPEG blob for upload.
export async function exportEdited(url: string, params: EditParams): Promise<Blob> {
  const img = await loadImage(url);
  const base = drawRotated(
    img,
    params.rotation,
    filterString(params.brightness, params.contrast, params.saturation)
  );

  let out = base;
  if (params.crop) {
    const { sx, sy, sw, sh } = params.crop;
    const w = Math.max(1, Math.round(sw));
    const h = Math.max(1, Math.round(sh));
    const cropped = document.createElement('canvas');
    cropped.width = w;
    cropped.height = h;
    const ctx = cropped.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser.');
    ctx.drawImage(base, Math.round(sx), Math.round(sy), w, h, 0, 0, w, h);
    out = cropped;
  }

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not export the edited photo.'))),
      'image/jpeg',
      0.92
    );
  });
}
