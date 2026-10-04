import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import {
  movePhoto, photoLayout, pinchPhoto, regionPhotoIndex, toLocal, zoomAt,
  type MockupTemplate, type PhotoView, type Point, type Size,
} from './keychainGeometry';

export interface KeychainPhoto extends Size {
  id: string;
  url: string;
  name: string;
  blob: Blob;
  view: PhotoView;
}
interface Props {
  imageUrl: string;
  name: string;
  template: MockupTemplate;
  photos: (KeychainPhoto | null)[];
  activeSlot: number;
  onSelect?: (index: number) => void;
  onChange?: (index: number, update: (view: PhotoView) => PhotoView) => void;
}
interface ActivePointer { point: Point; region: number; slot: number }

// One coordinate space for the original photograph, clipping, photo placement,
// and hit testing. Only the uploaded photo moves; the product never moves.
const KeychainMockup = forwardRef<SVGSVGElement, Props>(function KeychainMockup(props, forwardedRef) {
  const { imageUrl, name, template, photos, activeSlot, onChange, onSelect } = props;
  const id = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  useImperativeHandle(forwardedRef, () => svgRef.current!, []);
  const latest = useRef(props);
  latest.current = props;
  const pointers = useRef(new Map<number, ActivePointer>());
  const [dragging, setDragging] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const identity = photos.map((photo) => photo?.id ?? '').join('|');

  useEffect(() => {
    pointers.current.clear();
    setDragging(false);
  }, [identity, template]);
  useEffect(() => setImageFailed(false), [imageUrl, template]);

  function pointInRegion(clientX: number, clientY: number, regionIndex: number): Point | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return toLocal(latest.current.template.regions[regionIndex].matrix, point.matrixTransform(ctm.inverse()));
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function wheel(event: WheelEvent) {
      const target = event.target as SVGElement;
      const regionIndex = target.getAttribute('data-photo-region');
      const { template: t, photos: currentPhotos, activeSlot: active, onChange: change, onSelect: select } = latest.current;
      if (regionIndex === null || !change) return;
      const region = t.regions[Number(regionIndex)];
      const slot = regionPhotoIndex(region, active, currentPhotos.length);
      const photo = currentPhotos[slot];
      const point = pointInRegion(event.clientX, event.clientY, Number(regionIndex));
      if (!photo || !point) return;
      event.preventDefault();
      select?.(slot);
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 600 : 1);
      change(slot, (view) => zoomAt(view, photo, t.box, Math.exp(-delta * 0.0015), point));
    }
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, []);

  function down(event: PointerEvent<SVGPathElement>, regionIndex: number, slot: number) {
    if (!onChange || !photos[slot] || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const first = pointers.current.values().next().value as ActivePointer | undefined;
    if (pointers.current.size >= 2 || (first && first.slot !== slot)) return;
    // Both pointers use the same local frame, including when touching linked hearts.
    const region = first?.region ?? regionIndex;
    const point = pointInRegion(event.clientX, event.clientY, region);
    if (!point) return;
    event.preventDefault();
    onSelect?.(slot);
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { point, region, slot });
    setDragging(true);
  }

  function move(event: PointerEvent<SVGPathElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous || !onChange) return;
    const photo = photos[previous.slot];
    const now = pointInRegion(event.clientX, event.clientY, previous.region);
    if (!photo || !now) return;
    const other = [...pointers.current.entries()].find(([pointerId]) => pointerId !== event.pointerId)?.[1];
    if (other) {
      onChange(previous.slot, (view) => pinchPhoto(view, photo, template.box, previous.point, now, other.point));
    } else {
      onChange(previous.slot, (view) => movePhoto(view, photo, template.box, previous.point, now));
    }
    pointers.current.set(event.pointerId, { ...previous, point: now });
  }

  function release(event: PointerEvent<SVGPathElement>) {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(pointers.current.size > 0);
  }

  function key(event: KeyboardEvent<SVGPathElement>, slot: number) {
    const photo = photos[slot];
    if (!photo || !onChange) return;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -3, y: 0 }, ArrowRight: { x: 3, y: 0 },
      ArrowUp: { x: 0, y: -3 }, ArrowDown: { x: 0, y: 3 },
    };
    if (delta[event.key]) {
      event.preventDefault();
      onChange(slot, (view) => movePhoto(view, photo, template.box, { x: 0, y: 0 }, delta[event.key]));
    }
  }

  return (
    <div className="w-full">
      <svg ref={svgRef} viewBox="0 0 600 600" className="block w-full h-auto select-none"
        aria-label={`${name} live photo preview`}>
        <image href={imageUrl} width="600" height="600" preserveAspectRatio="xMidYMid meet"
          onError={() => setImageFailed(true)} pointerEvents="none" />
        <defs>
          {template.regions.map((region, index) => region.maskUrl ? (
            <mask id={`${id}-photo-${index}`} key={region.id}
              maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"
              x="0" y="0" width="600" height="600" style={{ maskType: 'alpha' }}>
              <image href={region.maskUrl} width="600" height="600" preserveAspectRatio="xMidYMid meet"
                onError={() => setImageFailed(true)} />
            </mask>
          ) : (
            <clipPath id={`${id}-photo-${index}`} key={region.id} clipPathUnits="userSpaceOnUse">
              <path d={region.path} transform={region.pathTransform ? `matrix(${region.pathTransform.join(' ')})` : undefined} />
            </clipPath>
          ))}
        </defs>
        {!imageFailed && template.regions.map((region, index) => {
          const slot = regionPhotoIndex(region, activeSlot, photos.length);
          const photo = photos[slot];
          if (!photo) return null;
          const { scale } = photoLayout(photo, template.box, photo.view);
          const view = photo.view;
          const pathTransform = region.pathTransform ? `matrix(${region.pathTransform.join(' ')})` : undefined;
          return (
            <g key={region.id}>
              <g mask={region.maskUrl ? `url(#${id}-photo-${index})` : undefined}
                clipPath={region.maskUrl ? undefined : `url(#${id}-photo-${index})`} pointerEvents="none">
                {region.maskUrl ? <rect width="600" height="600" fill="white" />
                  : <path d={region.path} transform={pathTransform} fill="white" />}
                <g transform={`matrix(${region.matrix.join(' ')})`}>
                  <g transform={`translate(${view.x} ${view.y}) rotate(${view.rotation})`}>
                    <image href={photo.url} x={-photo.width * scale / 2} y={-photo.height * scale / 2}
                      width={photo.width * scale} height={photo.height * scale} preserveAspectRatio="none"
                      style={{ filter: `brightness(${view.brightness}) contrast(${view.contrast}) saturate(${view.saturation})` }} />
                  </g>
                </g>
              </g>
              {onChange && <path d={region.path} transform={pathTransform} fill="transparent"
                data-photo-region={index} tabIndex={0} role="button"
                aria-label={`Position ${region.id} photo. Drag, use arrow keys, or scroll to zoom.`}
                style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                onFocus={() => onSelect?.(slot)} onKeyDown={(event) => key(event, slot)}
                onPointerDown={(event) => down(event, index, slot)} onPointerMove={move}
                onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} />}
            </g>
          );
        })}
      </svg>
      {imageFailed && <p role="alert" className="text-sm text-red-600 p-3">The preview artwork could not load. Please refresh before positioning your photo.</p>}
    </div>
  );
});

export default KeychainMockup;
