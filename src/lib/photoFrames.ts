import definition from '../data/photo-frames.json' with { type: 'json' };
import type { FrameSizeOption, Product } from '@/types';

export const PHOTO_FRAMES_PRODUCT: Product = { ...definition, customization_type: 'matte_photo_frame' };
export const PHOTO_FRAME_SIZES = definition.customization_options.sizes;
export type PhotoFrameSize = (typeof PHOTO_FRAME_SIZES)[number];
export type FrameOrientation = 'portrait' | 'landscape';
export type FrameColor = 'black' | 'white';

const DIGI_PAINTING_IDS = new Set([
  'digi-painting',
  'photo-frame-digi-painting',
  'a4444444-4444-4444-8444-444444444444',
]);

function digiPaintingSizes(price: number): FrameSizeOption[] {
  return PHOTO_FRAME_SIZES.map((size) => ({
    id: size.id,
    label: `${size.width} × ${size.height} inches`,
    price,
  }));
}

// Keep persisted Digi Painting records in their dedicated sample-artwork flow
// without changing merchant-provided copy, imagery, or pricing.
export function withDigiPaintingCustomization(product: Product): Product {
  if (!DIGI_PAINTING_IDS.has(product.id)) return product;
  return {
    ...product,
    customization_type: 'digi_painting',
    customization_options: {
      ...product.customization_options,
      maxImages: 1,
      peopleOptions: [1, 2, 3, 4, 5, 6],
      pricePerPerson: 0,
      sizes: digiPaintingSizes(Number(product.price)),
    },
  };
}

export function frameDimensions(size: PhotoFrameSize, orientation: FrameOrientation) {
  return orientation === 'portrait'
    ? { width: size.width, height: size.height }
    : { width: size.height, height: size.width };
}

// The screenshot supplies a base price only. Optional merchant-configured
// sizePrices override it; do not invent size surcharges or discount claims.
export function framePrice(product: Product, sizeId: string): number {
  const prices = product.customization_options.sizePrices as Record<string, number> | undefined;
  const price = prices?.[sizeId];
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : Number(product.price);
}

// A built-in entry makes the new product available before a database seed.
// Persisted entries always win, including an admin's decision to deactivate it.
export function withPhotoFrames(products: Product[]): Product[] {
  const list = products.some((product) => product.id === PHOTO_FRAMES_PRODUCT.id)
    ? products : [...products, PHOTO_FRAMES_PRODUCT];
  return list.map(withDigiPaintingCustomization)
    .filter((product) => product.active)
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
}