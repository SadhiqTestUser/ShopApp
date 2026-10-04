// Shared, resolution-independent painter for a mug design's background and
// vector decorations. Used by BOTH the flat preview (MugWrap) and the 3D
// texture (mugTexture) so the two always match exactly. Everything is drawn in
// device pixels: callers pass the real canvas width/height (W, H).
import type { Decoration, MugDesign } from '@/lib/mugs';

// Deterministic PRNG so scattered shapes keep a stable layout across redraws.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.35);
  ctx.bezierCurveTo(cx + s, cy - s * 0.35, cx + s * 0.5, cy - s, cx, cy - s * 0.4);
  ctx.bezierCurveTo(cx - s * 0.5, cy - s, cx - s, cy - s * 0.35, cx, cy + s * 0.35);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / points) * i - Math.PI / 2;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
}

// Split top-level comma groups of a CSS gradient's inner content.
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function paintBackground(ctx: CanvasRenderingContext2D, bg: string, W: number, H: number) {
  if (bg.startsWith('linear-gradient')) {
    const parts = splitTop(bg.slice(bg.indexOf('(') + 1, bg.lastIndexOf(')')));
    let angle = 180;
    if (/deg$/.test(parts[0])) angle = parseFloat(parts.shift() as string);
    const rad = (angle * Math.PI) / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const len = Math.abs(W * dx) + Math.abs(H * dy);
    const g = ctx.createLinearGradient(W / 2 - (dx * len) / 2, H / 2 - (dy * len) / 2, W / 2 + (dx * len) / 2, H / 2 + (dy * len) / 2);
    parts.forEach((c, i) => g.addColorStop(parts.length === 1 ? 0 : i / (parts.length - 1), c.split(/\s+/)[0]));
    ctx.fillStyle = g;
  } else if (bg.startsWith('radial-gradient')) {
    const parts = splitTop(bg.slice(bg.indexOf('(') + 1, bg.lastIndexOf(')')))
      .filter((p) => /^(#|rgb|hsl)/.test(p));
    const g = ctx.createRadialGradient(W * 0.36, H * 0.3, Math.min(W, H) * 0.05, W * 0.4, H * 0.4, Math.max(W, H) * 0.8);
    parts.forEach((c, i) => g.addColorStop(i / Math.max(1, parts.length - 1), c.split(/\s+/)[0]));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = bg || '#ffffff';
  }
  ctx.fillRect(0, 0, W, H);
}

// Complex / scattered decorations (kept separate to keep drawDecoration small).
function drawScatterDecoration(ctx: CanvasRenderingContext2D, d: Decoration, W: number, H: number, i: number, min: number) {
  switch (d.kind) {
    case 'confetti': {
      const rnd = mulberry32((d.seed ?? 7) * 131 + i);
      ctx.globalAlpha = d.opacity ?? 1;
      for (let n = 0; n < d.count; n++) {
        ctx.save();
        ctx.translate(rnd() * W, rnd() * H);
        ctx.rotate(rnd() * Math.PI);
        ctx.fillStyle = d.colors[Math.floor(rnd() * d.colors.length)];
        const s = min * (0.012 + rnd() * 0.02);
        if (rnd() > 0.5) ctx.fillRect(-s / 2, -s * 0.9, s, s * 1.8);
        else { ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      break;
    }
    case 'hearts':
    case 'stars': {
      const rnd = mulberry32((d.seed ?? 3) * 197 + i);
      const [lo, hi] = d.sizeRange ?? [0.02, 0.05];
      ctx.fillStyle = d.color;
      ctx.globalAlpha = d.opacity ?? 1;
      for (let n = 0; n < d.count; n++) {
        const s = min * (lo + rnd() * (hi - lo));
        const cx = rnd() * W, cy = rnd() * H;
        if (d.kind === 'hearts') heart(ctx, cx, cy, s); else star(ctx, cx, cy, s);
        ctx.fill();
      }
      break;
    }
    case 'waves': {
      const bands = d.colors.length;
      for (let b = 0; b < bands; b++) {
        const amp = (d.height / 100) * H * (0.5 + b * 0.25);
        const base = d.edge === 'bottom' ? H - amp * 0.4 : amp * 0.4;
        ctx.fillStyle = d.colors[b];
        ctx.beginPath();
        ctx.moveTo(0, d.edge === 'bottom' ? H : 0);
        for (let x = 0; x <= W; x += W / 48) {
          const y = base + Math.sin((x / W) * Math.PI * 3 + b) * amp * 0.4 * (d.edge === 'bottom' ? -1 : 1);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, d.edge === 'bottom' ? H : 0);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'ribbon': {
      const y = (d.y / 100) * H, h = (d.height / 100) * H, notch = h * 0.5;
      if (d.shadow) { ctx.fillStyle = d.shadow; ctx.fillRect(0, y + h * 0.9, W, h * 0.18); }
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.lineTo(W - notch, y + h / 2); ctx.lineTo(W, y + h);
      ctx.lineTo(0, y + h); ctx.lineTo(notch, y + h / 2); ctx.closePath(); ctx.fill();
      break;
    }
    case 'sunburst': {
      const rays = d.rays ?? 24, cx = (d.cx / 100) * W, cy = (d.cy / 100) * H, R = Math.hypot(W, H);
      ctx.globalAlpha = d.opacity ?? 0.5;
      ctx.fillStyle = d.color;
      for (let r = 0; r < rays; r++) {
        const a = (Math.PI * 2 * r) / rays, w = (Math.PI * 2) / rays / 2;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'floral': {
      const corners = d.corners ?? ['tl', 'tr', 'bl', 'br'];
      const s = ((d.size ?? 26) / 100) * min;
      ctx.fillStyle = d.color;
      ctx.globalAlpha = d.opacity ?? 1;
      for (const c of corners) {
        const ox = c === 'tr' || c === 'br' ? W : 0;
        const oy = c === 'bl' || c === 'br' ? H : 0;
        const sx = c === 'tr' || c === 'br' ? -1 : 1;
        const sy = c === 'bl' || c === 'br' ? -1 : 1;
        ctx.save(); ctx.translate(ox, oy); ctx.scale(sx, sy);
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 0.5;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.24, s * 0.1, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      break;
    }
    case 'panel': {
      const x = (d.x / 100) * W, y = (d.y / 100) * H, w = (d.w / 100) * W, h = (d.h / 100) * H;
      if (d.shadow) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = min * 0.03; ctx.shadowOffsetY = min * 0.012; }
      ctx.fillStyle = d.color;
      roundRectPath(ctx, x, y, w, h, ((d.radius ?? 3) / 100) * min);
      ctx.fill();
      if (d.shadow) ctx.restore();
      if (d.stroke) { ctx.strokeStyle = d.stroke; ctx.lineWidth = min * 0.006; ctx.stroke(); }
      break;
    }
  }
}

function drawDecoration(ctx: CanvasRenderingContext2D, d: Decoration, W: number, H: number, i: number) {
  const min = Math.min(W, H);
  ctx.save();
  switch (d.kind) {
    case 'band': {
      ctx.fillStyle = d.color;
      const h = (d.size / 100) * H;
      if (d.edge === 'top' || d.edge === 'both') ctx.fillRect(0, 0, W, h);
      if (d.edge === 'bottom' || d.edge === 'both') ctx.fillRect(0, H - h, W, h);
      break;
    }
    case 'border': {
      const ins = (d.inset / 100) * min;
      ctx.strokeStyle = d.color;
      ctx.lineWidth = (d.width / 100) * min;
      roundRectPath(ctx, ins, ins, W - ins * 2, H - ins * 2, ((d.radius ?? 2) / 100) * min);
      ctx.stroke();
      break;
    }
    case 'dots': {
      ctx.fillStyle = d.color;
      ctx.globalAlpha = d.opacity ?? 1;
      const gap = (d.gap / 100) * W, r = (d.size / 100) * W;
      for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'stripes': {
      ctx.globalAlpha = d.opacity ?? 1;
      const w = (d.width / 100) * W, ang = ((d.angle ?? 45) * Math.PI) / 180;
      ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(-W, -H);
      for (let x = 0, k = 0; x < W * 2; x += w, k++) { ctx.fillStyle = d.colors[k % d.colors.length]; ctx.fillRect(x, 0, w, H * 2); }
      break;
    }
    case 'checker': {
      ctx.globalAlpha = d.opacity ?? 1;
      const c = (d.size / 100) * W;
      for (let y = 0, ry = 0; y < H; y += c, ry++) for (let x = 0, rx = 0; x < W; x += c, rx++) {
        ctx.fillStyle = d.colors[(rx + ry) % 2]; ctx.fillRect(x, y, c, c);
      }
      break;
    }
    default:
      drawScatterDecoration(ctx, d, W, H, i, min);
  }
  ctx.restore();
}

// Paint the full design artwork (background + decorations) into the canvas ctx.
export function paintDesign(ctx: CanvasRenderingContext2D, design: MugDesign, W: number, H: number) {
  paintBackground(ctx, design.background, W, H);
  (design.decorations ?? []).forEach((d, i) => drawDecoration(ctx, d, W, H, i));
}

export { mulberry32, heart, star };
