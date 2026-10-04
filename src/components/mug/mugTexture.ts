// Draws the flat wrap design onto a 2D canvas so it can be used as a live
// texture on the WebGL mug. Mirrors MugWrap's layout: background (solid or
// linear-gradient), photo slots (cover/zoom/offset/filters) and text slots.
import { MUG_WRAP_RATIO, fontStack, type MugDesign } from '@/lib/mugs';
import { photoFilter, type MugConfig } from './mugState';
import { paintDesign } from './mugArtwork';
import { photoPlacement } from './mugEditing';

export const TEX_W = 2048;
export const TEX_H = Math.round(TEX_W / MUG_WRAP_RATIO);

export function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = url;
  });
}

// Preload every photo slot's image so drawing is synchronous.
export async function loadSlotImages(config: MugConfig): Promise<Record<string, HTMLImageElement>> {
  const out: Record<string, HTMLImageElement> = {};
  await Promise.all(
    Object.entries(config.photos).map(async ([id, p]) => {
      if (!p.url) return;
      try { out[id] = await loadImg(p.url); } catch { /* skip broken image */ }
    }),
  );
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

// Paint the whole wrap design into `canvas`. Called on every live edit.
export function drawMugWrap(
  canvas: HTMLCanvasElement,
  design: MugDesign,
  config: MugConfig,
  images: Record<string, HTMLImageElement>,
  resolution = TEX_W,
): void {
  canvas.width = resolution;
  canvas.height = Math.round(resolution / MUG_WRAP_RATIO);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  paintDesign(ctx, design, W, H);

  for (const slot of design.slots) {
    const px = (slot.x / 100) * W, py = (slot.y / 100) * H;
    const sw = (slot.w / 100) * W, sh = (slot.h / 100) * H;

    if (slot.type === 'photo') {
      const p = config.photos[slot.id];
      const img = images[slot.id];
      const rad = ((slot.radius ?? 6) / 100) * Math.min(sw, sh);
      ctx.save();
      roundRect(ctx, px, py, sw, sh, rad);
      ctx.clip();
      if (img && p?.url) {
        const placement = photoPlacement(img.width, img.height, sw, sh, p);
        ctx.filter = photoFilter(p);
        ctx.drawImage(img, px + placement.x, py + placement.y, placement.width, placement.height);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = 'rgba(148,163,184,0.25)';
        ctx.fillRect(px, py, sw, sh);
        ctx.fillStyle = '#64748b';
        ctx.font = `500 ${Math.min(sw * 0.12, sh * 0.12, W * 0.024)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Your photo', px + sw / 2, py + sh / 2);
      }
      ctx.restore();
      continue;
    }

    const t = config.texts[slot.id];
    if (!t?.text) continue;
    // Fit long captions inside the template, identically in all preview modes.
    let fontSize = (slot.h / 100) * H * (slot.fontScale ?? 0.6);
    let lines: string[] = [];
    for (let attempt = 0; attempt < 40; attempt++) {
      ctx.font = `700 ${fontSize}px ${fontStack(t.fontId)}`;
      lines = wrapText(ctx, t.text, sw * 0.96);
      if (lines.length * fontSize * 1.08 <= sh && lines.every((line) => ctx.measureText(line).width <= sw * 0.96)) break;
      fontSize *= 0.9;
    }
    ctx.fillStyle = t.color;
    ctx.textBaseline = 'middle';
    const align = slot.align ?? 'center';
    ctx.textAlign = align;
    const tx = align === 'left' ? px + sw * 0.02 : align === 'right' ? px + sw * 0.98 : px + sw / 2;
    const lineH = fontSize * 1.08;
    const startY = py + sh / 2 - ((lines.length - 1) * lineH) / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, sw, sh); ctx.clip();
    lines.forEach((ln, i) => ctx.fillText(ln, tx, startY + i * lineH));
    ctx.restore();
  }
}
