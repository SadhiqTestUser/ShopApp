import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ImagePlus, Type, LayoutGrid, Plus, Minus, Check, Loader2, ShoppingCart, Sparkles, AlertCircle } from 'lucide-react';
import {
  getMugType, quantityUnitPrice, QUANTITY_TIERS, MUG_DESIGNS, DESIGN_CATEGORIES, type MugDesign,
} from '@/lib/mugs';
import { formatINR } from '@/lib/currency';
import MugWrap from './MugWrap';
import MugPreviewPanel from './MugPreviewPanel';
import MugDesignHelp from './MugDesignHelp';
import { useMugArtwork } from './useMugArtwork';
import { photoDpi, readMugPhoto } from './mugEditing';
import {
  PhotoSlotPanel, TextSlotPanel, MugTypePicker, MugAppearancePicker,
} from './MugControls';
import { defaultPhotoState, initConfig, type MugConfig, type PhotoState, type TextState } from './mugState';

interface MugEditorStudioProps {
  design: MugDesign;
  config: MugConfig;
  onConfigChange: (config: MugConfig) => void;
  onBack: () => void;
  onDesignChange: (design: MugDesign) => void;
  onAddToCart: () => void;
  adding: boolean;
  added: boolean;
  cartError: string | null;
  saveWarning: boolean;
  suggestionsField?: ReactNode;
  onArtworkChange?: (canvas: HTMLCanvasElement | null) => void;
}

export default function MugEditorStudio({
  design, config, onConfigChange, onBack, onDesignChange, onAddToCart, adding, added, cartError, saveWarning, suggestionsField, onArtworkChange,
}: MugEditorStudioProps) {
  const photoSlots = design.slots.filter((s) => s.type === 'photo');
  const textSlots = design.slots.filter((s) => s.type === 'text');
  const [activeSlotId, setActiveSlotId] = useState<string>((photoSlots[0] ?? textSlots[0])?.id ?? '');
  const [tab, setTab] = useState<'photo' | 'text' | 'templates'>(photoSlots.length ? 'photo' : 'text');
  const [category, setCategory] = useState('All');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const latestConfig = useRef(config);
  latestConfig.current = config;
  const uploadSequence = useRef(0);
  useEffect(() => () => { uploadSequence.current++; }, []);
  const artwork = useMugArtwork(design, config);
  useEffect(() => {
    onArtworkChange?.(!artwork.loading && !artwork.error ? artwork.canvas : null);
    return () => onArtworkChange?.(null);
  }, [artwork.canvas, artwork.error, artwork.loading, artwork.revision, onArtworkChange]);

  const mugType = getMugType(config.mugTypeId);
  const unitPrice = quantityUnitPrice(mugType.price, config.quantity);
  const mrp = mugType.mrp;
  const totalPrice = unitPrice * config.quantity;
  const hasPhotos = photoSlots.every((s) => config.photos[s.id]?.url);
  const photoCount = photoSlots.filter((s) => config.photos[s.id]?.url).length;
  const lowResolution = photoSlots.some((slot) => {
    const dpi = photoDpi(config.photos[slot.id], slot);
    return dpi !== null && dpi < 150;
  });

  function patchPhoto(id: string, partial: Partial<PhotoState>) {
    onConfigChange({ ...config, photos: { ...config.photos, [id]: { ...config.photos[id], ...partial } } });
  }
  function patchText(id: string, partial: Partial<TextState>) {
    onConfigChange({ ...config, texts: { ...config.texts, [id]: { ...config.texts[id], ...partial } } });
  }
  async function uploadPhoto(id: string, file: File) {
    const sequence = ++uploadSequence.current;
    setUploadError(null);
    setUploading(true);
    try {
      const photo = await readMugPhoto(file);
      if (sequence !== uploadSequence.current) return;
      const current = latestConfig.current;
      onConfigChange({ ...current, photos: { ...current.photos, [id]: { ...defaultPhotoState(), ...photo } } });
    } catch (error) {
      if (sequence === uploadSequence.current) setUploadError(error instanceof Error ? error.message : 'Unable to upload this photo.');
    } finally {
      if (sequence === uploadSequence.current) setUploading(false);
    }
  }
  function setQty(delta: number) {
    onConfigChange({ ...config, quantity: Math.max(1, config.quantity + delta) });
  }

  const activeSlot = design.slots.find((s) => s.id === activeSlotId);
  function selectSlot(id: string) {
    setActiveSlotId(id);
    const slot = design.slots.find((item) => item.id === id);
    if (slot) setTab(slot.type);
  }
  function selectTab(next: typeof tab) {
    setTab(next);
    if (next !== 'templates') setActiveSlotId(design.slots.find((slot) => slot.type === next)?.id ?? '');
  }

  return (
    <div className="mt-6 space-y-5 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-teal-600">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} disabled={adding} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-600"><ArrowLeft className="w-4 h-4" /> Design gallery</button>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700"><Sparkles className="w-3.5 h-3.5" /> Made personal, by you</span>
      </div>
      {saveWarning && <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Your browser could not save this draft. Keep this page open until you add your mug to the cart.</p>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
      <div className="min-w-0 space-y-3 lg:sticky lg:top-6">
        <MugPreviewPanel design={design} config={config} mugType={mugType} artwork={artwork} activeSlotId={activeSlotId} onSelectSlot={selectSlot} onPhotoChange={patchPhoto} />
        <div role="status" className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs leading-relaxed ${lowResolution || artwork.error ? 'bg-amber-50 text-amber-800' : 'bg-teal-50 text-teal-800'}`}>
          {lowResolution || artwork.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{artwork.error ?? (lowResolution ? 'A photo may look soft in print. Try a larger image or reduce its zoom.' : photoSlots.length ? `${photoCount} of ${photoSlots.length} photos added. Review every angle before ordering.` : 'Text-only design. Check your spelling and review every angle before ordering.')}</span>
        </div>
      </div>
      <div className="min-w-0 space-y-4">
      <fieldset disabled={adding} className="min-w-0 space-y-4 disabled:opacity-70">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 pt-5 pb-4"><p className="text-[10px] font-bold tracking-[0.16em] uppercase text-teal-600">Personalization studio</p><h2 className="mt-1 text-xl font-bold text-slate-900">Make it yours</h2><p className="mt-1 text-xs text-slate-500">{design.name} · {mugType.label}</p></div>
        <div role="group" aria-label="Editing tools" className="grid grid-cols-3 border-y border-slate-100 bg-slate-50/70 p-1.5 gap-1">
          {([{ id: 'photo', label: 'Photos', icon: ImagePlus }, { id: 'text', label: 'Text', icon: Type }, { id: 'templates', label: 'Templates', icon: LayoutGrid }] as const).map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} aria-pressed={tab === id} onClick={() => selectTab(id)} className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold ${tab === id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}><Icon className="w-4 h-4" />{label}</button>
          ))}
        </div>
        <div className="p-5 space-y-4">
          {tab === 'templates' ? (
            <>
              <label className="block text-xs font-medium text-slate-600">Browse templates
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm">{DESIGN_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <p className="text-xs text-slate-500">Matching photos and text carry over. Review their placement in the new layout.</p>
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto p-1">
                {MUG_DESIGNS.filter((item) => category === 'All' || item.category === category).map((item) => (
                  <button type="button" key={item.id} aria-pressed={design.id === item.id} onClick={() => onDesignChange(item)} className={`min-w-0 overflow-hidden rounded-lg border p-2 text-left ${design.id === item.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'}`}>
                    <MugWrap design={item} config={initConfig(item, 'regular', '#ffffff', 'round')} width={220} />
                    <span className="mt-2 block truncate text-[11px] font-medium text-slate-700">{item.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(tab === 'photo' ? photoSlots : textSlots).map((slot, index) => (
                  <button type="button" key={slot.id} aria-pressed={activeSlotId === slot.id} onClick={() => selectSlot(slot.id)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium ${activeSlotId === slot.id ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600'}`}>
                    {tab === 'photo' ? 'Photo' : 'Text'} {index + 1}{tab === 'photo' && config.photos[slot.id]?.url && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
              {!(tab === 'photo' ? photoSlots : textSlots).length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">This template has no {tab === 'photo' ? 'photo' : 'text'} areas. Choose a different layout in Templates.</p>}
              {tab === 'photo' && activeSlot?.type === 'photo' && <PhotoSlotPanel photo={config.photos[activeSlot.id]} onUpload={(file) => void uploadPhoto(activeSlot.id, file)} onChange={(partial) => patchPhoto(activeSlot.id, partial)} />}
              {tab === 'text' && activeSlot?.type === 'text' && <TextSlotPanel text={config.texts[activeSlot.id]} slot={activeSlot} onChange={(partial) => patchText(activeSlot.id, partial)} />}
              {uploading && <p role="status" className="flex items-center gap-2 text-xs text-teal-700"><Loader2 className="w-4 h-4 animate-spin" /> Reading your photo…</p>}
              {uploadError && <p role="alert" className="text-xs text-red-600">{uploadError}</p>}
            </>
          )}
        </div>
      </section>
      {/* Mug type + appearance */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div>
          <span className="block text-xs font-medium text-slate-500 mb-2">Mug Type</span>
          <MugTypePicker activeId={config.mugTypeId} onSelect={(id) => { const type = getMugType(id); onConfigChange({ ...config, mugTypeId: id, mugColor: type.baseColor, handleStyle: type.handles.find((handle) => handle === config.handleStyle) ?? type.handles[0] }); }} />
          <p className="mt-2 text-xs text-slate-500">{mugType.description}</p>
        </div>
        <MugAppearancePicker
          type={mugType} handleStyle={config.handleStyle}
          onHandle={(h) => onConfigChange({ ...config, handleStyle: h })}
        />
      </div>
      </fieldset>
      <MugDesignHelp />
      {/* Pricing + quantity */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Quantity</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Decrease quantity" disabled={config.quantity <= 1 || adding} onClick={() => setQty(-1)} className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center"><Minus className="w-3.5 h-3.5 text-slate-600" /></button>
            <span className="w-8 text-center text-sm font-semibold text-slate-900">{config.quantity}</span>
            <button type="button" aria-label="Increase quantity" disabled={adding} onClick={() => setQty(1)} className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-slate-600" /></button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Price each</span>
          <span className="flex items-baseline gap-2">
            {mrp > unitPrice && <span className="text-slate-400 line-through">{formatINR(mrp)}</span>}
            <span className="font-semibold text-slate-900">{formatINR(unitPrice)}</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Total</span>
          <span className="text-xl font-bold text-teal-600">{formatINR(totalPrice)}</span>
        </div>
        <p className="text-xs text-slate-500">Shipping calculated at checkout.</p>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {QUANTITY_TIERS.map((t) => (
            <span key={t.minQty} className={`text-xs px-2 py-1 rounded-full ${config.quantity >= t.minQty ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{t.label} → {t.off}</span>
          ))}
        </div>
      </div>

      {suggestionsField && <fieldset disabled={adding} className="min-w-0">{suggestionsField}</fieldset>}
      <button
        type="button" onClick={onAddToCart} disabled={!hasPhotos || adding || added || uploading || artwork.loading || !!artwork.error}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : added ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
        {adding ? 'Adding…' : added ? 'Added to Cart' : hasPhotos ? 'Add to Cart' : 'Upload all photos to continue'}
      </button>
      {cartError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{cartError}</p>}
      </div>
      </div>
    </div>
  );
}
