import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ImagePlus, Loader2, Pencil, RotateCcw, ShoppingCart, Upload, ZoomIn } from 'lucide-react';
import PhotoEditorModal, { type EditableImage } from '@/components/PhotoEditorModal';
import type { CartItem } from '@/context/CartContext';
import { exportCropped, loadImage } from '@/lib/imageEdit';
import type { Product } from '@/types';

const WOODEN_PAD_IMAGE = '/stationery/pads/5a7b6026-10d9-4402-bff8-82021ea5869c.png';
const ACRYLIC_TEMPLATE_PREVIEWS = [
  'https://cdn.printshoppy.com/image/catalog/acrylic-writing-pads/jpg/acrylic-writing-pads-preview-1.jpg',
  'https://cdn.printshoppy.com/image/catalog/acrylic-writing-pads/jpg/acrylic-writing-pads-preview-2.jpg',
  'https://cdn.printshoppy.com/image/catalog/acrylic-writing-pads/jpg/acrylic-writing-pads-preview-3.jpg',
];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const WOODEN_IMAGE_SIZE = { width: 1122, height: 1402 };
const WOODEN_AREA = { left: 0.169, top: 0.112, width: 0.56, height: 0.807 };
const ACRYLIC_AREA = { left: 0.35, top: 0.24, width: 0.30, height: 0.30 };
const ACRYLIC_DESIGNS = [
  { label: 'School ABC', background: 'bg-[#ffe14d]', accent: 'text-blue-600' },
  { label: 'Orange Play', background: 'bg-[#f18b2f]', accent: 'text-white' },
  { label: 'Rainbow', background: 'bg-[#fffdf8]', accent: 'text-pink-600' },
] as const;
type PadMaterial = 'wooden' | 'acrylic';

interface Props {
  product: Product;
  signedIn: boolean;
  suggestionsField?: ReactNode;
  uploadPhoto: (blob: Blob) => Promise<string>;
  onAddToCart: (customization: CartItem['customization'], totalQty: number) => void;
  onBuyNow: (customization: CartItem['customization'], totalQty: number) => void;
}

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function imageArea(material: PadMaterial) {
  return material === 'wooden' ? WOODEN_AREA : ACRYLIC_AREA;
}

export default function StationeryPadCustomizer({
  product,
  signedIn,
  suggestionsField,
  uploadPhoto,
  onAddToCart,
  onBuyNow,
}: Props) {
  const [material, setMaterial] = useState<PadMaterial>('wooden');
  const [acrylicTemplateIndex, setAcrylicTemplateIndex] = useState(0);
  const [childName, setChildName] = useState('');
  const [image, setImage] = useState<EditableImage | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingCart, setSavingCart] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const photoFrameRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (image?.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
  }, [image?.url]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!signedIn) {
      setError('Please sign in before uploading a photo.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Each image must be smaller than 10MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPhoto(file);
      setImage({ id: makeId(), url, name: file.name, blob: file });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveEdit(_index: number, blob: Blob) {
    setSavingEdit(true);
    setError(null);
    try {
      const url = await uploadPhoto(blob);
      setImage((current) => current ? { ...current, url, blob } : current);
      setEditorOpen(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your edits. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || !photoFrameRef.current) return;
    const bounds = photoFrameRef.current.getBoundingClientRect();
    const maxX = bounds.width * (0.12 + (zoom - 1) * 0.48);
    const maxY = bounds.height * (0.12 + (zoom - 1) * 0.48);
    setOffset({
      x: Math.max(-maxX, Math.min(maxX, drag.ox + event.clientX - drag.x)),
      y: Math.max(-maxY, Math.min(maxY, drag.oy + event.clientY - drag.y)),
    });
  }

  function resetPosition() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  async function buildPrintImage(): Promise<string> {
    if (!image?.blob) throw new Error('Please upload a photo before continuing.');
    const source = URL.createObjectURL(image.blob);
    try {
      const decoded = await loadImage(source);
      const area = imageArea(material);
      const frameWidth = 1000;
      const frameHeight = material === 'acrylic' ? frameWidth : frameWidth * (area.height / area.width);
      const baseScale = Math.max(frameWidth / decoded.naturalWidth, frameHeight / decoded.naturalHeight);
      const scale = baseScale * zoom;
      const displayedWidth = decoded.naturalWidth * scale;
      const displayedHeight = decoded.naturalHeight * scale;
      const displayOffsetX = offset.x / (photoFrameRef.current?.getBoundingClientRect().width ?? frameWidth) * frameWidth;
      const displayOffsetY = offset.y / (photoFrameRef.current?.getBoundingClientRect().height ?? frameHeight) * frameHeight;
      const left = (frameWidth - displayedWidth) / 2 + displayOffsetX;
      const top = (frameHeight - displayedHeight) / 2 + displayOffsetY;
      const crop = {
        sx: Math.max(0, Math.min(-left / scale, decoded.naturalWidth - 1)),
        sy: Math.max(0, Math.min(-top / scale, decoded.naturalHeight - 1)),
        sw: Math.min(frameWidth / scale, decoded.naturalWidth),
        sh: Math.min(frameHeight / scale, decoded.naturalHeight),
      };
      return uploadPhoto(await exportCropped(source, crop, 0, { brightness: 1, contrast: 1, saturation: 1 }));
    } finally {
      URL.revokeObjectURL(source);
    }
  }

  async function saveCustomization(buyNow: boolean) {
    if (!image) {
      setError('Add a photo to your pad before continuing.');
      return;
    }
    if (savingCart) return;
    setSavingCart(true);
    setError(null);
    try {
      const printImage = await buildPrintImage();
      const customization: CartItem['customization'] = {
        customization_type: 'stationery_pad',
        page_count: null,
        magnet_shape: null,
        pad_material: material,
        material_label: material === 'wooden' ? 'MDF Wooden Pad' : 'Acrylic Writing Pad',
        pad_size: 'A4',
        images: [printImage],
        original_images: [image.url],
        production_images: [printImage],
        child_name: material === 'acrylic' ? childName.trim() : null,
        unit_price: product.price,
      };
      (buyNow ? onBuyNow : onAddToCart)(customization, 1);
      if (!buyNow) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2200);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your pad design. Please try again.');
    } finally {
      setSavingCart(false);
    }
  }

  const area = imageArea(material);
  const previewImage = material === 'wooden' ? WOODEN_PAD_IMAGE : null;
  const acrylicDesign = ACRYLIC_DESIGNS[acrylicTemplateIndex];
  const previewRatio = material === 'wooden' ? `${WOODEN_IMAGE_SIZE.width} / ${WOODEN_IMAGE_SIZE.height}` : '4 / 3';

  return (
    <div className="mt-7 space-y-6">
      {editorOpen && image && (
        <PhotoEditorModal
          images={[image]}
          index={0}
          saving={savingEdit}
          onClose={() => setEditorOpen(false)}
          onNavigate={() => undefined}
          onSave={handleSaveEdit}
        />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">Build your pad</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Choose your finish</h2>
            <p className="mt-1 text-sm text-slate-500">A4 size · one photo · live placement preview</p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-bold text-teal-700">₹{product.price}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {([['wooden', 'MDF Wooden Pad', 'Warm matte finish · selected by default'], ['acrylic', 'Acrylic Writing Pad', 'Glossy template design · Printshoppy-style editor']] as const).map(([value, label, detail]) => (
            <button key={value} type="button" onClick={() => setMaterial(value)} className={`rounded-xl border-2 p-4 text-left transition-all ${material === value ? 'border-teal-600 bg-teal-50 shadow-sm' : 'border-slate-200 hover:border-teal-300'}`}>
              <span className="flex items-center justify-between gap-3 font-semibold text-slate-900"><span>{label}</span>{material === value && <Check className="h-4 w-4 text-teal-600" />}</span>
              <span className="mt-1 block text-xs text-slate-500">{detail}</span>
            </button>
          ))}
        </div>
      </section>

      {material === 'acrylic' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Choose a template</h3><p className="mt-1 text-xs text-slate-500">Start with a ready-made acrylic design.</p></div><button type="button" onClick={() => previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600">Preview →</button></div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {ACRYLIC_TEMPLATE_PREVIEWS.map((url, index) => (
              <button key={url} type="button" onClick={() => setAcrylicTemplateIndex(index)} className={`overflow-hidden rounded-xl border-2 bg-slate-50 text-left transition-all ${index === acrylicTemplateIndex ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200 hover:border-sky-300'}`}>
                <img src={url} alt={`Acrylic template ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                <span className="flex items-center justify-between bg-sky-500 px-3 py-2 text-xs font-bold text-white"><span>{ACRYLIC_DESIGNS[index].label}</span><span>Start Design →</span></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section ref={previewSectionRef} className={`rounded-2xl border border-slate-200 p-4 shadow-sm sm:p-6 ${material === 'acrylic' ? 'bg-slate-200' : 'bg-amber-50/70'}`}>
          <div className="mx-auto max-w-[560px] overflow-hidden rounded-2xl shadow-xl" style={{ aspectRatio: previewRatio }}>
            <div className="relative h-full w-full">
              {previewImage ? <img src={previewImage} alt="MDF wooden pad preview" className="absolute inset-0 h-full w-full object-cover" /> : (
                <div className="absolute inset-0 bg-slate-200">
                  <div
                    className={`absolute left-[18%] top-[5%] h-[90%] w-[64%] overflow-hidden rounded-[4%] bg-cover bg-center shadow-xl ${acrylicDesign.background}`}
                    style={{ backgroundImage: `url(${ACRYLIC_TEMPLATE_PREVIEWS[acrylicTemplateIndex]})` }}
                  />
                </div>
              )}
              <div
                ref={photoFrameRef}
                className={`absolute overflow-hidden bg-slate-100/90 ${material === 'acrylic' ? 'rounded-full border-4 border-white/90 shadow-lg' : 'rounded-[3%] border border-white/70 shadow-inner'}`}
                style={{ left: `${area.left * 100}%`, top: `${area.top * 100}%`, width: `${area.width * 100}%`, height: material === 'acrylic' ? undefined : `${area.height * 100}%`, aspectRatio: material === 'acrylic' ? '1 / 1' : undefined, touchAction: 'none', cursor: image ? 'grab' : 'default' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={() => setDrag(null)}
                onPointerCancel={() => setDrag(null)}
              >
                {image ? <img src={image.url} alt="Your pad photo" draggable={false} className="h-full w-full select-none object-cover" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: 'center' }} /> : (
                  <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 text-center text-slate-500">
                    {uploading ? <Loader2 className="h-8 w-8 animate-spin text-teal-600" /> : <ImagePlus className="h-8 w-8 text-slate-400" />}
                    <span className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white shadow-sm">Add Image</span>
                    <span className="px-3 text-[11px]">Your photo stays inside this area</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                )}
              </div>
              {material === 'acrylic' && <div className="pointer-events-none absolute left-[27%] top-[66%] w-[46%] text-center text-sm font-semibold text-amber-900">{childName || 'Write Children Name'}</div>}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">Drag the photo inside the highlighted area. It cannot move outside the pad shape.</p>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-8">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900">Edit your photo</h3><span className="text-xs text-slate-400">1 photo</span></div>
          {!signedIn && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Please sign in to upload a photo.</p>}
          {!image ? (
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-4 text-sm font-semibold text-slate-600 transition hover:border-teal-400 hover:bg-teal-50/40">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-teal-600" /> : <Upload className="h-5 w-5 text-slate-400" />} Add Image
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading || !signedIn} />
            </label>
          ) : (
            <div className="mt-4 space-y-4">
              <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"><Pencil className="h-4 w-4" /> Open photo editor</button>
              <label className="block text-xs text-slate-500"><span className="mb-1 flex items-center justify-between"><span className="flex items-center gap-1"><ZoomIn className="h-3.5 w-3.5" /> Zoom</span><span>{zoom.toFixed(1)}×</span></span><input type="range" min="1" max="2.5" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-teal-600" /></label>
              <button type="button" onClick={resetPosition} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"><RotateCcw className="h-4 w-4" /> Reset placement</button>
            </div>
          )}
          {material === 'acrylic' && <label className="mt-5 block text-xs font-medium text-slate-600">Child name
            <span className="mt-1 flex overflow-hidden rounded-lg border-2 border-sky-500 bg-white focus-within:ring-2 focus-within:ring-sky-100"><span className="flex w-10 items-center justify-center bg-sky-500 text-sm font-bold text-white">T</span><input value={childName} onChange={(event) => setChildName(event.target.value)} maxLength={24} placeholder="Write Children Name" className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none" /></span>
          </label>}
          {suggestionsField}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="mt-6 border-t border-slate-100 pt-5"><div className="flex items-center justify-between text-sm"><span className="text-slate-500">{material === 'wooden' ? 'MDF Wooden' : 'Acrylic'} Pad · A4</span><span className="text-xl font-bold text-slate-900">₹{product.price}</span></div><div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col"><button type="button" onClick={() => saveCustomization(false)} disabled={!image || savingCart || added} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{savingCart ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}{savingCart ? 'Saving design…' : added ? 'Added to Cart' : 'Add to Cart'}</button><button type="button" onClick={() => saveCustomization(true)} disabled={!image || savingCart} className="flex-1 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">Buy Now</button></div></div>
        </aside>
      </div>
    </div>
  );
}
