import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ShoppingCart, Loader2, Check, Upload, X, ImageIcon, Pencil,
  RotateCw, Sun, Contrast, Droplet, ZoomIn, Eye,
} from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/currency';
import { findKeychain } from '@/lib/keychains';
import { exportEdited, type EditParams } from '@/lib/imageEdit';
import type { Product } from '@/types';
import type { KeychainPrintType } from '@/lib/keychains';

interface UploadedImage {
  id: string;
  url: string;
  name: string;
  blob?: Blob;
}

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// CSS clip-path or border-radius to render a photo inside a keychain shape.
function shapeClip(shape: string): React.CSSProperties {
  switch (shape) {
    case 'square':
      return { borderRadius: '0.5rem' };
    case 'rectangle':
      return { borderRadius: '0.375rem' };
    case 'heart':
      return { clipPath: 'polygon(50% 100%, 5% 55%, 5% 25%, 25% 5%, 50% 20%, 75% 5%, 95% 25%, 95% 55%)' };
    case 'love':
      return { clipPath: 'polygon(50% 100%, 5% 55%, 5% 25%, 25% 5%, 50% 20%, 75% 5%, 95% 25%, 95% 55%)' };
    case 'hexagon':
      return { clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)' };
    case 'locket':
      return { clipPath: 'polygon(50% 0%, 80% 10%, 100% 35%, 100% 70%, 75% 95%, 50% 100%, 25% 95%, 0% 70%, 0% 35%, 20% 10%)' };
    default:
      return { borderRadius: '0.5rem' };
  }
}

// Inline lightweight image editor for a single uploaded photo.
// Supports crop (aspect), zoom, rotate, brightness, contrast, saturation.
function InlineEditor({
  image,
  onSave,
  onCancel,
  saving,
}: {
  image: UploadedImage;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [srcUrl, setSrcUrl] = useState('');
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (image.blob) {
      const u = URL.createObjectURL(image.blob);
      setSrcUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setSrcUrl(image.url);
  }, [image]);

  useEffect(() => {
    if (!srcUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImgEl(img);
    img.src = srcUrl;
  }, [srcUrl]);

  const BOX = 280;
  const iw = imgEl?.naturalWidth ?? 1;
  const ih = imgEl?.naturalHeight ?? 1;
  const baseScale = Math.max(BOX / iw, BOX / ih);
  const scale = baseScale * zoom;
  const dispW = iw * scale;
  const dispH = ih * scale;
  const left = (BOX - dispW) / 2 + offset.x;
  const top = (BOX - dispH) / 2 + offset.y;

  function clamp(o: { x: number; y: number }) {
    const maxX = Math.max(0, (iw * scale - BOX) / 2);
    const maxY = Math.max(0, (ih * scale - BOX) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }

  let drag: { x: number; y: number; ox: number; oy: number } | null = null;
  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    setOffset(clamp({ x: drag.ox + (e.clientX - drag.x), y: drag.oy + (e.clientY - drag.y) }));
  }
  function onPointerUp() { drag = null; }

  const filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;

  async function handleSave() {
    if (!srcUrl) return;
    const params: EditParams = {
      brightness, contrast, saturation, highlights: 1, shadows: 1, rotation, crop: null,
    };
    const blob = await exportEdited(srcUrl, params);
    onSave(blob);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">Edit Photo</span>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5">
          <div
            className="relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200 mx-auto select-none"
            style={{ width: BOX, height: BOX, cursor: 'grab', touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {imgEl ? (
              <img
                src={srcUrl}
                alt={image.name}
                draggable={false}
                style={{
                  position: 'absolute', width: dispW, height: dispH, left, top, filter,
                  transform: `rotate(${rotation}deg)`, maxWidth: 'none',
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
              </div>
            )}
          </div>

          <div className="mt-5 space-y-4">
            {([
              ['Brightness', brightness, setBrightness, 0.5, 1.5, Sun],
              ['Contrast', contrast, setContrast, 0.5, 1.5, Contrast],
              ['Saturation', saturation, setSaturation, 0, 2, Droplet],
            ] as const).map(([label, val, set, min, max, Icon]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</span>
                  <span>{Math.round(val * 100)}%</span>
                </div>
                <input type="range" min={min} max={max} step={0.01} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full accent-teal-600" />
              </div>
            ))}

            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="flex items-center gap-1.5"><ZoomIn className="w-3.5 h-3.5" /> Zoom</span>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-teal-600" />
            </div>

            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
            >
              <RotateCw className="w-4 h-4" /> Rotate 90°
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !imgEl}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KeychainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [printType, setPrintType] = useState<KeychainPrintType | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const p = findKeychain(id);
    setProduct(p);
    setLoading(false);
  }, [id]);

  const shape = (product?.customization_options?.shape as string) ?? 'square';
  const material = (product?.customization_options?.material as string) ?? '';
  const printTypes = (product?.customization_options?.printTypes as KeychainPrintType[]) ?? [];
  const previewFrame = (product?.customization_options?.previewFrame as { top: string; left: string; width: string; height: string } | undefined) ?? { top: '25%', left: '25%', width: '50%', height: '50%' };
  const maxImages = printType === 'Single Side Print' ? 1 : printType === 'Double Side Print' ? 2 : printType === 'Left/Right Print' ? 2 : 1;

  const customizationValid = printType !== null && images.length >= maxImages;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, slot: number) {
    if (!e.target.files || !user) return;
    const file = e.target.files[0];
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPG or PNG image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Image is too large. Maximum 10MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileRef = storageRef(storage, `customization-uploads/${fileName}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const newImg: UploadedImage = { id: makeId(), url, name: file.name, blob: file };
      setImages((prev) => {
        const next = [...prev];
        if (slot < next.length) next[slot] = newImg;
        else next.push(newImg);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveEdit(idx: number, blob: Blob) {
    if (!user) return;
    setSavingEdit(true);
    setError(null);
    try {
      const fileName = `${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const fileRef = storageRef(storage, `customization-uploads/${fileName}`);
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);
      setImages((prev) => prev.map((img, i) => (i === idx ? { ...img, url, blob } : img)));
      setEditorIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save edit.');
    } finally {
      setSavingEdit(false);
    }
  }

  function buildCustomization() {
    return {
      customization_type: 'keychain' as const,
      page_count: null,
      magnet_shape: null,
      images: images.map((i) => i.url),
      unit_price: Number(product?.price ?? 0),
      shape: null,
      layout: null,
      frame_size: null,
      number_of_people: null,
      soft_copy: false,
      keychain_material: material,
      keychain_shape: shape,
      print_type: printType,
    };
  }

  function handleAddToCart() {
    if (!product || !customizationValid) return;
    addToCart(product, 1, buildCustomization());
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!product) return;
    if (!user) { navigate('/login'); return; }
    if (!customizationValid) return;
    addToCart(product, 1, buildCustomization());
    navigate('/checkout');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 text-lg">Keychain not found.</p>
          <Link to="/keychains" className="mt-4 inline-flex items-center gap-2 text-teal-600 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Keychains
          </Link>
        </div>
      </div>
    );
  }

  const slotLabels = printType === 'Double Side Print'
    ? ['Front', 'Back']
    : printType === 'Left/Right Print'
      ? ['Left', 'Right']
      : ['Photo'];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/keychains" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 font-medium text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Keychains
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Live Preview */}
          <div className="self-start lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="aspect-square flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="relative" style={{ width: '80%', aspectRatio: '1 / 1' }}>
                  {/* Keychain base image */}
                  <img src={product.image_url ?? ''} alt={product.name} className="absolute inset-0 w-full h-full object-contain" />
                  {/* Photo overlay clipped to shape, positioned in the white area */}
                  {images.length > 0 && (
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        ...shapeClip(shape),
                        top: previewFrame.top,
                        left: previewFrame.left,
                        width: previewFrame.width,
                        height: previewFrame.height,
                      }}
                    >
                      <img src={images[0].url} alt="Front preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 pb-3">
                <p className="text-center text-xs font-medium text-slate-500">
                  {images.length > 0 ? 'Live preview' : 'Upload a photo to see preview'}
                </p>
              </div>
            </div>

            {/* Full preview modal trigger */}
            {customizationValid && (
              <button
                onClick={() => setShowPreview(true)}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all"
              >
                <Eye className="w-4 h-4" /> View Full Preview
              </button>
            )}
          </div>

          {/* Details & customization */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">{material}</span>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full capitalize">{shape}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{product.name}</h1>
            <p className="mt-3 text-slate-600 leading-relaxed">{product.description}</p>

            <div className="mt-5">
              <p className="text-3xl font-bold text-slate-900">{formatINR(Number(product.price))}</p>
            </div>

            {/* Print type selection */}
            <div className="mt-6 bg-teal-50/50 rounded-xl p-5 border border-teal-100">
              <h3 className="font-semibold text-slate-900 mb-3">Choose Print Type</h3>
              <div className="flex flex-wrap gap-3">
                {printTypes.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => { setPrintType(pt); setImages([]); }}
                    className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                      printType === pt
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo upload slots */}
            {printType && (
              <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-1">
                  Upload Your Photos
                  <span className="text-sm font-normal text-slate-500 ml-2">({images.length}/{maxImages} uploaded)</span>
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  {printType === 'Single Side Print' && 'Upload 1 photo for the front side.'}
                  {printType === 'Double Side Print' && 'Upload 2 photos — one for the front, one for the back.'}
                  {printType === 'Left/Right Print' && 'Upload 2 photos — one for each side of the locket.'}
                  {printType === 'Name Laser Print' && 'Upload 1 photo or name design to engrave.'}
                </p>

                {!user && (
                  <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">Please sign in to upload photos.</p>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: maxImages }).map((_, slot) => {
                    const img = images[slot];
                    return (
                      <div key={slot}>
                        <p className="text-xs font-medium text-slate-500 mb-2">{slotLabels[slot] ?? `Photo ${slot + 1}`}</p>
                        {img ? (
                          <div className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white">
                            <img
                              src={img.url}
                              alt={slotLabels[slot]}
                              className="w-full h-full object-cover"
                              style={shapeClip(shape)}
                            />
                            <button
                              onClick={() => setEditorIndex(slot)}
                              title="Edit"
                              className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeImage(slot)}
                              className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl aspect-square cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all">
                            {uploading ? (
                              <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-7 h-7 text-slate-400 mb-1" />
                                <span className="text-xs text-slate-500 font-medium text-center px-2">Click to upload</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUpload(e, slot)}
                              disabled={uploading || !user}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                {images.length > 0 && (
                  <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> Hover a photo and click the pencil to crop or adjust.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={handleAddToCart}
                disabled={added || !customizationValid}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {added ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                {added ? 'Added to Cart' : 'Add to Cart'}
              </motion.button>
              <motion.button
                onClick={handleBuyNow}
                disabled={!customizationValid}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buy Now
              </motion.button>
            </div>

            {!customizationValid && printType && images.length < maxImages && (
              <p className="mt-3 text-sm text-amber-600">
                Please upload all {maxImages} photo{maxImages > 1 ? 's' : ''} ({images.length}/{maxImages}).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Inline editor */}
      {editorIndex !== null && images[editorIndex] && (
        <InlineEditor
          image={images[editorIndex]}
          saving={savingEdit}
          onCancel={() => setEditorIndex(null)}
          onSave={(blob) => handleSaveEdit(editorIndex, blob)}
        />
      )}

      {/* Full preview modal */}
      {showPreview && customizationValid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Product Preview</h2>
              <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="flex flex-col items-center gap-6">
                {maxImages === 1 && (
                  <div className="relative" style={{ width: '60%', aspectRatio: '1 / 1' }}>
                    <img src={product.image_url ?? ''} alt={product.name} className="absolute inset-0 w-full h-full object-contain" />
                    <div className="absolute overflow-hidden" style={{ ...shapeClip(shape), ...previewFrame }}>
                      <img src={images[0].url} alt="Front" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                {maxImages === 2 && (
                  <div className="flex gap-6 flex-wrap justify-center">
                    <div className="text-center">
                      <div className="relative" style={{ width: '240px', aspectRatio: '1 / 1' }}>
                        <img src={product.image_url ?? ''} alt={product.name} className="absolute inset-0 w-full h-full object-contain" />
                        <div className="absolute overflow-hidden" style={{ ...shapeClip(shape), ...previewFrame }}>
                          <img src={images[0].url} alt="Front" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-500">{slotLabels[0]}</p>
                    </div>
                    <div className="text-center">
                      <div className="relative" style={{ width: '240px', aspectRatio: '1 / 1' }}>
                        <img src={product.image_url ?? ''} alt={product.name} className="absolute inset-0 w-full h-full object-contain" />
                        <div className="absolute overflow-hidden" style={{ ...shapeClip(shape), ...previewFrame }}>
                          <img src={images[1]?.url ?? ''} alt="Back" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-500">{slotLabels[1]}</p>
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500">{material} · {printType}</p>
                  <p className="text-2xl font-bold text-teal-600 mt-1">{formatINR(Number(product.price))}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setShowPreview(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">Edit Design</button>
              <button
                onClick={() => { setShowPreview(false); handleAddToCart(); }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
              >
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
