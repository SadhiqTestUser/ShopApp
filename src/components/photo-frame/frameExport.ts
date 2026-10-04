import { loadImage } from '@/lib/imageEdit';
import { frameAperture, frameSourceCrop, type FrameCrop, type ImageSize } from './frameGeometry';

// Export the actual visible crop, not a screenshot of the editor or an uncropped
// source. Keep the original separately for production at larger print sizes.
export async function exportFramePhoto(url: string, dimensions: ImageSize, crop: FrameCrop): Promise<Blob> {
  const image = await loadImage(url);
  const area = frameAperture(dimensions);
  const source = frameSourceCrop({ width: image.naturalWidth, height: image.naturalHeight }, area, crop);
  const scale = Math.min(1, 4096 / Math.max(source.sw, source.sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.sw * scale));
  canvas.height = Math.max(1, Math.round(source.sh * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not prepare this photo. Please try another browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, source.sx, source.sy, source.sw, source.sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('Could not save your photo. Please try again.')),
    'image/jpeg', 0.95,
  ));
}