import { MUG_PRINT_MM, type DesignSlot, type MugDesign } from '@/lib/mugs';
import { initConfig, type MugConfig, type PhotoState } from './mugState';

export function validateMugPhoto(file: { type: string; size: number }): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Please choose a JPG, PNG or WebP image.';
  if (!file.size || file.size > 12 * 1024 * 1024) return 'Choose a non-empty image smaller than 12 MB.';
  return null;
}

export function photoPlacement(imageW: number, imageH: number, slotW: number, slotH: number, photo: PhotoState) {
  const scale = Math.max(slotW / imageW, slotH / imageH) * Math.max(1, photo.zoom);
  const width = imageW * scale, height = imageH * scale;
  const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
  return {
    width, height,
    x: (slotW - width) / 2 + clamp(photo.offsetX / 100 * slotW, (width - slotW) / 2),
    y: (slotH - height) / 2 + clamp(photo.offsetY / 100 * slotH, (height - slotH) / 2),
  };
}

export function photoDpi(photo: PhotoState, slot: DesignSlot): number | null {
  if (!photo.width || !photo.height) return null;
  const widthInches = slot.w / 100 * MUG_PRINT_MM.width / 25.4;
  const heightInches = slot.h / 100 * MUG_PRINT_MM.height / 25.4;
  return Math.round(Math.min(photo.width / widthInches, photo.height / heightInches) / photo.zoom);
}

// Retain customer content by slot order when trying a different template.
// Reset crop for a changed aspect ratio; keep fonts/colours from the new design.
export function switchMugDesign(config: MugConfig, previous: MugDesign, next: MugDesign): MugConfig {
  const result = initConfig(next, config.mugTypeId, config.mugColor, config.handleStyle);
  result.quantity = config.quantity;
  const photos = previous.slots.filter((slot) => slot.type === 'photo').map((slot) => config.photos[slot.id]);
  const texts = previous.slots.filter((slot) => slot.type === 'text').map((slot) => config.texts[slot.id]);
  next.slots.filter((slot) => slot.type === 'photo').forEach((slot, index) => {
    const photo = photos[index];
    if (photo) result.photos[slot.id] = { ...photo, zoom: 1, offsetX: 0, offsetY: 0 };
  });
  next.slots.filter((slot) => slot.type === 'text').forEach((slot, index) => {
    if (texts[index]) result.texts[slot.id].text = texts[index].text;
  });
  return result;
}

export async function readMugPhoto(file: File): Promise<{ url: string; width: number; height: number }> {
  const error = validateMugPhoto(file);
  if (error) throw new Error(error);
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('This photo could not be read. Please try another image.'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = url;
  try { await image.decode(); }
  catch { throw new Error('This image is damaged or unsupported. Please choose another photo.'); }
  return { url, width: image.naturalWidth, height: image.naturalHeight };
}