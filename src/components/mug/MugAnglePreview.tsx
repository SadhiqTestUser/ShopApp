import { useEffect, useRef } from 'react';
import type { MugType } from '@/lib/mugs';
import type { MugConfig } from './mugState';
import type { MugArtwork } from './useMugArtwork';
import { projectedWrapU, PRINT_HEIGHT, type MugAngle } from './mugProjection';

// Lightweight, WebGL-independent mockup, drawn from the SAME artwork as 3D.
export default function MugAnglePreview({ artwork, angle, config, mugType }: {
  artwork: MugArtwork; angle: MugAngle; config: MugConfig; mugType: MugType;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const color = mugType.baseColor;
  const love = config.handleStyle === 'love' && mugType.handles.includes('love');

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = 640;
    canvas.height = 600;
    ctx.scale(2, 2);
    const cx = 160, rx = 83, top = 57, bottom = 238, curve = 13;
    ctx.clearRect(0, 0, 320, 300);

    // Soft grounding shadow, rather than a heavy drop shadow around artwork.
    const shadow = ctx.createRadialGradient(cx, 255, 5, cx, 255, 110);
    shadow.addColorStop(0, 'rgba(15,23,42,0.20)');
    shadow.addColorStop(1, 'rgba(15,23,42,0)');
    ctx.save(); ctx.translate(0, 191); ctx.scale(1, 0.25);
    ctx.fillStyle = shadow; ctx.fillRect(30, 140, 260, 220); ctx.restore();

    if (angle !== 'front') {
      ctx.save();
      ctx.translate(cx, 0);
      ctx.scale(angle === 'left' ? -1 : 1, 1);
      ctx.lineCap = 'round';
      const handle = new Path2D();
      if (love) {
        handle.moveTo(77, 103);
        handle.bezierCurveTo(94, 105, 100, 81, 116, 87);
        handle.bezierCurveTo(160, 98, 138, 140, 124, 158);
        handle.bezierCurveTo(107, 184, 90, 200, 77, 199);
      } else {
        handle.moveTo(77, 98);
        handle.bezierCurveTo(101, 98, 118, 93, 132, 111);
        handle.bezierCurveTo(149, 132, 149, 171, 130, 187);
        handle.bezierCurveTo(113, 204, 94, 203, 77, 201);
      }
      ctx.strokeStyle = '#b6bec5'; ctx.lineWidth = 23; ctx.stroke(handle);
      ctx.strokeStyle = color; ctx.lineWidth = 20; ctx.stroke(handle);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 6; ctx.stroke(handle);
      ctx.restore();
    }

    const body = new Path2D();
    body.moveTo(cx - rx, top);
    body.bezierCurveTo(cx - rx, top + 8, cx + rx, top + 8, cx + rx, top);
    body.lineTo(cx + rx - 3, bottom);
    body.bezierCurveTo(cx + rx - 3, bottom + 19, cx - rx + 3, bottom + 19, cx - rx + 3, bottom);
    body.closePath();
    ctx.fillStyle = color; ctx.fill(body);
    ctx.save(); ctx.clip(body);
    if (artwork.canvas.width && artwork.canvas.height) {
      const printH = (bottom - top) * PRINT_HEIGHT;
      for (let x = 0; x < rx * 2; x += 0.5) {
        const normalized = (x - rx) / rx;
        const u = projectedWrapU(normalized, angle);
        if (u === null) continue;
        const bow = Math.sqrt(Math.max(0, 1 - normalized * normalized)) * curve;
        const sx = Math.min(artwork.canvas.width - 1, u * artwork.canvas.width);
        ctx.drawImage(artwork.canvas, sx, 0, 1, artwork.canvas.height,
          cx - rx + x, top + 6 + bow, 0.85, printH);
      }
    }
    const glaze = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    glaze.addColorStop(0, 'rgba(15,23,42,0.27)');
    glaze.addColorStop(0.18, 'rgba(255,255,255,0.12)');
    glaze.addColorStop(0.36, mugType.material === 'matte' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.20)');
    glaze.addColorStop(0.66, 'rgba(255,255,255,0)');
    glaze.addColorStop(1, 'rgba(15,23,42,0.30)');
    ctx.fillStyle = glaze; ctx.fillRect(cx - rx, top, rx * 2, bottom - top + 25);
    ctx.restore();
    ctx.strokeStyle = 'rgba(100,116,139,0.20)'; ctx.lineWidth = 0.7; ctx.stroke(body);

    ctx.beginPath(); ctx.ellipse(cx, top, rx, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill(); ctx.stroke();
    const inside = ctx.createLinearGradient(0, top - 8, 0, top + 10);
    inside.addColorStop(0, '#94a3b8'); inside.addColorStop(1, '#f8fafc');
    ctx.beginPath(); ctx.ellipse(cx, top, rx - 7, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = inside; ctx.fill();
  }, [artwork.canvas, artwork.revision, angle, color, love, mugType.material]);

  return <canvas ref={ref} role="img" aria-label={`${angle} view of your personalized mug`} className="block w-full h-auto" style={{ aspectRatio: '640 / 600' }} />;
}