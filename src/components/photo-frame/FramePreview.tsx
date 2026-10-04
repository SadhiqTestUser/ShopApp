import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import {
  DEFAULT_FRAME_CROP, frameAperture, framePlacement, panFrameCrop, wheelFrameZoom,
  type FrameCrop, type ImageSize,
} from './frameGeometry';

export interface FramePhoto extends ImageSize { url: string }
interface Props {
  photo: FramePhoto | null;
  dimensions: ImageSize;
  crop: FrameCrop;
  editable?: boolean;
  showDimensions?: boolean;
  onCropChange?: (crop: FrameCrop) => void;
  onSelectPhoto?: () => void;
}

const FramePreview = forwardRef<SVGSVGElement, Props>(function FramePreview({ photo, dimensions, crop, editable = false, showDimensions = false, onCropChange, onSelectPhoto }, forwardedRef) {
  const id = useId().replace(/:/g, '');
  const areaRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; crop: FrameCrop } | null>(null);
  const [dragging, setDragging] = useState(false);
  const scale = showDimensions ? 8.5 : 270 / Math.max(dimensions.width, dimensions.height);
  const width = dimensions.width * scale, height = dimensions.height * scale;
  const x = (520 - width) / 2, y = (420 - height) / 2 + 15;
  const border = 0.3 * scale;
  const aperture = frameAperture(dimensions);
  const area = { width: aperture.width * scale, height: aperture.height * scale };
  const placement = photo ? framePlacement(photo, area, crop) : null;

  // A non-passive native listener prevents the page from scrolling while the
  // wheel is adjusting the photo. It is installed only on the editable canvas.
  useEffect(() => {
    const element = areaRef.current;
    if (!element || !editable || !photo || !onCropChange) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      onCropChange?.({ ...crop, zoom: wheelFrameZoom(crop.zoom, event.deltaY, event.deltaMode) });
    }
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [crop, editable, photo, onCropChange]);

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 ${showDimensions ? 'bg-slate-200' : 'bg-[#f7f2dc]'}`}>
      <svg ref={forwardedRef} viewBox="0 0 520 420" className="block w-full max-h-[540px]" aria-label={`${dimensions.width} by ${dimensions.height} inch black photo frame`}>
        <defs>
          <clipPath id={`${id}-clip`}><rect width={area.width} height={area.height} /></clipPath>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="-4" dy="6" stdDeviation="3" floodOpacity="0.25" />
          </filter>
          <marker id={`${id}-arrow`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6" fill="none" stroke="currentColor" />
          </marker>
        </defs>
        <path d="M0 400H520" stroke={showDimensions ? '#cbd5e1' : '#e8e0c6'} strokeWidth="8" />
        {showDimensions && (
          <g fill="#1e293b" stroke="#475569" strokeWidth="1" style={{ color: '#475569' }}>
            <path d={`M${x} ${y - 15}V${y - 38} M${x + width} ${y - 15}V${y - 38}`} />
            <path d={`M${x} ${y - 27}H${x + width}`} markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
            <text x={x + width / 2} y={y - 41} textAnchor="middle" stroke="none" fontSize="14" fontWeight="600">Width: {dimensions.width}&quot;</text>
            <path d={`M${x - 15} ${y}H${x - 38} M${x - 15} ${y + height}H${x - 38}`} />
            <path d={`M${x - 27} ${y}V${y + height}`} markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
            <text transform={`translate(${x - 43},${y + height / 2}) rotate(-90)`} textAnchor="middle" stroke="none" fontSize="14" fontWeight="600">Height: {dimensions.height}&quot;</text>
          </g>
        )}
        <rect x={x} y={y} width={width} height={height} fill="#242424" stroke="#404040" filter={`url(#${id}-shadow)`} />
        <svg
          ref={areaRef} x={x + border} y={y + border} width={area.width} height={area.height}
          viewBox={`0 0 ${area.width} ${area.height}`}
          overflow="hidden" style={{ touchAction: editable && photo ? 'none' : 'auto', cursor: editable && photo ? dragging ? 'grabbing' : 'grab' : 'default' }}
          role="group" aria-label="Photo positioning area" tabIndex={editable && photo ? 0 : undefined}
          onPointerDown={(event) => {
            if (!editable || !photo || event.button !== 0 || drag.current) return;
            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, crop };
            setDragging(true);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start || start.pointerId !== event.pointerId || !photo) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;
            onCropChange?.(panFrameCrop(photo, area, start.crop,
              (event.clientX - start.x) * area.width / bounds.width,
              (event.clientY - start.y) * area.height / bounds.height));
          }}
          onPointerUp={(event) => {
            if (drag.current?.pointerId !== event.pointerId) return;
            drag.current = null; setDragging(false);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { drag.current = null; setDragging(false); }}
          onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
          onKeyDown={(event) => {
            if (!editable || !photo || !onCropChange) return;
            const moves: Record<string, [number, number]> = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
            if (moves[event.key]) {
              event.preventDefault();
              onCropChange(panFrameCrop(photo, area, crop, ...moves[event.key]));
            } else if (['+', '=', '-'].includes(event.key)) {
              event.preventDefault();
              onCropChange({ ...crop, zoom: wheelFrameZoom(crop.zoom, event.key === '-' ? 50 : -50) });
            } else if (event.key === 'Home') {
              event.preventDefault(); onCropChange(DEFAULT_FRAME_CROP);
            }
          }}
        >
          <rect width={area.width} height={area.height} fill="white" />
          {photo && placement ? (
            <g clipPath={`url(#${id}-clip)`} pointerEvents="none">
              <image href={photo.url} {...placement} preserveAspectRatio="none" />
            </g>
          ) : editable ? (
            <foreignObject x={area.width / 2 - 45} y={area.height / 2 - 25} width="90" height="50">
              <button type="button" onClick={onSelectPhoto} className="h-full w-full rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-md hover:bg-blue-700">Select Photo</button>
            </foreignObject>
          ) : null}
        </svg>
      </svg>
    </div>
  );
});

export default FramePreview;