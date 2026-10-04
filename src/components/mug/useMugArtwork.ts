import { useEffect, useMemo, useState } from 'react';
import type { MugDesign } from '@/lib/mugs';
import type { MugConfig } from './mugState';
import { drawMugWrap, loadImg } from './mugTexture';

export interface MugArtwork {
  canvas: HTMLCanvasElement;
  revision: number;
  loading: boolean;
  error: string | null;
}

// One decoded-image cache and one painter for the editor and every preview.
export function useMugArtwork(design: MugDesign, config: MugConfig, resolution = 2048): MugArtwork {
  const canvas = useMemo(() => document.createElement('canvas'), []);
  const [revision, setRevision] = useState(0);
  const [assets, setAssets] = useState<{ key: string; images: Record<string, HTMLImageElement>; error: string | null }>({ key: '', images: {}, error: null });
  const key = JSON.stringify(Object.entries(config.photos).map(([id, photo]) => [id, photo.url]));

  useEffect(() => {
    let alive = true;
    const entries: [string, string | null][] = JSON.parse(key);
    const images: Record<string, HTMLImageElement> = {};
    let error: string | null = null;
    Promise.all(entries.map(async ([id, url]) => {
      if (!url) return;
      try { images[id] = await loadImg(url); }
      catch { error = 'A photo could not be loaded. Please replace it before ordering.'; }
    })).then(() => { if (alive) setAssets({ key, images, error }); });
    return () => { alive = false; };
  }, [key]);

  useEffect(() => {
    let alive = true;
    function paint() {
      if (!alive) return;
      drawMugWrap(canvas, design, config, assets.key === key ? assets.images : {}, resolution);
      setRevision((value) => value + 1);
    }
    paint();
    // Webfonts may finish after the first render; repaint without a user edit.
    void document.fonts?.ready.then(paint);
    return () => { alive = false; };
  }, [canvas, design, config, assets, key, resolution]);

  return { canvas, revision, loading: assets.key !== key, error: assets.key === key ? assets.error : null };
}