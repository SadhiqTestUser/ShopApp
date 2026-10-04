import { useId, useState } from 'react';

// The pen is a photograph, not SVG geometry. Only the engraving is composited
// here, in the same coordinate space as the retouched, locally hosted photo.
export default function PenPreview({ name, className }: { name: string; className?: string }) {
  const id = useId();
  const [closeUp, setCloseUp] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const text = name.trim() || 'YOUR NAME';
  return (
    <div className={className}>
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-white">
        {imageFailed ? (
          <p role="status" className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
            The pen photo could not load. Please refresh to see your personalized preview.
          </p>
        ) : (
          <svg
            viewBox={closeUp ? '70 225 350 290' : '0 0 578 582'}
            className="h-full w-full" role="img" aria-label={`Real pen photo with name ${text}`}
          >
            <defs>
              <linearGradient id={`${id}-engraving`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f4f1e8" />
                <stop offset="45%" stopColor="#dddcd6" />
                <stop offset="100%" stopColor="#b2b1aa" />
              </linearGradient>
            </defs>
            <image
              href="/name-pen/preview-photo.jpg" x="0" y="0" width="578" height="582"
              onError={() => setImageFailed(true)}
            />
            {/* Calibrated to the photographed barrel, not to the screen size. */}
            <g transform="translate(212.72 367.96) rotate(-50.905)">
              <text
                x="0" y="0" textAnchor="middle" dominantBaseline="central"
                fontFamily="Arial, Helvetica, sans-serif" fontWeight="600"
                fontSize="23" letterSpacing="0.65" fill={`url(#${id}-engraving)`}
                stroke="#161b21" strokeWidth="0.3" paintOrder="stroke fill" opacity="0.94"
                textLength={text.length > 10 ? 182 : undefined} lengthAdjust="spacingAndGlyphs"
              >
                {text}
              </text>
            </g>
          </svg>
        )}
      </div>
      <div className="mt-3 flex justify-center gap-1 rounded-lg bg-white/80 p-1" role="group" aria-label="Pen photo view">
        {[{ label: 'Full pen', detail: false }, { label: 'Name close-up', detail: true }].map(({ label, detail }) => (
          <button
            key={label} type="button" aria-pressed={closeUp === detail} onClick={() => setCloseUp(detail)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 ${closeUp === detail ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}