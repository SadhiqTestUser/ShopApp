import { useEffect, useRef, useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, RotateCw, Loader2, Check, Crop as CropIcon,
} from 'lucide-react';
import { renderRotated, exportEdited, filterString, type CropRect } from '@/lib/imageEdit';

export interface EditableImage {
  id: string;
  url: string;
  name: string;
  blob?: Blob;
}

interface PhotoEditorModalProps {
  images: EditableImage[];
  index: number;
  saving: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onSave: (index: number, blob: Blob) => Promise<void> | void;
}

const BOX = 320;
type Aspect = 'original' | '1' | '4:3' | '3:4';

export default function PhotoEditorModal({
  images, index, saving, onClose, onNavigate, onSave,
}: PhotoEditorModalProps) {
  const current = images[index];

  const [srcUrl, setSrcUrl] = useState('');
  const [base, setBase] = useState<{ url: string; width: number; height: number } | null>(null);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [highlights, setHighlights] = useState(1);
  const [shadows, setShadows] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<Aspect>('original');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Reset all edits when switching to a different photo.
  useEffect(() => {
    setBrightness(1); setContrast(1); setSaturation(1); setHighlights(1); setShadows(1); setRotation(0);
    setAspect('original'); setZoom(1); setOffset({ x: 0, y: 0 });
  }, [index]);

  // Build a same-origin object URL for the current photo (avoids canvas tainting).
  useEffect(() => {
    if (!current) return;
    if (current.blob) {
      const u = URL.createObjectURL(current.blob);
      setSrcUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setSrcUrl(current.url);
  }, [current]);

  // Render a rotated preview (filters are layered on top via CSS).
  useEffect(() => {
    if (!srcUrl) return;
    let cancelled = false;
    setBase(null);
    renderRotated(srcUrl, rotation)
      .then((b) => { if (!cancelled) setBase(b); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [srcUrl, rotation]);

  const iw = base?.width ?? 1;
  const ih = base?.height ?? 1;
  const isOriginal = aspect === 'original';
  const ratio = aspect === '1' ? 1 : aspect === '4:3' ? 4 / 3 : aspect === '3:4' ? 3 / 4 : iw / ih;
  const fw = ratio >= 1 ? BOX : BOX * ratio;
  const fh = ratio >= 1 ? BOX / ratio : BOX;
  const baseScale = isOriginal ? Math.min(fw / iw, fh / ih) : Math.max(fw / iw, fh / ih);
  const scale = baseScale * (isOriginal ? 1 : zoom);
  const dispW = iw * scale;
  const dispH = ih * scale;
  const left = (fw - dispW) / 2 + offset.x;
  const top = (fh - dispH) / 2 + offset.y;

  function clamp(o: { x: number; y: number }, s: number) {
    const maxX = Math.max(0, (iw * s - fw) / 2);
    const maxY = Math.max(0, (ih * s - fh) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }

  // Keep the image covering the frame when zoom/aspect changes.
  useEffect(() => {
    if (isOriginal) { setOffset({ x: 0, y: 0 }); return; }
    setOffset((o) => clamp(o, baseScale * zoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, aspect, base]);

  function onPointerDown(e: React.PointerEvent) {
    if (isOriginal) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.x);
    const ny = drag.current.oy + (e.clientY - drag.current.y);
    setOffset(clamp({ x: nx, y: ny }, scale));
  }
  function onPointerUp() { drag.current = null; }

  function computeCrop(): CropRect | null {
    if (isOriginal || !base) return null;
    const sx = Math.max(0, Math.min(-left / scale, iw - 1));
    const sy = Math.max(0, Math.min(-top / scale, ih - 1));
    return { sx, sy, sw: Math.min(fw / scale, iw - sx), sh: Math.min(fh / scale, ih - sy) };
  }

  function reset() {
    setBrightness(1); setContrast(1); setSaturation(1); setHighlights(1); setShadows(1); setRotation(0);
    setAspect('original'); setZoom(1); setOffset({ x: 0, y: 0 });
  }

  async function handleSave() {
    if (!srcUrl) return;
    const blob = await exportEdited(srcUrl, {
      brightness, contrast, saturation, highlights, shadows, rotation, crop: computeCrop(),
    });
    await onSave(index, blob);
  }

  if (!current) return null;

  const cssFilter = filterString(brightness, contrast, saturation, highlights, shadows);
  const aspects: { id: Aspect; label: string }[] = [
    { id: 'original', label: 'Original' },
    { id: '1', label: '1:1' },
    { id: '4:3', label: '4:3' },
    { id: '3:4', label: '3:4' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => onNavigate(index - 1)}
              disabled={index <= 0}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-medium text-slate-500">{index + 1} / {images.length}</span>
            <button
              onClick={() => onNavigate(index + 1)}
              disabled={index >= images.length - 1}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            <span className="ml-2 text-sm text-slate-700 font-semibold truncate">{current.name}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-5">
          {/* Preview / crop frame */}
          <div className="flex flex-col items-center">
            <div
              className="relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200 select-none"
              style={{ width: fw, height: fh, cursor: isOriginal ? 'default' : 'grab', touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {base ? (
                <img
                  src={base.url}
                  alt={current.name}
                  draggable={false}
                  style={{
                    position: 'absolute', width: dispW, height: dispH, left, top, filter: cssFilter,
                    maxWidth: 'none',
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {isOriginal ? 'Full photo — pick a crop ratio to zoom & reposition.' : 'Drag to reposition · use zoom below.'}
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-700 text-sm font-semibold">
                <CropIcon className="w-4 h-4" /> Crop
              </div>
              <div className="flex flex-wrap gap-2">
                {aspects.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAspect(a.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      aspect === a.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              {!isOriginal && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Zoom</span><span>{zoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range" min={1} max={3} step={0.01} value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              {([
                ['Brightness', brightness, setBrightness, 0.5, 1.5],
                ['Contrast', contrast, setContrast, 0.5, 1.5],
                ['Saturation', saturation, setSaturation, 0, 2],
                ['Highlights', highlights, setHighlights, 0.5, 1.5],
                ['Shadows', shadows, setShadows, 0.5, 1.5],
              ] as const).map(([label, val, set, min, max]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{label}</span><span>{Math.round(val * 100)}%</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={0.01} value={val}
                    onChange={(e) => set(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
            >
              <RotateCw className="w-4 h-4" /> Rotate 90°
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100">
          <button onClick={reset} className="text-sm font-medium text-slate-500 hover:text-slate-700">
            Reset
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !base}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
