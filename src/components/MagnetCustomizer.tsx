import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, Plus, Minus, Pencil, Trash2, Check, Loader2, Eye, RotateCw,
  Sun, Contrast, Droplet, ZoomIn, Sparkles, Truck,
} from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/currency';
import { filterString, exportEdited, renderRotated, type CropRect } from '@/lib/imageEdit';
import type { Product } from '@/types';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const MAGNET_SQUARE_IMG = 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRu2JI9yvGIezwh4Hyw06C_k17lpuQfAi21HvnfaHhV2b_s_S-cFqg68_Vr79Ae5PknRgB8evlHVb5Tgw1XGZmcImBxgdaG1g';
export const MAGNET_RECT_IMG = 'https://m.media-amazon.com/images/I/41zYzknLVWL.jpg';

type MagnetShape = 'square' | 'rectangle';

interface MagnetShapeInfo {
  id: MagnetShape;
  label: string;
  dimensions: string;
  image: string;
  ratio: number; // w/h
}

const SHAPES: MagnetShapeInfo[] = [
  { id: 'square', label: 'Square', dimensions: '3 × 3 inch', image: MAGNET_SQUARE_IMG, ratio: 1 },
  { id: 'rectangle', label: 'Rectangle', dimensions: '3.5 × 2.5 inch', image: MAGNET_RECT_IMG, ratio: 3.5 / 2.5 },
];

interface MagnetData {
  id: string;
  shape: MagnetShape;
  imageUrl: string | null;
  blob: Blob | null;
  brightness: number;
  contrast: number;
  saturation: number;
  highlights: number;
  shadows: number;
  rotation: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  quantity: number;
}

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newMagnet(shape: MagnetShape = 'square'): MagnetData {
  return {
    id: makeId(),
    shape,
    imageUrl: null,
    blob: null,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    highlights: 1,
    shadows: 1,
    rotation: 0,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    quantity: 1,
  };
}

function shapeClipCss(shape: MagnetShape): React.CSSProperties {
  if (shape === 'square') return { borderRadius: '0.5rem' };
  return { borderRadius: '0.5rem' };
}

// Tiered pricing based on total magnet quantity.
function tierPrice(totalQty: number): number {
  if (totalQty >= 10) return 119;
  if (totalQty >= 5) return 129;
  if (totalQty >= 2) return 149;
  return 169;
}

// --- Inline editor for a single magnet (drag to move, zoom, rotate, adjust) ---
function MagnetEditor({
  magnet,
  onSave,
  onCancel,
}: {
  magnet: MagnetData;
  onSave: (updates: Partial<MagnetData>, editedBlob: Blob | null) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [base, setBase] = useState<{ url: string; width: number; height: number } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const shapeInfo = SHAPES.find((s) => s.id === magnet.shape)!;
  const BOX = 300;
  const fw = shapeInfo.ratio >= 1 ? BOX : BOX * shapeInfo.ratio;
  const fh = shapeInfo.ratio >= 1 ? BOX / shapeInfo.ratio : BOX;

  // Load the rotated base image for crop/zoom math.
  useEffect(() => {
    if (!magnet.imageUrl) { setBase(null); return; }
    let cancelled = false;
    setBase(null);
    const url = magnet.blob ? URL.createObjectURL(magnet.blob) : magnet.imageUrl;
    renderRotated(url, magnet.rotation)
      .then((b) => { if (!cancelled) setBase(b); })
      .catch(() => {});
    return () => { cancelled = true; if (magnet.blob) URL.revokeObjectURL(url); };
  }, [magnet.imageUrl, magnet.blob, magnet.rotation]);

  const iw = base?.width ?? 1;
  const ih = base?.height ?? 1;
  const baseScale = Math.max(fw / iw, fh / ih);
  const scale = baseScale * magnet.zoom;
  const dispW = iw * scale;
  const dispH = ih * scale;
  const left = (fw - dispW) / 2 + magnet.offsetX;
  const top = (fh - dispH) / 2 + magnet.offsetY;

  function clamp(o: { x: number; y: number }, s: number) {
    const maxX = Math.max(0, (iw * s - fw) / 2);
    const maxY = Math.max(0, (ih * s - fh) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }

  useEffect(() => {
    // Re-clamp offset when zoom changes.
    if (!base) return;
    setDrag(null);
  }, [magnet.zoom, base]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY, ox: magnet.offsetX, oy: magnet.offsetY });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const nx = drag.ox + (e.clientX - drag.x);
    const ny = drag.oy + (e.clientY - drag.y);
    onSave({ offsetX: clamp({ x: nx, y: ny }, scale).x, offsetY: clamp({ x: nx, y: ny }, scale).y }, null);
  }
  function onPointerUp() { setDrag(null); }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !user) return;
    const file = e.target.files[0];
    e.target.value = '';
    if (!file.type.startsWith('image/')) { setError('Please upload a JPG or PNG image.'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setError('Image is too large. Maximum 10MB.'); return; }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileRef = storageRef(storage, `customization-uploads/${fileName}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      onSave({ imageUrl: url, blob: file, brightness: 1, contrast: 1, saturation: 1, highlights: 1, shadows: 1, rotation: 0, zoom: 1, offsetX: 0, offsetY: 0 }, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDone() {
    let editedBlob: Blob | null = null;
    if (magnet.imageUrl && base) {
      try {
        const crop: CropRect | null = (() => {
          const sx = Math.max(0, Math.min(-left / scale, iw - 1));
          const sy = Math.max(0, Math.min(-top / scale, ih - 1));
          return { sx, sy, sw: Math.min(fw / scale, iw - sx), sh: Math.min(fh / scale, ih - sy) };
        })();
        const url = magnet.blob ? URL.createObjectURL(magnet.blob) : magnet.imageUrl;
        editedBlob = await exportEdited(url, {
          brightness: magnet.brightness,
          contrast: magnet.contrast,
          saturation: magnet.saturation,
          highlights: magnet.highlights,
          shadows: magnet.shadows,
          rotation: magnet.rotation,
          crop,
        });
        if (magnet.blob) URL.revokeObjectURL(url);
      } catch { /* keep original on failure */ }
    }
    onSave({}, editedBlob);
  }

  const cssFilter = filterString(magnet.brightness, magnet.contrast, magnet.saturation, magnet.highlights, magnet.shadows);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Edit Magnet — {shapeInfo.label} ({shapeInfo.dimensions})</h3>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-5">
          {/* Preview / drag area */}
          <div className="flex flex-col items-center">
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200 select-none"
              style={{ width: fw, height: fh, cursor: magnet.imageUrl ? 'grab' : 'default', touchAction: 'none' }}
              onPointerDown={magnet.imageUrl ? onPointerDown : undefined}
              onPointerMove={magnet.imageUrl ? onPointerMove : undefined}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {magnet.imageUrl && base ? (
                <img
                  src={base.url}
                  alt="Magnet preview"
                  draggable={false}
                  style={{ position: 'absolute', width: dispW, height: dispH, left, top, filter: cssFilter, maxWidth: 'none' }}
                />
              ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-500 font-medium">Click to upload photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading || !user} />
                </label>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {magnet.imageUrl ? 'Drag to reposition · use zoom & sliders below' : 'Upload a photo to start editing'}
            </p>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {!user && <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Please sign in to upload photos.</p>}

            {magnet.imageUrl && (
              <>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5" /> Zoom</span>
                    <span>{magnet.zoom.toFixed(1)}x</span>
                  </div>
                  <input type="range" min={1} max={3} step={0.01} value={magnet.zoom}
                    onChange={(e) => onSave({ zoom: Number(e.target.value) }, null)}
                    className="w-full accent-teal-600" />
                </div>

                {([
                  ['Brightness', magnet.brightness, 'brightness', 0.5, 1.5, Sun],
                  ['Contrast', magnet.contrast, 'contrast', 0.5, 1.5, Contrast],
                  ['Saturation', magnet.saturation, 'saturation', 0, 2, Droplet],
                  ['Highlights', magnet.highlights, 'highlights', 0.5, 1.5, Sparkles],
                  ['Shadows', magnet.shadows, 'shadows', 0.5, 1.5, Droplet],
                ] as const).map(([label, val, key, min, max, Icon]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1"><Icon className="w-3.5 h-3.5" /> {label}</span>
                      <span>{Math.round(val * 100)}%</span>
                    </div>
                    <input type="range" min={min} max={max} step={0.01} value={val}
                      onChange={(e) => onSave({ [key]: Number(e.target.value) } as Partial<MagnetData>, null)}
                      className="w-full accent-teal-600" />
                  </div>
                ))}

                <button
                  onClick={() => onSave({ rotation: (magnet.rotation + 90) % 360, offsetX: 0, offsetY: 0 }, null)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
                >
                  <RotateCw className="w-4 h-4" /> Rotate 90°
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100">
          <button
            onClick={() => onSave({ brightness: 1, contrast: 1, saturation: 1, highlights: 1, shadows: 1, rotation: 0, zoom: 1, offsetX: 0, offsetY: 0 }, null)}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Reset
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">Cancel</button>
            <button
              onClick={handleDone}
              disabled={!magnet.imageUrl}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Save & Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 3D-style magnet preview (CSS perspective + layered shadows) ---
function Magnet3DPreview({ magnet, size = 200 }: { magnet: MagnetData; size?: number }) {
  const shapeInfo = SHAPES.find((s) => s.id === magnet.shape)!;
  const w = shapeInfo.ratio >= 1 ? size : size * shapeInfo.ratio;
  const h = shapeInfo.ratio >= 1 ? size / shapeInfo.ratio : size;
  const cssFilter = filterString(magnet.brightness, magnet.contrast, magnet.saturation, magnet.highlights, magnet.shadows);

  return (
    <div className="flex items-center justify-center" style={{ perspective: '600px' }}>
      <motion.div
        initial={{ rotateY: -12, rotateX: 6 }}
        animate={{ rotateY: -12, rotateX: 6 }}
        transition={{ type: 'spring', stiffness: 100, damping: 18 }}
        className="relative"
        style={{ width: w, height: h, transformStyle: 'preserve-3d' }}
      >
        {/* Thickness layer */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)',
            transform: 'translateZ(-6px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        />
        {/* Acrylic top layer */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.08) 100%)',
            transform: 'translateZ(0px)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          {magnet.imageUrl ? (
            <img src={magnet.imageUrl} alt="Magnet" className="w-full h-full object-cover" style={{ filter: cssFilter }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <span className="text-xs text-slate-400">No photo</span>
            </div>
          )}
          {/* Glossy reflection */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.1) 100%)' }}
          />
        </div>
        {/* Edge highlight */}
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4), inset 0 0 0 2px rgba(0,0,0,0.05)' }}
        />
      </motion.div>
    </div>
  );
}

// --- Main MagnetCustomizer ---
export default function MagnetCustomizer({
  product,
  onAddToCart,
  onActiveShapeChange,
}: {
  product: Product;
  onAddToCart: (customization: Record<string, unknown>, totalQty: number, unitPrice: number) => void;
  onActiveShapeChange?: (shape: MagnetShape) => void;
}) {
  const { user } = useAuth();
  const [magnets, setMagnets] = useState<MagnetData[]>([newMagnet('square')]);
  const [showShapeModal, setShowShapeModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [added, setAdded] = useState(false);

  const activeShape = magnets[0]?.shape ?? 'square';

  useEffect(() => {
    if (onActiveShapeChange) onActiveShapeChange(activeShape);
  }, [onActiveShapeChange, activeShape]);

  const totalQty = magnets.reduce((sum, m) => sum + m.quantity, 0);
  const perPiece = tierPrice(totalQty);
  const totalPrice = perPiece * totalQty;
  const allHavePhotos = magnets.every((m) => m.imageUrl);

  const updateMagnet = useCallback((index: number, updates: Partial<MagnetData>, editedBlob: Blob | null) => {
    setMagnets((prev) => prev.map((m, i) => {
      if (i !== index) return m;
      const next = { ...m, ...updates };
      if (editedBlob) {
        next.blob = editedBlob;
        next.imageUrl = URL.createObjectURL(editedBlob);
      }
      return next;
    }));
  }, []);

  const handleEditorSave = (index: number, updates: Partial<MagnetData>, editedBlob: Blob | null) => {
    updateMagnet(index, updates, editedBlob);
    if (editedBlob || Object.keys(updates).length > 0) {
      // If editor called "Save & Preview", close editor
      if (editedBlob !== null || Object.keys(updates).length === 0) {
        setEditingIndex(null);
      }
    }
  };

  function addMagnet(shape: MagnetShape) {
    setMagnets((prev) => [...prev, newMagnet(shape)]);
    setShowShapeModal(false);
    setEditingIndex(magnets.length);
    if (magnets.length === 0 && onActiveShapeChange) onActiveShapeChange(shape);
  }

  function removeMagnet(index: number) {
    setMagnets((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (index === 0 && next.length > 0 && onActiveShapeChange) onActiveShapeChange(next[0].shape);
      return next;
    });
  }

  function changeQty(index: number, delta: number) {
    setMagnets((prev) => prev.map((m, i) => i === index ? { ...m, quantity: Math.max(1, m.quantity + delta) } : m));
  }

  function changeShape(index: number, shape: MagnetShape) {
    setMagnets((prev) => prev.map((m, i) => i === index ? { ...m, shape } : m));
    if (index === 0 && onActiveShapeChange) onActiveShapeChange(shape);
  }

  function handleAddToCart() {
    if (!allHavePhotos) return;
    onAddToCart(
      {
        customization_type: 'magnet',
        magnet_shape: null,
        images: magnets.map((m) => m.imageUrl!),
        unit_price: perPiece,
        magnets: magnets.map((m) => ({
          shape: m.shape,
          quantity: m.quantity,
          image: m.imageUrl,
        })),
      },
      totalQty,
      perPiece,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Shape selection modal */}
      <AnimatePresence>
        {showShapeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowShapeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Select Shape</h3>
                <button onClick={() => setShowShapeModal(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => addMagnet(s.id)}
                    className="group rounded-xl border-2 border-slate-200 hover:border-teal-500 overflow-hidden transition-all text-left"
                  >
                    <div className="aspect-square bg-slate-50 overflow-hidden">
                      <img src={s.image} alt={s.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-slate-900">{s.label}</p>
                      <p className="text-sm text-slate-500">{s.dimensions}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Magnet editor modal */}
      {editingIndex !== null && magnets[editingIndex] && (
        <MagnetEditor
          magnet={magnets[editingIndex]}
          onSave={(updates, blob) => handleEditorSave(editingIndex, updates, blob)}
          onCancel={() => setEditingIndex(null)}
        />
      )}

      {/* Full preview modal */}
      <AnimatePresence>
        {showFullPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowFullPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">3D Preview</h3>
                <button onClick={() => setShowFullPreview(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-200">
                <div className="flex flex-wrap gap-8 justify-center">
                  {magnets.map((m, i) => (
                    <div key={m.id} className="text-center">
                      <Magnet3DPreview magnet={m} size={180} />
                      <p className="mt-3 text-sm font-medium text-slate-600">
                        Magnet {i + 1} — {SHAPES.find((s) => s.id === m.shape)!.label}
                      </p>
                      <p className="text-xs text-slate-400">Qty: {m.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 px-5 py-3 border-t border-slate-100">
                <button onClick={() => setShowFullPreview(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">Edit Design</button>
                <button
                  onClick={() => { setShowFullPreview(false); handleAddToCart(); }}
                  disabled={!allHavePhotos}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Add to Cart
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Magnet cards */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-1">Customize Your Magnets</h3>
        <p className="text-sm text-slate-500 mb-4">Choose a shape, upload a photo, and edit each magnet individually.</p>

        <div className="space-y-4">
          {magnets.map((magnet, idx) => {
            const shapeInfo = SHAPES.find((s) => s.id === magnet.shape)!;
            return (
              <div key={magnet.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-4 p-4">
                  {/* Preview / shape image */}
                  <div className="flex-shrink-0 mx-auto sm:mx-0">
                    <div
                      className="relative overflow-hidden bg-slate-100 border border-slate-200"
                      style={{ width: 100, height: 100 / shapeInfo.ratio, ...shapeClipCss(magnet.shape) }}
                    >
                      {magnet.imageUrl ? (
                        <img src={magnet.imageUrl} alt={`Magnet ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <img src={shapeInfo.image} alt={shapeInfo.label} className="w-full h-full object-cover opacity-60" />
                      )}
                    </div>
                  </div>

                  {/* Info & controls */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">Magnet {idx + 1}</span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{shapeInfo.label}</span>
                      <span className="text-xs text-slate-500">{shapeInfo.dimensions}</span>
                    </div>

                    {/* Shape selector for this magnet */}
                    <div className="mt-2 flex gap-2">
                      {SHAPES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => changeShape(idx, s.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            magnet.shape === s.id
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setEditingIndex(idx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all"
                      >
                        {magnet.imageUrl ? <Pencil className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                        {magnet.imageUrl ? 'Edit' : 'Upload & Edit'}
                      </button>

                      {/* Quantity */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button onClick={() => changeQty(idx, -1)} className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
                          <Minus className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-slate-900">{magnet.quantity}</span>
                        <button onClick={() => changeQty(idx, 1)} className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                      </div>

                      {magnets.length > 1 && (
                        <button
                          onClick={() => removeMagnet(idx)}
                          className="w-7 h-7 rounded-lg border border-red-200 hover:bg-red-50 flex items-center justify-center text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add another magnet */}
        <button
          onClick={() => setShowShapeModal(true)}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/30 text-slate-600 hover:text-teal-600 font-medium text-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Another Photo
        </button>
      </div>

      {/* Pricing summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Total Magnets</span>
          <span className="font-semibold text-slate-900">{totalQty}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Per-piece Price</span>
          <span className="font-semibold text-slate-900">{formatINR(perPiece)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Total Price</span>
          <span className="text-xl font-bold text-teal-600">{formatINR(totalPrice)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Truck className="w-4 h-4" />
          <span className="font-medium">Free Shipping Included</span>
        </div>

        {/* Tier hints */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <span className={`text-xs px-2 py-1 rounded-full ${totalQty >= 10 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>10+ → {formatINR(119)} each</span>
          <span className={`text-xs px-2 py-1 rounded-full ${totalQty >= 5 && totalQty < 10 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>5+ → {formatINR(129)} each</span>
          <span className={`text-xs px-2 py-1 rounded-full ${totalQty >= 2 && totalQty < 5 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>2+ → {formatINR(149)} each</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowFullPreview(true)}
          disabled={!allHavePhotos}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="w-5 h-5" /> Save & Preview
        </button>
        <button
          onClick={handleAddToCart}
          disabled={added || !allHavePhotos}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {added ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {added ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>

      {!allHavePhotos && (
        <p className="text-sm text-amber-600">
          Please upload a photo for each magnet ({magnets.filter((m) => m.imageUrl).length}/{magnets.length} done).
        </p>
      )}
    </div>
  );
}
