import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { switchMugDesign } from './mugEditing';
import {
  getDesign, getMugType, quantityUnitPrice, type MugDesign,
} from '@/lib/mugs';
import MugGallerySelector from './MugGallerySelector';
import MugEditorStudio from './MugEditorStudio';
import {
  initConfig, saveConfig, loadConfig, clearConfig, normalizeMugOptions, type MugConfig, type PhotoState,
} from './mugState';

export default function MugCustomizer({
  onAddToCart, suggestionsField,
}: {
  onAddToCart: (customization: Record<string, unknown>, totalQty: number, unitPrice: number) => void;
  suggestionsField?: ReactNode;
}) {
  const { user } = useAuth();
  const [design, setDesign] = useState<MugDesign | null>(null);
  const [config, setConfig] = useState<MugConfig | null>(null);
  const [saved, setSaved] = useState<MugConfig | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState(false);
  const drafts = useRef(new Map<string, MugConfig>());
  const artworkCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setSaved(loadConfig());
  }, []);

  function start(d: MugDesign) {
    const type = getMugType('regular');
    const cfg = initConfig(d, type.id, type.baseColor, type.handles[0]);
    setDesign(d);
    setConfig(cfg);
    setSaveWarning(!saveConfig(cfg));
    setSaved(null);
    setCartError(null);
  }

  function resume() {
    if (!saved) return;
    setDesign(getDesign(saved.designId));
    setConfig(saved);
    setSaved(null);
  }

  function startFresh() {
    clearConfig();
    setSaved(null);
  }

  function updateConfig(cfg: MugConfig) {
    if (adding) return;
    const next = normalizeMugOptions(cfg);
    setConfig(next);
    setSaveWarning(!saveConfig(next));
    setCartError(null);
    setAdded(false);
  }

  function changeDesign(next: MugDesign) {
    if (!config || !design || design.id === next.id || adding) return;
    drafts.current.set(design.id, config);
    const cached = drafts.current.get(next.id);
    const nextConfig = cached
      ? { ...cached, mugTypeId: config.mugTypeId, mugColor: config.mugColor, handleStyle: config.handleStyle, quantity: config.quantity }
      : switchMugDesign(config, design, next);
    setDesign(next);
    updateConfig(nextConfig);
  }

  function backToGallery() {
    setSaved(config);
    setDesign(null);
    setConfig(null);
  }

  async function uploadBlob(blob: Blob): Promise<string> {
    if (!user) throw new Error('Please sign in to save your mug design.');
    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const name = `${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const fileRef = storageRef(storage, `customization-uploads/${name}`);
    await uploadBytes(fileRef, blob);
    return getDownloadURL(fileRef);
  }

  async function uploadPhoto(p: PhotoState): Promise<string> {
    if (!p.url) return '';
    // Persist originals plus transforms, not filtered photos that would be
    // filtered a second time when recreating the customer's design.
    const response = await fetch(p.url);
    if (!response.ok) throw new Error('Could not prepare your photo.');
    return uploadBlob(await response.blob());
  }

  async function handleAddToCart() {
    if (!design || !config || adding || added) return;
    if (design.slots.some((slot) => slot.type === 'photo' && !config.photos[slot.id]?.url)) return;
    setAdding(true);
    setCartError(null);
    try {
      const photoSlots = design.slots.filter((s) => s.type === 'photo');
      const originalImages: string[] = [];
      const photos = { ...config.photos };
      for (const slot of photoSlots) {
        const p = config.photos[slot.id];
        if (p?.url) {
          const url = await uploadPhoto(p);
          originalImages.push(url);
          photos[slot.id] = { ...p, url };
        }
      }
      const texts = design.slots
        .filter((s) => s.type === 'text')
        .map((s) => config.texts[s.id]?.text?.trim())
        .filter((t): t is string => !!t);
      const type = getMugType(config.mugTypeId);
      const unitPrice = quantityUnitPrice(type.price, config.quantity);
      if (!artworkCanvas.current) throw new Error('The mug preview is not ready.');
      const previewBlob = await new Promise<Blob>((resolve, reject) => artworkCanvas.current!.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Could not save the mug preview.')),
        'image/jpeg', 0.92,
      ));
      const previewUrl = await uploadBlob(previewBlob);

      onAddToCart(
        {
          customization_type: 'mug',
          page_count: null,
          magnet_shape: null,
          images: [previewUrl],
          original_images: originalImages,
          unit_price: unitPrice,
          mug_type: type.id,
          mug_type_label: type.label,
          mug_color: type.baseColor,
          handle_style: config.handleStyle,
          design_id: design.id,
          design_name: design.name,
          mug_texts: texts,
          mug_config: { ...normalizeMugOptions(config), photos },
          mug_design: design,
        },
        config.quantity,
        unitPrice,
      );
      clearConfig();
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      setCartError('We could not add your mug. Your design is still here; please check your connection and try again.');
    } finally {
      setAdding(false);
    }
  }

  if (design && config) {
    return (
      <MugEditorStudio
        key={design.id} design={design} config={config} onConfigChange={updateConfig}
        onDesignChange={changeDesign} cartError={cartError} saveWarning={saveWarning}
        onBack={backToGallery} onAddToCart={handleAddToCart} adding={adding} added={added}
        suggestionsField={suggestionsField}
        onArtworkChange={(canvas) => { artworkCanvas.current = canvas; }}
      />
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {saved && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-teal-800">
            <Sparkles className="w-4 h-4" />
            <span>You have an unfinished <strong>{getDesign(saved.designId).name}</strong> design.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={resume} className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">Resume</button>
            <button onClick={startFresh} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium">
              <RotateCcw className="w-3.5 h-3.5" /> Start Fresh
            </button>
          </div>
        </div>
      )}
      <MugGallerySelector onStart={start} />
      {suggestionsField}
    </div>
  );
}
