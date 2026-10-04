import { RotateCw, RotateCcw } from 'lucide-react';
import type { KeychainPhoto } from './KeychainMockup';
import { fitView, INITIAL_VIEW, MAX_ZOOM, MIN_ZOOM, zoomAt, type PhotoView, type Size } from './keychainGeometry';

interface Props {
  photo: KeychainPhoto;
  box: Size;
  onChange: (update: (view: PhotoView) => PhotoView) => void;
}

export default function KeychainPhotoControls({ photo, box, onChange }: Props) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-slate-500">Drag your photo inside the keychain. Scroll or pinch to zoom. You can also focus the photo and use arrow keys.</p>
      <label className="block text-slate-600">
        <span className="flex justify-between mb-1"><span>Photo zoom</span><span>{photo.view.zoom.toFixed(2)}×</span></span>
        <input aria-label="Photo zoom" type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={photo.view.zoom}
          onChange={(event) => {
            const zoom = Number(event.target.value);
            onChange((view) => zoomAt(view, photo, box, zoom / view.zoom, { x: 0, y: 0 }));
          }} className="w-full accent-teal-600" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange((view) => fitView({ ...view,
          rotation: (view.rotation + 90) % 360, x: 0, y: 0 }, photo, box))}
          className="inline-flex gap-1.5 items-center rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
          <RotateCw className="w-4 h-4" /> Rotate
        </button>
        <button type="button" onClick={() => onChange(() => ({ ...INITIAL_VIEW }))}
          className="inline-flex gap-1.5 items-center rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
          <RotateCcw className="w-4 h-4" /> Reset photo
        </button>
      </div>
      <details>
        <summary className="cursor-pointer text-slate-600 py-1">Color adjustments</summary>
        <div className="space-y-2 pt-2">
          {(['brightness', 'contrast', 'saturation'] as const).map((setting) => (
            <label key={setting} className="block capitalize text-xs text-slate-500">
              {setting}
              <input aria-label={setting} type="range" min={setting === 'saturation' ? 0 : 0.5} max={2}
                step={0.01} value={photo.view[setting]} className="block w-full accent-teal-600"
                onChange={(event) => {
                  const value = Number(event.target.value);
                  onChange((view) => ({ ...view, [setting]: value }));
                }} />
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}