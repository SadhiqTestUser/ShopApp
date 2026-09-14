import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Loader2, Check, Minus, Plus, Truck, ShieldCheck,
  Clock, Star, Upload, X, ImageIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/currency';
import type { Product, CustomizationType } from '@/types';

interface UploadedImage {
  url: string;
  name: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
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

  useEffect(() => {
    if (!id) return;
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data as Product | null);
        setLoading(false);
      });
  }, [id]);

  const customType: CustomizationType = product?.customization_type ?? 'standard';
  const customOptions = product?.customization_options ?? {};
  const pageCounts = (customOptions.pageCounts as number[]) ?? [10, 20, 30];
  const pricePerPage = (customOptions.pricePerPage as number) ?? 50;
  const magnetShapes = (customOptions.shapes as string[]) ?? ['round', 'square'];
  const maxImages = (customOptions.maxImages as number) ?? 1;

  const customPrice = (() => {
    if (customType === 'photo_book' && pageCount) return Number(product?.price ?? 0) + pageCount * pricePerPage;
    return Number(product?.price ?? 0);
  })();

  const unitPrice = customPrice;
  const totalPrice = unitPrice * quantity;

  const needsCustomization = customType !== 'standard';
  const customizationValid = (() => {
    if (!needsCustomization) return true;
    if (customType === 'photo_book') return pageCount !== null && images.length >= Math.min(pageCount, 3);
    if (customType === 'magnet') return magnetShape !== null && images.length >= 1;
    if (customType === 'phone_case' || customType === 'mug') return images.length >= 1;
    return true;
  })();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !session) return;
    const files = Array.from(e.target.files);
    const remaining = maxImages - images.length;
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    setError(null);

    try {
      const newImages: UploadedImage[] = [];
      for (const file of toUpload) {
        const ext = file.name.split('.').pop();
        const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('customization-uploads')
          .upload(fileName, file);
        if (uploadError) {
          setError(uploadError.message);
          continue;
        }
        const { data: urlData } = supabase.storage
          .from('customization-uploads')
          .getPublicUrl(fileName);
        newImages.push({ url: urlData.publicUrl, name: file.name });
      }
      setImages((prev) => [...prev, ...newImages]);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAddToCart() {
    if (!product) return;
    if (needsCustomization && !customizationValid) return;
    addToCart(product, quantity, {
      customization_type: customType,
      page_count: pageCount,
      magnet_shape: magnetShape,
      images: images.map((i) => i.url),
      unit_price: unitPrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!product) return;
    if (!session) {
      navigate('/login');
      return;
    }
    if (needsCustomization && !customizationValid) return;
    addToCart(product, quantity, needsCustomization ? {
      customization_type: customType,
      page_count: pageCount,
      magnet_shape: magnetShape,
      images: images.map((i) => i.url),
      unit_price: unitPrice,
    } : null);
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

  const slotsNeeded = customType === 'photo_book' ? Math.min(pageCount ?? 0, maxImages) : maxImages;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 font-medium text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Image */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="aspect-square bg-slate-100">
              <img src={product.image_url ?? ''} alt={product.name} className="w-full h-full object-cover" />
            </div>
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

            <p className="mt-5 text-3xl font-bold text-slate-900">{formatINR(unitPrice)}</p>

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

            {/* Customization: Magnet Shape */}
            {customType === 'magnet' && (
              <div className="mt-6 bg-teal-50/50 rounded-xl p-5 border border-teal-100">
                <h3 className="font-semibold text-slate-900 mb-3">Choose Shape</h3>
                <div className="flex gap-3">
                  {magnetShapes.map((shape) => (
                    <button
                      key={shape}
                      onClick={() => { setMagnetShape(shape); setImages([]); }}
                      className={`px-5 py-3 rounded-xl font-semibold text-sm capitalize transition-all ${
                        magnetShape === shape
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Upload */}
            {needsCustomization && (customType !== 'photo_book' || pageCount) && (customType !== 'magnet' || magnetShape) && (
              <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-1">
                  Upload Your Photos
                  {customType === 'photo_book' && <span className="text-sm font-normal text-slate-500 ml-2">({images.length}/{slotsNeeded} uploaded)</span>}
                  {customType === 'magnet' && <span className="text-sm font-normal text-slate-500 ml-2">({images.length}/{maxImages} uploaded)</span>}
                  {(customType === 'phone_case' || customType === 'mug') && <span className="text-sm font-normal text-slate-500 ml-2">({images.length}/{maxImages} uploaded)</span>}
                </h3>
                <p className="text-sm text-slate-500 mb-4">Upload your photos and we'll print them on your product. You can reorder by removing and re-uploading.</p>

                {!session && (
                  <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">Please sign in to upload photos.</p>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
                )}

                {session && images.length < slotsNeeded && (
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
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white">
                        <img src={img.url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
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
                    <ImageIcon className="w-3.5 h-3.5" /> Photos can be reordered by removing and re-uploading in your preferred order.
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
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

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                disabled={added || (needsCustomization && !customizationValid)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {added ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                {added ? 'Added to Cart' : 'Add to Cart'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={ordering || (needsCustomization && !customizationValid)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ordering ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buy Now'}
              </button>
            </div>

            {needsCustomization && !customizationValid && (
              <p className="mt-3 text-sm text-amber-600">
                {customType === 'photo_book' && !pageCount && 'Please select the number of pages.'}
                {customType === 'photo_book' && pageCount && images.length < Math.min(pageCount, 3) && `Please upload at least ${Math.min(pageCount, 3)} photos.`}
                {customType === 'magnet' && !magnetShape && 'Please select a shape.'}
                {customType === 'magnet' && magnetShape && images.length < 1 && 'Please upload at least 1 photo.'}
                {(customType === 'phone_case' || customType === 'mug') && images.length < 1 && 'Please upload at least 1 photo.'}
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
    </div>
  );
}
