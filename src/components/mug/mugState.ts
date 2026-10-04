// Runtime editing state for a mug design: per-slot photo transforms/adjustments
// and per-slot text content. Kept separate so the editor, preview and cart can
// all share one serialisable shape (persisted to localStorage for "resume").

import type { MugDesign, DesignSlot } from '@/lib/mugs';
import { fontStack, MUG_DESIGNS, getMugType } from '@/lib/mugs';

export interface PhotoState {
  url: string | null;
  width?: number;
  height?: number;
  zoom: number;
  offsetX: number; // -100..100, % of slot
  offsetY: number;
  brightness: number;
  contrast: number;
  saturation: number;
  highlights: number;
  shadows: number;
}

export interface TextState {
  text: string;
  fontId: string;
  color: string;
}

export interface MugConfig {
  designId: string;
  mugTypeId: string;
  mugColor: string;
  handleStyle: string;
  quantity: number;
  photos: Record<string, PhotoState>;
  texts: Record<string, TextState>;
}

// Normalize legacy colours/unavailable types at draft and order boundaries.
// Keep mugColor in the persisted shape for compatibility with existing orders.
export function normalizeMugOptions(config: MugConfig): MugConfig {
  const type = getMugType(config.mugTypeId);
  return {
    ...config, mugTypeId: type.id, mugColor: type.baseColor,
    handleStyle: type.handles.find((handle) => handle === config.handleStyle) ?? type.handles[0],
  };
}

export function defaultPhotoState(): PhotoState {
  return {
    url: null, zoom: 1, offsetX: 0, offsetY: 0,
    brightness: 1, contrast: 1, saturation: 1, highlights: 1, shadows: 1,
  };
}

export function defaultTextState(slot: DesignSlot): TextState {
  return {
    text: slot.text ?? 'Your Text',
    fontId: slot.fontId ?? 'poppins',
    color: slot.color ?? '#111827',
  };
}

// Build a fresh config for a chosen design, seeding text slots with their
// template defaults and photo slots with empty transforms.
export function initConfig(
  design: MugDesign,
  mugTypeId: string,
  mugColor: string,
  handleStyle: string,
): MugConfig {
  const photos: Record<string, PhotoState> = {};
  const texts: Record<string, TextState> = {};
  for (const slot of design.slots) {
    if (slot.type === 'photo') photos[slot.id] = defaultPhotoState();
    else texts[slot.id] = defaultTextState(slot);
  }
  return normalizeMugOptions({ designId: design.id, mugTypeId, mugColor, handleStyle, quantity: 1, photos, texts });
}

export function slotFontStack(fontId: string): string {
  return fontStack(fontId);
}

// CSS filter for a photo's live adjustments (mirrors src/lib/imageEdit).
export function photoFilter(p: PhotoState): string {
  const hi = 1 + (p.highlights - 1) * 0.12;
  const sh = 1 + (p.shadows - 1) * 0.08;
  return `brightness(${p.brightness * hi * sh}) contrast(${p.contrast}) saturate(${p.saturation})`;
}

const STORAGE_KEY = 'printcraft_mug_design';

export function saveConfig(config: MugConfig): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeMugOptions(config)));
    return true;
  } catch {
    return false;
  }
}

// Old drafts used random slot IDs. Re-key them by insertion order on restore,
// while rejecting malformed/unknown drafts instead of crashing the editor.
export function restoreConfig(value: unknown): MugConfig | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as Partial<MugConfig>;
  const design = MUG_DESIGNS.find((item) => item.id === saved.designId);
  if (!design || !saved.photos || !saved.texts || typeof saved.photos !== 'object' || typeof saved.texts !== 'object') return null;
  const type = getMugType(saved.mugTypeId ?? 'regular');
  const result = initConfig(design, type.id, type.baseColor, type.handles.find((h) => h === saved.handleStyle) ?? type.handles[0]);
  result.quantity = typeof saved.quantity === 'number' && Number.isFinite(saved.quantity) ? Math.max(1, Math.floor(saved.quantity)) : 1;
  const oldPhotos = Object.values(saved.photos);
  const oldTexts = Object.values(saved.texts);
  design.slots.filter((slot) => slot.type === 'photo').forEach((slot, index) => {
    const photo = saved.photos?.[slot.id] ?? oldPhotos[index];
    if (!photo || typeof photo !== 'object') return;
    const next = result.photos[slot.id];
    next.url = typeof photo.url === 'string' ? photo.url : null;
    for (const key of ['zoom', 'offsetX', 'offsetY', 'brightness', 'contrast', 'saturation', 'highlights', 'shadows'] as const) {
      const value = photo[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        const [min, max] = key.startsWith('offset') ? [-100, 100] : key === 'zoom' ? [1, 3] : [0, 2];
        next[key] = Math.max(min, Math.min(max, value));
      }
    }
    if (typeof photo.width === 'number' && photo.width > 0) next.width = photo.width;
    if (typeof photo.height === 'number' && photo.height > 0) next.height = photo.height;
  });
  design.slots.filter((slot) => slot.type === 'text').forEach((slot, index) => {
    const text = saved.texts?.[slot.id] ?? oldTexts[index];
    if (!text || typeof text !== 'object') return;
    if (typeof text.text === 'string') result.texts[slot.id].text = text.text.slice(0, 40);
    if (typeof text.fontId === 'string') result.texts[slot.id].fontId = text.fontId;
    if (typeof text.color === 'string' && /^#[0-9a-f]{6}$/i.test(text.color)) result.texts[slot.id].color = text.color;
  });
  return result;
}

export function loadConfig(): MugConfig | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? restoreConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearConfig(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
