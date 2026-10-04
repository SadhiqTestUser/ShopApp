import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ShoppingCart, Loader2, Check, Upload, X, ImageIcon, Pencil,
  Eye, Minus, Plus,
} from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/currency';
import { findKeychain } from '@/lib/keychains';
import { exportCropped, loadImage } from '@/lib/imageEdit';
import KeychainMockup, { type KeychainPhoto } from '@/components/keychain/KeychainMockup';
import KeychainPhotoControls from '@/components/keychain/KeychainPhotoControls';
import { CustomizationSuggestionsField } from '@/components/CustomizationSuggestions';
import { cropPixels, INITIAL_VIEW, serializeDesign, type PhotoView } from '@/components/keychain/keychainGeometry';
import { KEYCHAIN_MOCKUPS } from '@/components/keychain/keychainMockups';
import type { Product } from '@/types';
import type { KeychainPrintType } from '@/lib/keychains';
import { exportSvgPreview } from '@/lib/svgExport';

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export default function KeychainDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <KeychainDetail key={id} id={id} />;
}

function KeychainDetail({ id }: { id?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const [printType, setPrintType] = useState<KeychainPrintType | null>(null);
  const [images, setImages] = useState<(KeychainPhoto | null)[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [suggestions, setSuggestions] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const savedPreviewRefs = useRef<(SVGSVGElement | null)[]>([]);
  const busyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!id) return;
    const p = findKeychain(id);
    setProduct(p);
    setLoading(false);
  }, [id]);

  const shape = (product?.customization_options?.shape as string) ?? 'square';
  const material = (product?.customization_options?.material as string) ?? '';
  const printTypes = (product?.customization_options?.printTypes as KeychainPrintType[]) ?? [];
  const template = id ? KEYCHAIN_MOCKUPS[id] : undefined;
  const maxImages = printType === 'Single Side Print' ? 1 : printType === 'Double Side Print' ? 2 : printType === 'Left/Right Print' ? 2 : 1;
  const uploadedCount = images.filter(Boolean).length;
  const customizationValid = !!template && printType !== null &&
    Array.from({ length: maxImages }, (_, slot) => !!images[slot]).every(Boolean);
  const busy = saving || uploading;

  function updatePhoto(slot: number, update: (view: PhotoView) => PhotoView) {
    if (busyRef.current) return;
    setImages((previous) => previous.map((photo, index) =>
      photo && index === slot ? { ...photo, view: update(photo.view) } : photo));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, slot: number) {
    if (!e.target.files || !user || busyRef.current) return;
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPG or PNG image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Image is too large. Maximum 10MB.');
      return;
    }
    setUploading(true);
    busyRef.current = true;
    setError(null);
    const localUrl = URL.createObjectURL(file);
    try {
      const decoded = await loadImage(localUrl);
      if (!decoded.naturalWidth || !decoded.naturalHeight) throw new Error('Please choose a valid photo.');
      const ext = file.name.split('.').pop();
      const fileName = `${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileRef = storageRef(storage, `customization-uploads/${fileName}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      if (!mounted.current) return;
      const newImg: KeychainPhoto = { id: makeId(), url, name: file.name, blob: file,
        width: decoded.naturalWidth, height: decoded.naturalHeight, view: { ...INITIAL_VIEW } };
      setImages((prev) => Array.from({ length: maxImages }, (_, index) => index === slot ? newImg : prev[index] ?? null));
      setActiveSlot(slot);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      URL.revokeObjectURL(localUrl);
      busyRef.current = false;
      if (mounted.current) setUploading(false);
    }
  }

  function removeImage(idx: number) {
    if (busyRef.current) return;
    setImages((prev) => prev.map((photo, index) => index === idx ? null : photo));
  }

  function buildCustomization(previewImages: string[], productionImages: string[]) {
    return {
      customization_type: 'keychain' as const,
      page_count: null,
      magnet_shape: null,
      images: previewImages,
      original_images: images.flatMap((photo) => photo ? [photo.url] : []),
      production_images: productionImages,
      keychain_design: serializeDesign(id!, images.filter((photo): photo is KeychainPhoto => !!photo)),
      unit_price: Number(product?.price ?? 0),
      shape: null,
      layout: null,
      frame_size: null,
      number_of_people: null,
      soft_copy: false,
      keychain_material: material,
      keychain_shape: shape,
      print_type: printType,
      suggestions: suggestions.trim(),
    };
  }

  async function saveToCart(checkout = false) {
    if (!user) { navigate('/login'); return; }
    if (!product || !template || !customizationValid || busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    setError(null);
    try {
      // Export only at checkout/cart time, always from each original upload.
      // The preview's exact position and the printable crop therefore stay in sync.
      const productionUrls = await Promise.all(images.map(async (photo) => {
        if (!photo) throw new Error('Please upload every required photo.');
        const source = URL.createObjectURL(photo.blob);
        try {
          const crop = cropPixels(photo, template.box, photo.view);
          const blob = await exportCropped(source, crop, photo.view.rotation, photo.view);
          const fileRef = storageRef(storage, `customization-uploads/${user.uid}/${makeId()}.jpg`);
          await uploadBytes(fileRef, blob);
          return await getDownloadURL(fileRef);
        } finally { URL.revokeObjectURL(source); }
      }));
      const previewSourceImages = new Map(images.flatMap((photo) => photo ? [[photo.url, photo.blob] as const] : []));
      const previewUrls = await Promise.all(savedPreviewRefs.current.map(async (svg) => {
        if (!svg) throw new Error('The design preview is not ready yet. Please try again.');
        const blob = await exportSvgPreview(svg, 1200, previewSourceImages);
        const fileRef = storageRef(storage, `customization-uploads/${user.uid}/${makeId()}-preview.jpg`);
        await uploadBytes(fileRef, blob);
        return getDownloadURL(fileRef);
      }));
      if (!mounted.current) return;
      addToCart(product, quantity, buildCustomization(previewUrls, productionUrls));
      setShowPreview(false);
      if (checkout) navigate('/checkout');
      else {
        setAdded(true);
        setTimeout(() => { if (mounted.current) setAdded(false); }, 2000);
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Could not save your photo placement. Please try again.');
    } finally {
      busyRef.current = false;
      if (mounted.current) setSaving(false);
    }
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
          <div ref={previewRef} className="self-start lg:sticky lg:top-8 scroll-mt-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="aspect-square flex items-center justify-center p-3 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100">
                {template ? <KeychainMockup imageUrl={product.image_url ?? ''} name={product.name}
                  template={template} photos={images} activeSlot={activeSlot}
                  onSelect={setActiveSlot} onChange={busy ? undefined : updatePhoto} />
                  : <img src={product.image_url ?? ''} alt={product.name} className="w-full h-full object-contain" />}
              </div>
              <div className="px-4 pb-4 space-y-3">
                <p className="text-center text-xs font-medium text-slate-500">
                  {uploadedCount > 0 ? 'Live preview — adjust your photo here' : 'Upload a photo to see preview'}
                </p>
                {uploadedCount > 0 && maxImages > 1 && <div className="flex gap-2" aria-label="Choose photo to adjust">
                  {slotLabels.map((label, slot) => <button key={label} disabled={busy} type="button"
                    aria-pressed={activeSlot === slot} onClick={() => setActiveSlot(slot)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm ${activeSlot === slot ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {label}{!images[slot] ? ' (upload photo)' : ''}
                  </button>)}
                </div>}
                {template && images[activeSlot] && <fieldset disabled={busy}>
                  <KeychainPhotoControls photo={images[activeSlot]!} box={template.box}
                    onChange={(update) => updatePhoto(activeSlot, update)} />
                </fieldset>}
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
                    disabled={busy}
                    onClick={() => {
                      if (pt === printType) return;
                      setPrintType(pt); setImages([]); setActiveSlot(0); setError(null);
                    }}
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
                  <span className="text-sm font-normal text-slate-500 ml-2">({uploadedCount}/{maxImages} uploaded)</span>
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
                            {template && <KeychainMockup imageUrl={product.image_url ?? ''} name={product.name}
                              ref={slot < (template.regions.length === 1 ? maxImages : 1)
                                ? (node) => { savedPreviewRefs.current[slot] = node; } : undefined}
                              template={template} photos={images} activeSlot={slot} />}
                            <button
                              disabled={busy}
                              onClick={() => { setActiveSlot(slot); previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                              aria-label={`Adjust ${slotLabels[slot]} in live preview`}
                              className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => removeImage(slot)}
                              aria-label={`Remove ${slotLabels[slot]} photo`}
                              className="absolute top-1 right-1 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
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
                              disabled={busy || !user}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                {uploadedCount > 0 && (
                  <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> Adjust photos directly in the live preview. Originals are kept for readjusting.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <CustomizationSuggestionsField className="mt-6" productName={product.name} value={suggestions} onChange={setSuggestions} disabled={busy} />
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-slate-700">Quantity</p>
              <div className="flex items-center gap-3" role="group" aria-label="Keychain quantity">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={busy || quantity === 1}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4 text-slate-600" />
                </button>
                <span aria-live="polite" className="w-12 text-center text-lg font-semibold text-slate-900">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={busy}
                  onClick={() => setQuantity((current) => current + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={() => saveToCart()}
                disabled={busy || added || !customizationValid}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : added ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                {saving ? 'Saving design…' : added ? 'Added to Cart' : 'Add to Cart'}
              </motion.button>
              <motion.button
                onClick={() => saveToCart(true)}
                disabled={busy || !customizationValid}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buy Now
              </motion.button>
            </div>

            {!customizationValid && printType && uploadedCount < maxImages && (
              <p className="mt-3 text-sm text-amber-600">
                Please upload all {maxImages} photo{maxImages > 1 ? 's' : ''} ({uploadedCount}/{maxImages}).
              </p>
            )}
          </div>
        </div>
      </div>

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
                {template && <div className="flex flex-wrap justify-center gap-4 w-full">
                  {Array.from({ length: template.regions.length === 1 ? maxImages : 1 }, (_, slot) => (
                    <div key={slot} className={maxImages === 1 || template.regions.length > 1 ? 'w-full' : 'w-60 max-w-full'}>
                      <KeychainMockup imageUrl={product.image_url ?? ''} name={product.name}
                        template={template} photos={images} activeSlot={slot} />
                      {maxImages > 1 && template.regions.length === 1 && <p className="text-center text-sm text-slate-500">{slotLabels[slot]}</p>}
                    </div>
                  ))}
                </div>}
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500">{material} · {printType}</p>
                  <p className="text-2xl font-bold text-teal-600 mt-1">{formatINR(Number(product.price) * quantity)}</p>
                  {quantity > 1 && <p className="mt-1 text-xs text-slate-500">{quantity} × {formatINR(Number(product.price))}</p>}
                </div>
              </div>
            </div>
            {error && <p role="alert" className="px-5 py-3 text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setShowPreview(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">Edit Design</button>
              <button
                disabled={busy || added}
                onClick={() => saveToCart()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
              >
                <ShoppingCart className="w-4 h-4" /> {saving ? 'Saving design…' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
