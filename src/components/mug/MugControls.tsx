import type { ReactNode } from 'react';
import { Upload, ZoomIn, Sun, Contrast, Droplets, RotateCcw, MoveHorizontal, MoveVertical } from 'lucide-react';
import {
  MUG_FONTS, TEXT_COLORS, MUG_TYPES, type MugType, type DesignSlot,
} from '@/lib/mugs';
import { formatINR } from '@/lib/currency';
import { defaultPhotoState, type PhotoState, type TextState } from './mugState';

export function Slider({
  label, icon, value, min, max, step, onChange,
}: {
  label: string; icon: ReactNode; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">{icon}{label}<span className="ml-auto tabular-nums text-slate-400">{Number(value.toFixed(2))}</span></span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-teal-600"
      />
    </label>
  );
}

// Panel shown when a photo slot is selected: upload, zoom and image adjustments.
export function PhotoSlotPanel({
  photo, onUpload, onChange,
}: {
  photo: PhotoState;
  onUpload: (file: File) => void;
  onChange: (partial: Partial<PhotoState>) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/50 px-4 py-6 text-center hover:border-teal-400 focus-within:ring-2 focus-within:ring-teal-500">
        {photo.url ? <img src={photo.url} alt="Uploaded photo" className="w-16 h-16 rounded-lg object-cover shadow-sm" /> : <span className="rounded-xl bg-white p-3 text-teal-600 shadow-sm"><Upload className="w-6 h-6" /></span>}
        <span className="text-sm font-semibold text-teal-800">
          {photo.url ? 'Replace your photo' : 'Upload your favourite photo'}
        </span>
        <span className="text-[11px] text-slate-500">JPG, PNG or WebP · up to 12 MB</span>
        <input
          type="file" accept="image/jpeg,image/png,image/webp" aria-label={photo.url ? 'Replace photo' : 'Upload photo'} className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ''; }}
        />
      </label>
      {photo.url && (
        <>
          <p className="text-xs text-slate-500">Drag your photo on the flat wrap, or use the position sliders.</p>
          <Slider label="Zoom" icon={<ZoomIn className="w-3.5 h-3.5" />} value={photo.zoom} min={1} max={3} step={0.01} onChange={(v) => onChange({ zoom: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Horizontal" icon={<MoveHorizontal className="w-3.5 h-3.5" />} value={photo.offsetX} min={-100} max={100} step={1} onChange={(v) => onChange({ offsetX: v })} />
            <Slider label="Vertical" icon={<MoveVertical className="w-3.5 h-3.5" />} value={photo.offsetY} min={-100} max={100} step={1} onChange={(v) => onChange({ offsetY: v })} />
          </div>
          <details className="rounded-lg border border-slate-200 px-3 py-2.5">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">Photo adjustments</summary>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Slider label="Brightness" icon={<Sun className="w-3.5 h-3.5" />} value={photo.brightness} min={0.4} max={1.8} step={0.01} onChange={(v) => onChange({ brightness: v })} />
              <Slider label="Contrast" icon={<Contrast className="w-3.5 h-3.5" />} value={photo.contrast} min={0.4} max={1.8} step={0.01} onChange={(v) => onChange({ contrast: v })} />
              <Slider label="Saturation" icon={<Droplets className="w-3.5 h-3.5" />} value={photo.saturation} min={0} max={2} step={0.01} onChange={(v) => onChange({ saturation: v })} />
              <Slider label="Highlights" icon={null} value={photo.highlights} min={0} max={2} step={0.01} onChange={(v) => onChange({ highlights: v })} />
              <Slider label="Shadows" icon={null} value={photo.shadows} min={0} max={2} step={0.01} onChange={(v) => onChange({ shadows: v })} />
            </div>
          </details>
          <button type="button" onClick={() => onChange({ ...defaultPhotoState(), url: photo.url })} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-teal-700"><RotateCcw className="w-3.5 h-3.5" /> Reset photo adjustments</button>
        </>
      )}
    </div>
  );
}

// Panel shown when a text slot is selected: text, font and colour.
export function TextSlotPanel({
  text, slot, onChange,
}: {
  text: TextState; slot: DesignSlot; onChange: (partial: Partial<TextState>) => void;
}) {
  return (
    <div className="space-y-3">
      <input
        type="text" aria-label="Your personalized text" value={text.text} maxLength={40}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={slot.text ?? 'Your Text'}
        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-slate-900 font-semibold"
      />
      <p className="text-right text-[11px] text-slate-400">{text.text.length}/40 characters · auto-fits to your layout</p>
      <div>
        <span className="block text-xs font-medium text-slate-500 mb-1">Font</span>
        <div className="flex flex-wrap gap-2">
          {MUG_FONTS.map((f) => (
            <button
              type="button" key={f.id} aria-pressed={text.fontId === f.id} onClick={() => onChange({ fontId: f.id })}
              style={{ fontFamily: f.stack }}
              className={`px-3 py-1.5 rounded-lg border text-sm ${text.fontId === f.id ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="block text-xs font-medium text-slate-500 mb-1">Text Colour</span>
        <div className="flex flex-wrap gap-2">
          {TEXT_COLORS.map((c) => (
            <button
              type="button" key={c} aria-pressed={text.color === c} onClick={() => onChange({ color: c })} aria-label={`Colour ${c}`}
              className={`w-7 h-7 rounded-full border-2 ${text.color === c ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Mug type switcher with live price.
export function MugTypePicker({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {MUG_TYPES.map((t) => (
        <button
          type="button" key={t.id} aria-pressed={activeId === t.id} onClick={() => onSelect(t.id)}
          className={`text-left px-3 py-2 rounded-lg border transition-colors ${activeId === t.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          <span className="block text-xs font-semibold text-slate-900 leading-tight">{t.label}</span>
          <span className="block text-xs text-teal-600 font-medium">{formatINR(t.price)}</span>
        </button>
      ))}
    </div>
  );
}

// Only white mugs are stocked; handle styles still depend on the mug type.
export function MugAppearancePicker({
  type, handleStyle, onHandle,
}: {
  type: MugType; handleStyle: string;
  onHandle: (h: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs text-slate-600"><span aria-hidden="true" className="h-5 w-5 rounded-full border border-slate-300 bg-white shadow-sm" />White mug · full-colour photo and text printing</p>
      {type.handles.length > 1 && (
        <div>
          <span className="block text-xs font-medium text-slate-500 mb-1">Handle Style</span>
          <div className="flex gap-2">
            {type.handles.map((h) => (
              <button
                type="button" key={h} aria-pressed={handleStyle === h} onClick={() => onHandle(h)}
                className={`px-3 py-1.5 rounded-lg border text-sm capitalize ${handleStyle === h ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {h === 'love' ? 'Love Handle' : 'Round Handle'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
