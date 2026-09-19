import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ShoppingCart, Loader2, Check, Minus, Plus, Truck, ShieldCheck,
  Clock, Star, Upload, X, ImageIcon, Ruler, Users, Tag, Pencil, GripVertical,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCart, type CartItem } from '@/context/CartContext';
import { formatINR, getOfferInfo } from '@/lib/currency';
import PhotoEditorModal from '@/components/PhotoEditorModal';
import MagnetCustomizer from '@/components/MagnetCustomizer';
import type { Product, CustomizationType, FrameSizeOption } from '@/types';

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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// Turn raw Firebase Storage errors into something a customer can act on.
function uploadErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'storage/retry-limit-exceeded' || code === 'storage/canceled') {
    return "Upload timed out. Check your connection and try again. If this keeps happening, Firebase Storage may not be set up for this project.";
  }
  if (code === 'storage/unauthorized') {
    return 'You are not allowed to upload this file. Please sign in again and retry.';
  }
  if (code === 'storage/unknown' || code === 'storage/object-not-found') {
    return 'Upload failed because the storage bucket is unavailable. Please try again later.';
  }
  return err instanceof Error ? err.message : 'Upload failed. Please try again.';
}

// Returns CSS to render an uploaded photo cropped to a product shape (for live preview).
function shapeStyle(shape: string | null): React.CSSProperties {
  switch (shape) {
    case 'round':
    case 'oval':
      return { borderRadius: '50%' };
    case 'square':
      return { borderRadius: '0.75rem' };
    case 'rectangle':
      return { borderRadius: '0.5rem' };
    case 'arch':
      return { borderRadius: '9999px 9999px 0.5rem 0.5rem' };
    case 'hexagon':
      return { clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)' };
    case 'star':
      return { clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' };
    case 'heart':
      return { clipPath: 'polygon(50% 92%, 20% 62%, 8% 42%, 12% 22%, 28% 12%, 42% 18%, 50% 30%, 58% 18%, 72% 12%, 88% 22%, 92% 42%, 80% 62%)' };
    default:
      return { borderRadius: '0.5rem' };
  }
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customization state
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [magnetShape, setMagnetShape] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [shape, setShape] = useState<string | null>(null);
  const [layout, setLayout] = useState<string | null>(null);
  const [frameSizeId, setFrameSizeId] = useState<string | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'products', id)).then((snap) => {
      setProduct(snap.exists() ? ({ id: snap.id, ...snap.data() } as Product) : null);
      setLoading(false);
    });
  }, [id]);

  const customType: CustomizationType = product?.customization_type ?? 'standard';
  const customOptions = product?.customization_options ?? {};
  const pageCounts = (customOptions.pageCounts as number[]) ?? [10, 20, 30];
  const pricePerPage = (customOptions.pricePerPage as number) ?? 50;
  const magnetShapes = (customOptions.shapes as string[]) ?? ['round', 'square'];
  const maxImages = (customOptions.maxImages as number) ?? 1;
  // Number of photo slots required for a wooden stand layout (parsed from the layout id, e.g. "collage-4" -> 4).
  const standLayoutPhotoCount = (l: string | null): number => {
    if (!l) return 0;
    const match = l.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };
  // Photo books need one photo per page; wooden stands one per layout slot; magnets one per magnet.
  const effectiveMaxImages =
    customType === 'magnet'
      ? 1
      : customType === 'photo_book'
        ? pageCount ?? 0
        : customType === 'wooden_stand'
          ? standLayoutPhotoCount(layout)
          : maxImages;
  // Wooden / hanging stand options
  const standShapes = (customOptions.shapes as string[]) ?? [];
  const standLayouts = (customOptions.layouts as string[]) ?? [];
  // Photo frame options
  const frameSizes = (customOptions.sizes as FrameSizeOption[]) ?? [];
  const peopleOptions = (customOptions.peopleOptions as number[]) ?? [];
  const pricePerPerson = (customOptions.pricePerPerson as number) ?? 0;
  const sizeGuideUrl = (customOptions.sizeGuideUrl as string) ?? '';
  const selectedFrameSize = frameSizes.find((s) => s.id === frameSizeId) ?? null;

  // Live preview: use the first uploaded image, cropped to the selected shape.
  const previewImage = images[0]?.url ?? null;
  const previewShape =
    customType === 'magnet'
      ? magnetShape
      : customType === 'wooden_stand' || customType === 'hanging_stand'
        ? shape
        : null;

  const customPrice = (() => {
    const base = Number(product?.price ?? 0);
    if (customType === 'photo_book' && pageCount) return base + pageCount * pricePerPage;
    if (customType === 'photo_frame' && selectedFrameSize) {
      const peopleSurcharge = Math.max(0, numberOfPeople - 1) * pricePerPerson;
      return selectedFrameSize.price + peopleSurcharge;
    }
    return base;
  })();

  const unitPrice = customPrice;
  const totalPrice = unitPrice * quantity;

  const needsCustomization = customType !== 'standard';
  const customizationValid = (() => {
    if (!needsCustomization) return true;
    if (customType === 'photo_book') return pageCount !== null && images.length >= pageCount;
    if (customType === 'magnet') return magnetShape !== null && images.length >= 1;
    if (customType === 'phone_case' || customType === 'mug') return images.length >= 1;
    if (customType === 'wooden_stand') return shape !== null && layout !== null && images.length >= standLayoutPhotoCount(layout);
    if (customType === 'hanging_stand') return shape !== null && images.length >= 1;
    if (customType === 'photo_frame') return frameSizeId !== null && images.length >= 1;
    return true;
  })();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !user) return;
    const files = Array.from(e.target.files);
    const remaining = effectiveMaxImages - images.length;
    const toUpload = files.slice(0, remaining);
    // Allow re-selecting the same file after a failed attempt.
    e.target.value = '';
    setUploading(true);
    setError(null);

    try {
      const newImages: UploadedImage[] = [];
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) {
          setError(`"${file.name}" isn't an image. Please upload a JPG or PNG.`);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(`"${file.name}" is too large. Each photo must be under 10MB.`);
          continue;
        }
        const ext = file.name.split('.').pop();
        const fileName = `${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        try {
          const fileRef = storageRef(storage, `customization-uploads/${fileName}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          newImages.push({ id: makeId(), url, name: file.name, blob: file });
        } catch (uploadError) {
          setError(uploadErrorMessage(uploadError));
          continue;
        }
      }
      setImages((prev) => [...prev, ...newImages]);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function reorderImages(from: number, to: number) {
    if (from === to) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  // Re-upload an edited photo and swap it in place, keeping its position and id.
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
      setError(uploadErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  }

  function buildCustomization() {
    return {
      customization_type: customType,
      page_count: pageCount,
      magnet_shape: magnetShape,
      images: images.map((i) => i.url),
      unit_price: unitPrice,
      shape,
      layout,
      frame_size: selectedFrameSize?.label ?? null,
      number_of_people: customType === 'photo_frame' ? numberOfPeople : null,
      soft_copy: selectedFrameSize?.softCopy ?? false,
    };
  }

  function handleAddToCart() {
    if (!product) return;
    if (needsCustomization && !customizationValid) return;
    addToCart(product, quantity, buildCustomization());
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!product) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (needsCustomization && !customizationValid) return;
    addToCart(product, quantity, needsCustomization ? buildCustomization() : null);
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
          <p className="text-slate-500 text-lg">Product not found.</p>
          <Link to="/products" className="mt-4 inline-flex items-center gap-2 text-teal-600 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const slotsNeeded = effectiveMaxImages;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 font-medium text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Image / Live Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden self-start lg:sticky lg:top-8">
            {previewImage ? (
              <>
                <div className="aspect-square flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
                  {customType === 'photo_frame' ? (
                    <motion.div
                      key={previewImage}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="p-3 bg-gradient-to-br from-amber-800 to-amber-950 rounded shadow-2xl max-w-[85%]"
                    >
                      <div className="p-2 bg-white">
                        <img src={previewImage} alt="Preview" className="block w-full object-cover" />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.img
                      key={`${previewImage}-${previewShape}`}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      src={previewImage}
                      alt="Preview"
                      style={shapeStyle(previewShape)}
                      className="w-[80%] h-[80%] object-cover drop-shadow-xl"
                    />
                  )}
                </div>
                <p className="text-center text-xs font-medium text-slate-500 pb-3 capitalize">
                  Live preview
                  {previewShape ? ` — ${previewShape} shape` : ''}
                  {customType === 'photo_frame' && selectedFrameSize ? ` — ${selectedFrameSize.label}` : ''}
                </p>
              </>
            ) : (
              <div className="aspect-square bg-slate-100">
                <img src={product.image_url ?? ''} alt={product.name} className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full w-fit">{product.category}</span>
            <h1 className="mt-4 text-3xl font-bold text-slate-900">{product.name}</h1>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm text-slate-500">(128 reviews)</span>
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <p className="text-3xl font-bold text-slate-900">{formatINR(unitPrice)}</p>
              {customType === 'photo_frame' && selectedFrameSize?.mrp && selectedFrameSize.mrp > selectedFrameSize.price && (
                <>
                  <span className="text-lg text-slate-400 line-through">{formatINR(selectedFrameSize.mrp)}</span>
                  <span className="text-sm font-semibold text-green-600">
                    {Math.round(((selectedFrameSize.mrp - selectedFrameSize.price) / selectedFrameSize.mrp) * 100)}% OFF
                  </span>
                </>
              )}
              {customType !== 'photo_frame' && (() => {
                const offer = getOfferInfo(product);
                if (!offer.hasOffer) return null;
                const originalUnit = unitPrice + (offer.originalPrice - offer.price);
                return (
                  <>
                    <span className="text-lg text-slate-400 line-through">{formatINR(originalUnit)}</span>
                    <span className="text-sm font-semibold text-green-600">{offer.discountPercent}% OFF</span>
                  </>
                );
              })()}
            </div>

            <p className="mt-5 text-slate-600 leading-relaxed">{product.description}</p>

            {/* Customization: Photo Book */}
            {customType === 'photo_book' && (
              <div className="mt-6 bg-teal-50/50 rounded-xl p-5 border border-teal-100">
                <h3 className="font-semibold text-slate-900 mb-3">Choose Number of Pages</h3>
                <div className="flex gap-3">
                  {pageCounts.map((count) => (
                    <button
                      key={count}
                      onClick={() => { setPageCount(count); setImages([]); }}
                      className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                        pageCount === count
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      {count} pages<br /><span className="text-xs font-normal opacity-80">+{formatINR(count * pricePerPage)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

{customType === 'magnet' && (
              <MagnetCustomizer
                product={product}
                onAddToCart={(customization, totalQty) => {
                  addToCart(product, totalQty, customization as CartItem['customization']);
                  setAdded(true);
                  setTimeout(() => setAdded(false), 2000);
                }}
              />
            )}

            {/* Customization: Wooden Photo Stand */}
            {customType === 'wooden_stand' && (
              <div className="mt-6 space-y-5">
                <div className="bg-teal-50/50 rounded-xl p-5 border border-teal-100">
                  <h3 className="font-semibold text-slate-900 mb-3">Choose Stand Shape</h3>
                  <div className="flex flex-wrap gap-3">
                    {standShapes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setShape(s)}
                        className={`px-5 py-3 rounded-xl font-semibold text-sm capitalize transition-all ${
                          shape === s
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-teal-50/50 rounded-xl p-5 border border-teal-100">
                  <h3 className="font-semibold text-slate-900 mb-3">Choose Photo Layout</h3>
                  <div className="flex flex-wrap gap-3">
                    {standLayouts.map((l) => (
                      <button
                        key={l}
                        onClick={() => setLayout(l)}
                        className={`px-5 py-3 rounded-xl font-semibold text-sm capitalize transition-all ${
                          layout === l
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        {l.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Customization: Hanging Photo Stand */}
            {customType === 'hanging_stand' && (
              <div className="mt-6 bg-teal-50/50 rounded-xl p-5 border border-teal-100">
                <h3 className="font-semibold text-slate-900 mb-3">Choose Shape</h3>
                <div className="flex flex-wrap gap-3">
                  {standShapes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setShape(s)}
                      className={`px-5 py-3 rounded-xl font-semibold text-sm capitalize transition-all ${
                        shape === s
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customization: Photo Frame Maker / Digi Painting */}
            {customType === 'photo_frame' && (
              <div className="mt-6 space-y-5">
                <div className="bg-teal-50/50 rounded-xl p-5 border border-teal-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-teal-600" /> Choose Frame Size
                    </h3>
                    {sizeGuideUrl && (
                      <a
                        href={sizeGuideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-teal-600 hover:text-teal-700 underline"
                      >
                        Size Guide
                      </a>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {frameSizes.map((s) => {
                      const active = frameSizeId === s.id;
                      const hasDiscount = s.mrp && s.mrp > s.price;
                      const discountPct = hasDiscount ? Math.round(((s.mrp! - s.price) / s.mrp!) * 100) : 0;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setFrameSizeId(s.id)}
                          className={`relative text-left px-4 py-3 rounded-xl border transition-all ${
                            active
                              ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          <span className="block font-semibold text-sm">{s.label}</span>
                          <span className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-bold">{formatINR(s.price)}</span>
                            {hasDiscount && (
                              <span className={`text-xs line-through ${active ? 'text-white/70' : 'text-slate-400'}`}>
                                {formatINR(s.mrp!)}
                              </span>
                            )}
                          </span>
                          {hasDiscount && (
                            <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                              active ? 'bg-white text-teal-700' : 'bg-teal-100 text-teal-700'
                            }`}>
                              <Tag className="w-2.5 h-2.5" /> {discountPct}% OFF
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {peopleOptions.length > 0 && (
                  <div className="bg-teal-50/50 rounded-xl p-5 border border-teal-100">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600" /> Number of People
                      {pricePerPerson > 0 && (
                        <span className="text-xs font-normal text-slate-500">(+{formatINR(pricePerPerson)} each after the first)</span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {peopleOptions.map((n) => (
                        <button
                          key={n}
                          onClick={() => setNumberOfPeople(n)}
                          className={`w-12 h-12 rounded-xl font-semibold text-sm transition-all ${
                            numberOfPeople === n
                              ? 'bg-teal-600 text-white shadow-md'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Image Upload */}
            {needsCustomization && customType !== 'magnet' && (customType !== 'photo_book' || pageCount) && (customType !== 'wooden_stand' || (shape && layout)) && (
              <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-1">
                  Upload Your Photos
                  <span className="text-sm font-normal text-slate-500 ml-2">({images.length}/{slotsNeeded} uploaded)</span>
                </h3>
                <p className="text-sm text-slate-500 mb-4">Upload your photos and we'll print them on your product. You can reorder by removing and re-uploading.</p>

                {!user && (
                  <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">Please sign in to upload photos.</p>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
                )}

                {user && images.length < slotsNeeded && (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl py-8 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500 font-medium">Click to upload photos</span>
                        <span className="text-xs text-slate-400 mt-1">JPG, PNG up to 10MB each</span>
                      </>
                    )}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                )}

                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => { if (dragIndex !== null) reorderImages(dragIndex, idx); setDragIndex(null); }}
                        onDragEnd={() => setDragIndex(null)}
                        className={`relative group aspect-square rounded-lg overflow-hidden border bg-white cursor-move transition-all ${
                          dragIndex === idx ? 'opacity-40 ring-2 ring-teal-400' : 'border-slate-200'
                        }`}
                      >
                        <img src={img.url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                        <span className="absolute top-1 left-1 w-5 h-5 rounded bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-3 h-3" />
                        </span>
                        <button
                          onClick={() => setEditorIndex(idx)}
                          title="Crop & edit"
                          className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {images.length > 0 && (
                  <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> Drag photos to reorder. Hover a photo and click the pencil to crop or adjust brightness, contrast & more.
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
            {customType !== 'magnet' && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4 text-slate-600" />
                </button>
                <span className="w-12 text-center text-lg font-semibold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
            )}

            {/* Actions */}
            {customType !== 'magnet' && (
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={handleAddToCart}
                disabled={added || (needsCustomization && !customizationValid)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <motion.span
                  key={added ? 'added' : 'add'}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="inline-flex items-center gap-2"
                >
                  {added ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                  {added ? 'Added to Cart' : 'Add to Cart'}
                </motion.span>
              </motion.button>
              <motion.button
                onClick={handleBuyNow}
                disabled={ordering || (needsCustomization && !customizationValid)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ordering ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buy Now'}
              </motion.button>
            </div>
            )}

            {needsCustomization && customType !== 'magnet' && !customizationValid && (
              <p className="mt-3 text-sm text-amber-600">
                {customType === 'photo_book' && !pageCount && 'Please select the number of pages.'}
                {customType === 'photo_book' && pageCount && images.length < pageCount && `Please upload all ${pageCount} photos (${images.length}/${pageCount}).`}
                {(customType === 'phone_case' || customType === 'mug') && images.length < 1 && 'Please upload at least 1 photo.'}
                {customType === 'wooden_stand' && !shape && 'Please select a stand shape.'}
                {customType === 'wooden_stand' && shape && !layout && 'Please select a photo layout.'}
                {customType === 'wooden_stand' && shape && layout && images.length < standLayoutPhotoCount(layout) && `Please upload all ${standLayoutPhotoCount(layout)} photos (${images.length}/${standLayoutPhotoCount(layout)}).`}
                {customType === 'hanging_stand' && !shape && 'Please select a shape.'}
                {customType === 'hanging_stand' && shape && images.length < 1 && 'Please upload at least 1 photo.'}
                {customType === 'photo_frame' && !frameSizeId && 'Please select a frame size.'}
                {customType === 'photo_frame' && frameSizeId && images.length < 1 && 'Please upload at least 1 photo.'}
              </p>
            )}

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-slate-100">
              <div className="flex flex-col items-center text-center gap-2">
                <Truck className="w-6 h-6 text-teal-600" />
                <span className="text-xs text-slate-500 font-medium">Free shipping over &#8377;500</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <ShieldCheck className="w-6 h-6 text-teal-600" />
                <span className="text-xs text-slate-500 font-medium">Quality guaranteed</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Clock className="w-6 h-6 text-teal-600" />
                <span className="text-xs text-slate-500 font-medium">Ships in 24 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editorIndex !== null && images[editorIndex] && (
        <PhotoEditorModal
          images={images}
          index={editorIndex}
          saving={savingEdit}
          onClose={() => setEditorIndex(null)}
          onNavigate={(i) => setEditorIndex(Math.max(0, Math.min(images.length - 1, i)))}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
