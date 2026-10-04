import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ArrowRight, Check, ImagePlus, Loader2, Move, Pencil, RotateCcw, ShoppingCart } from 'lucide-react';
import type { Product } from '@/types';
import type { CartItem } from '@/context/CartContext';
import { formatINR } from '@/lib/currency';
import { loadImage } from '@/lib/imageEdit';
import { PHOTO_FRAME_SIZES, frameDimensions, framePrice, type FrameOrientation } from '@/lib/photoFrames';
import FramePreview, { type FramePhoto } from './FramePreview';
import { DEFAULT_FRAME_CROP, normalizeFrameCrop, validateFramePhoto, type FrameCrop } from './frameGeometry';
import { exportFramePhoto } from './frameExport';
import { exportSvgPreview } from '@/lib/svgExport';

interface Props {
  product: Product;
  signedIn: boolean;
  uploadPhoto: (blob: Blob) => Promise<string>;
  onAddToCart: (customization: NonNullable<CartItem['customization']>, quantity: number) => void;
  suggestionsField?: ReactNode;
}

export default function PhotoFrameCustomizer({ product, signedIn, uploadPhoto, onAddToCart, suggestionsField }: Props) {
  const [step, setStep] = useState<'edit' | 'size'>('edit');
  const [orientation, setOrientation] = useState<FrameOrientation>('portrait');
  const [sizeId, setSizeId] = useState(PHOTO_FRAME_SIZES[0].id);
  const [photo, setPhoto] = useState<(FramePhoto & { file: File }) | null>(null);
  const [crop, setCrop] = useState<FrameCrop>(DEFAULT_FRAME_CROP);
  const [quantity, setQuantity] = useState(1);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  const uploadRequest = useRef(0);
  const originalUpload = useRef<{ file: File; url: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const savedPreview = useRef<SVGSVGElement>(null);
  const size = PHOTO_FRAME_SIZES.find((option) => option.id === sizeId) ?? PHOTO_FRAME_SIZES[0];
  const dimensions = frameDimensions(size, orientation);
  const price = framePrice(product, sizeId);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => { heading.current?.focus(); }, [step]);

  const changeCrop = useCallback((next: FrameCrop) => {
    setCrop(normalizeFrameCrop(next)); setAdded(false);
  }, []);

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy.current) return;
    const request = ++uploadRequest.current;
    const validation = validateFramePhoto(file);
    if (validation) { setError(validation); setLoadingPhoto(false); return; }
    setLoadingPhoto(true); setError(null);
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      if (request !== uploadRequest.current || !mounted.current) { URL.revokeObjectURL(url); return; }
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('This photo could not be decoded. Please choose another image.');
      setPhoto({ url, file, width: image.naturalWidth, height: image.naturalHeight });
      originalUpload.current = null;
      changeCrop(DEFAULT_FRAME_CROP);
    } catch {
      URL.revokeObjectURL(url);
      if (mounted.current && request === uploadRequest.current) setError('Could not open this photo. Please try another JPG, PNG or WebP image.');
    } finally {
      if (mounted.current && request === uploadRequest.current) setLoadingPhoto(false);
    }
  }

  async function addFrameToCart() {
    if (!photo || step !== 'size' || busy.current) return;
    if (!signedIn) { setError('Please sign in using the account menu, then add your frame to the cart.'); return; }
    busy.current = true; setSaving(true); setError(null); setAdded(false);
    try {
      const blob = await exportFramePhoto(photo.url, dimensions, crop);
      let originalUrl = originalUpload.current?.file === photo.file ? originalUpload.current.url : null;
      if (!originalUrl) {
        originalUrl = await uploadPhoto(photo.file);
        originalUpload.current = { file: photo.file, url: originalUrl };
      }
      const croppedUrl = await uploadPhoto(blob);
      if (!savedPreview.current) throw new Error('The frame preview is not ready.');
      const previewUrl = await uploadPhoto(await exportSvgPreview(savedPreview.current));
      if (!mounted.current) return;
      onAddToCart({
        customization_type: 'matte_photo_frame', page_count: null, magnet_shape: null,
        images: [previewUrl], original_images: [originalUrl], production_images: [croppedUrl], unit_price: price,
        frame_size: `${dimensions.width} × ${dimensions.height} inches`,
        frame_orientation: orientation, frame_color: 'black',
        frame_design: {
          version: 1, size_id: sizeId, width_inches: dimensions.width, height_inches: dimensions.height,
          original_url: originalUrl, image_width: photo.width, image_height: photo.height, crop,
        },
      }, quantity);
      setAdded(true);
    } catch {
      if (mounted.current) setError('Your frame could not be uploaded. Check your connection and sign-in, then try again. Your edits are still here.');
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section className="mt-6" aria-label="Photo Frames customization">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Make it yours</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{product.name}</h1>
          <p className="mt-2 text-sm text-slate-500">A favourite moment. A frame that fits.</p>
        </div>
        <ol className="flex items-center gap-3 text-sm" aria-label="Customization progress">
          <li aria-current={step === 'edit' ? 'step' : undefined} className={step === 'edit' ? 'font-semibold text-blue-600' : 'text-slate-500'}>1. Adjust photo</li>
          <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <li aria-current={step === 'size' ? 'step' : undefined} className={step === 'size' ? 'font-semibold text-blue-600' : 'text-slate-500'}>2. Select size</li>
        </ol>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} className="sr-only" aria-label="Upload photo for your frame" disabled={saving || loadingPhoto} />
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <fieldset disabled={saving} className="min-w-0">
        <legend className="sr-only">Customize your photo frame</legend>
        {step === 'edit' ? (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
              <div className="flex flex-wrap gap-8">
                <div>
                  <h2 ref={heading} tabIndex={-1} className="mb-2 text-xs font-bold uppercase text-slate-700">Select orientation</h2>
                  <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Select orientation">
                    {(['portrait', 'landscape'] as const).map((value) => (
                      <button key={value} type="button" aria-pressed={orientation === value} onClick={() => { setOrientation(value); setAdded(false); }} className={`flex min-w-24 flex-col items-center gap-1 rounded-lg px-4 py-2 text-xs capitalize ${orientation === value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>
                        <span aria-hidden="true" className={`block rounded-sm border-2 border-current ${value === 'portrait' ? 'h-4 w-3' : 'h-3 w-4 my-0.5'}`} />{value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" disabled={!photo || loadingPhoto} onClick={() => { setStep('size'); setError(null); }} className={primaryButton}>Save &amp; Select Size <ArrowRight className="h-5 w-5" /></button>
            </div>
            <FramePreview photo={photo} dimensions={dimensions} crop={crop} editable={!loadingPhoto} onCropChange={changeCrop} onSelectPhoto={() => inputRef.current?.click()} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <button type="button" disabled={loadingPhoto} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 disabled:opacity-50">
                {loadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{loadingPhoto ? 'Opening photo…' : photo ? 'Replace photo' : 'Upload photo'}
              </button>
              <label className="flex items-center gap-3 text-sm text-slate-600">Zoom
                <input type="range" aria-label="Photo zoom" min="1" max="4" step="0.01" value={crop.zoom} disabled={!photo || loadingPhoto} onChange={(event) => changeCrop({ ...crop, zoom: Number(event.target.value) })} className="w-28 accent-blue-600 sm:w-40" />
                <span className="w-12 tabular-nums">{Math.round(crop.zoom * 100)}%</span>
              </label>
              <button type="button" disabled={!photo || loadingPhoto} onClick={() => changeCrop(DEFAULT_FRAME_CROP)} className="inline-flex items-center gap-1.5 text-sm text-slate-600 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Reset to fit</button>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500"><Move className="h-4 w-4 shrink-0" />Drag to position • Scroll over the photo to zoom • Use the slider on touch screens. Keyboard: focus the photo, then use arrow keys to move, + / − to zoom, Home to reset. JPG, PNG or WebP, up to 10 MB.</p>
            {suggestionsField && <div className="mt-5">{suggestionsField}</div>}
          </>
        ) : (
          <div className="grid items-start gap-7 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex justify-end"><button type="button" onClick={() => { setStep('edit'); setAdded(false); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-blue-500"><Pencil className="h-4 w-4" />Edit Again</button></div>
              <FramePreview ref={savedPreview} photo={photo} dimensions={dimensions} crop={crop} showDimensions />
              <p className="mt-3 text-center text-xs text-slate-500">Proportional preview · Dimensions shown in inches</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold uppercase text-slate-900">Matte Photo Frame</h2>
              <p className="mt-4 border-y border-slate-100 py-4 text-3xl font-bold text-teal-600">{formatINR(price)}</p>
              <p className="mb-3 mt-5 text-sm font-semibold uppercase text-slate-700">Size <span className="normal-case text-blue-600">(inches)</span></p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Frame size in inches">
                {PHOTO_FRAME_SIZES.map((option) => (
                  <button key={option.id} type="button" aria-pressed={sizeId === option.id} onClick={() => { setSizeId(option.id); setAdded(false); }} className={`rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${sizeId === option.id ? 'border-blue-500 bg-blue-50 text-blue-600 ring-1 ring-blue-500' : 'border-slate-300 text-slate-700 hover:border-blue-400'}`}>{option.width}×{option.height}</button>
                ))}
              </div>
              <div aria-live="polite" className="mt-4 space-y-1 text-sm text-slate-600">
                <p className="capitalize">Orientation: {orientation}</p>
                <p>Selected size: {dimensions.width} × {dimensions.height} inches</p>
                <p>Width: {dimensions.width}&quot; · Height: {dimensions.height}&quot;</p>
                <p>Frame colour: Black</p>
              </div>
              <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">Your photo automatically fills each size. Check the crop in this preview; choose “Edit Again” to fine-tune it for your selected size.</p>
              <label className="mt-5 flex items-center justify-between gap-4 text-sm font-medium text-slate-700">Quantity
                <select value={quantity} onChange={(event) => { setQuantity(Number(event.target.value)); setAdded(false); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2">{Array.from({ length: 10 }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select>
              </label>
              {suggestionsField && <div className="mt-5">{suggestionsField}</div>}
              <button type="button" onClick={addFrameToCart} disabled={!photo || saving || added} className={`${primaryButton} mt-5 w-full`}>
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                {saving ? 'Saving your frame…' : added ? 'Added to cart' : `Add to cart · ${formatINR(price * quantity)}`}
              </button>
              <p role="status" className="mt-3 text-sm text-teal-700">{added ? 'Your photo, crop and frame choices have been added to the cart.' : ''}</p>
              {!signedIn && <p className="mt-3 text-xs text-slate-500">You can customize now. Sign in before adding your frame to the cart.</p>}
            </div>
          </div>
        )}
      </fieldset>
    </section>
  );
}