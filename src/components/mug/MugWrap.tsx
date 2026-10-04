import { useEffect, useRef } from 'react';
import { MUG_WRAP_RATIO, type MugDesign } from '@/lib/mugs';
import { type MugConfig, type PhotoState } from './mugState';
import { useMugArtwork, type MugArtwork } from './useMugArtwork';

interface MugWrapProps {
  design: MugDesign;
  config: MugConfig;
  width: number;
  editable?: boolean;
  activeSlotId?: string | null;
  onSelectSlot?: (id: string) => void;
  onPhotoChange?: (id: string, partial: Partial<PhotoState>) => void;
  className?: string;
  artwork?: MugArtwork;
}

// Gallery thumbnails own an artwork canvas; the studio shares a single canvas.
export default function MugWrap(props: MugWrapProps) {
  return props.artwork ? <WrapSurface {...props} artwork={props.artwork} /> : <StandaloneWrap {...props} />;
}

function StandaloneWrap(props: MugWrapProps) {
  const artwork = useMugArtwork(props.design, props.config, 600);
  return <WrapSurface {...props} artwork={artwork} />;
}

function WrapSurface({
  design, config, width, editable = false, activeSlotId, onSelectSlot, onPhotoChange, className, artwork,
}: MugWrapProps & { artwork: MugArtwork }) {
  const drag = useRef<{ id: string; x: number; y: number; ox: number; oy: number; w: number; h: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = artwork.canvas.width;
    canvas.height = artwork.canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(artwork.canvas, 0, 0);
  }, [artwork.canvas, artwork.revision]);

  function onPointerDown(e: React.PointerEvent, slotId: string, p: PhotoState) {
    if (!editable || !p?.url) return;
    onSelectSlot?.(slotId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: slotId, x: e.clientX, y: e.clientY, ox: p.offsetX, oy: p.offsetY, w: rect.width, h: rect.height };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = ((e.clientX - d.x) / d.w) * 100;
    const dy = ((e.clientY - d.y) / d.h) * 100;
    onPhotoChange?.(d.id, {
      offsetX: Math.max(-100, Math.min(100, d.ox + dx)),
      offsetY: Math.max(-100, Math.min(100, d.oy + dy)),
    });
  }
  function onPointerUp() { drag.current = null; }

  return (
    <div
      className={className}
      style={{
        position: 'relative', width: '100%', maxWidth: width, aspectRatio: String(MUG_WRAP_RATIO), background: design.background,
        overflow: 'hidden', borderRadius: 6,
      }}
    >
      <canvas ref={canvasRef} role="img" aria-label={`${design.name}, full wrap artwork`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {editable && design.slots.map((slot, index) => (
        <button
          type="button" key={slot.id} aria-label={`Edit ${slot.type} area ${index + 1}`}
          aria-pressed={activeSlotId === slot.id}
          onPointerDown={(e) => slot.type === 'photo' && onPointerDown(e, slot.id, config.photos[slot.id])}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onLostPointerCapture={onPointerUp} onClick={() => onSelectSlot?.(slot.id)}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
          style={{
            position: 'absolute', left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%`,
            border: activeSlotId === slot.id ? '2px solid #0d9488' : '1px dashed rgba(100,116,139,0.4)',
            borderRadius: 4, cursor: slot.type === 'photo' ? 'grab' : 'pointer', touchAction: 'none',
          }}
        />
      ))}
    </div>
  );
}
