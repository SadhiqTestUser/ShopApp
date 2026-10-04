import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { Box, Grid2X2, LayoutPanelTop, Loader2, Move, Pause, Play, RotateCcw } from 'lucide-react';
import type { MugDesign, MugType } from '@/lib/mugs';
import type { MugConfig, PhotoState } from './mugState';
import type { MugArtwork } from './useMugArtwork';
import { MUG_ANGLES, type MugAngle } from './mugProjection';
import MugAnglePreview from './MugAnglePreview';
import MugWrap from './MugWrap';

const Mug3D = lazy(() => import('./Mug3DView'));
type View = 'all' | MugAngle | '3d' | 'wrap';

class PreviewBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function MugPreviewPanel({ design, config, mugType, artwork, activeSlotId, onSelectSlot, onPhotoChange }: {
  design: MugDesign; config: MugConfig; mugType: MugType; artwork: MugArtwork;
  activeSlotId: string; onSelectSlot: (id: string) => void;
  onPhotoChange: (id: string, partial: Partial<PhotoState>) => void;
}) {
  const [view, setView] = useState<View>('all');
  const [angle, setAngle] = useState<MugAngle>('front');
  const [autoRotate, setAutoRotate] = useState(false);
  const [reset, setReset] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const options: { id: View; label: string; icon?: ReactNode }[] = [
    { id: 'all', label: 'All angles', icon: <Grid2X2 className="w-4 h-4" /> },
    { id: 'left', label: 'Left' }, { id: 'front', label: 'Front' }, { id: 'right', label: 'Right' },
    { id: '3d', label: '3D view', icon: <Box className="w-4 h-4" /> },
    { id: 'wrap', label: 'Flat wrap', icon: <LayoutPanelTop className="w-4 h-4" /> },
  ];
  const flat = <MugWrap design={design} config={config} artwork={artwork} width={900} editable activeSlotId={activeSlotId} onSelectSlot={onSelectSlot} onPhotoChange={onPhotoChange} />;
  const fallback = (
    <div className="w-full max-w-sm mx-auto">
      <MugAnglePreview artwork={artwork} angle="front" config={config} mugType={mugType} />
      <p role="status" className="px-5 pb-6 text-center text-sm text-slate-600">3D is unavailable on this device. Your design is safe; all angle previews and editing still work.</p>
    </div>
  );

  return (
    <section aria-label="Live mug preview" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-slate-100">
        <div><h3 className="font-semibold text-slate-900">Your mug, from every angle</h3><p className="text-xs text-slate-500 mt-1">One design. Every detail in view.</p></div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Live</span>
      </div>
      <div className="flex flex-wrap gap-1 p-3" role="group" aria-label="Preview view">
        {options.map((option) => (
          <button type="button" key={option.id} aria-pressed={view === option.id} onClick={() => setView(option.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-teal-600 ${view === option.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
            {option.icon}{option.label}
          </button>
        ))}
      </div>
      <div className="relative flex min-h-[290px] sm:min-h-[390px] items-center justify-center bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f1f5f4_100%)] px-2 py-5">
        {artwork.loading && <span role="status" className="absolute top-3 left-4 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-3 h-3 animate-spin" /> Updating artwork…</span>}
        {view === 'all' ? (
          <div className="grid w-full grid-cols-3 gap-0 sm:gap-2">
            {MUG_ANGLES.map((item) => (
              <button type="button" key={item} onClick={() => setView(item)} aria-label={`Enlarge ${item} view`} className="min-w-0 rounded-xl pb-4 transition-colors hover:bg-white/70 focus-visible:outline-teal-600">
                <MugAnglePreview artwork={artwork} angle={item} config={config} mugType={mugType} />
                <span className="text-xs font-semibold text-slate-600 capitalize">{item} view</span>
              </button>
            ))}
          </div>
        ) : view === 'wrap' ? <div className="w-full px-4 py-10">{flat}</div> : view === '3d' ? (
          unavailable ? fallback : <PreviewBoundary key={reset} fallback={fallback}>
            <Suspense fallback={<div role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> Preparing your 3D preview…</div>}>
              <Mug3D key={`${angle}-${reset}`} artwork={artwork} config={config} mugType={mugType} angle={angle} autoRotate={autoRotate} onUnavailable={() => setUnavailable(true)} />
            </Suspense>
          </PreviewBoundary>
        ) : <div className="w-full max-w-[390px]"><MugAnglePreview artwork={artwork} angle={view} config={config} mugType={mugType} /></div>}
      </div>
      {view === '3d' && (
        <div className="flex flex-wrap justify-center items-center gap-2 border-t border-slate-100 px-4 py-3">
          {MUG_ANGLES.map((item) => <button type="button" key={item} onClick={() => { setAngle(item); setReset((value) => value + 1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 capitalize">{item}</button>)}
          <button type="button" aria-pressed={autoRotate} onClick={() => setAutoRotate(!autoRotate)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">{autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}{autoRotate ? 'Pause' : 'Auto rotate'}</button>
          <button type="button" aria-label="Reset 3D view" onClick={() => { setAngle('front'); setAutoRotate(false); setUnavailable(false); setReset((value) => value + 1); }} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><RotateCcw className="w-4 h-4" /></button>
        </div>
      )}
      <p className="flex items-center justify-center gap-1.5 px-4 py-3 text-center text-xs text-slate-500"><Move className="w-3.5 h-3.5 shrink-0" />{view === '3d' ? 'Drag to rotate · pinch or scroll to zoom' : view === 'wrap' ? 'Select an area to edit · drag a photo to position it' : 'Select any angle for a closer look'}</p>
      {view !== 'wrap' && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex justify-between text-xs mb-3"><span className="font-semibold text-slate-700">Your full wrap · click to edit</span><span className="text-slate-400">200 × 97 mm</span></div>
          {flat}
          <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider text-slate-400"><span>Left side</span><span>Front / middle</span><span>Right side</span></div>
        </div>
      )}
      <p className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] leading-relaxed text-slate-500">Digital preview for placement. Printed colours and materials may vary.{mugType.material === 'reveal' ? ' Magic mugs are shown in their revealed (warm) state.' : ''}{mugType.material === 'glass' ? ' Glass transparency is approximate.' : ''}</p>
    </section>
  );
}