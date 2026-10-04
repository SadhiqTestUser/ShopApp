import type { CartItem } from '@/context/CartContext';
import type { Product } from '@/types';

export const MAX_CUSTOMIZATION_SUGGESTIONS = 1000;

export function limitSuggestions(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, MAX_CUSTOMIZATION_SUGGESTIONS) : '';
}

export function readSuggestions(data: Record<string, unknown> | null | undefined): string {
  return limitSuggestions(data?.suggestions).trim();
}

// Standard products need the same metadata shape as custom products, so notes
// survive the existing cart -> customization_data -> order document pipeline.
// Preserve spaces while editing; trim only when adding/submitting an item.
export function withProductSuggestions(
  product: Product, customization: CartItem['customization'], suggestions: string,
): CartItem['customization'] {
  const text = limitSuggestions(suggestions);
  if (!text && !customization) return null;
  return {
    ...(customization ?? {
      customization_type: product.customization_type ?? 'standard',
      page_count: null, magnet_shape: null, images: [], unit_price: Number(product.price),
    }),
    suggestions: text,
  };
}

export function buildOrderItem(item: CartItem) {
  return {
    product_id: item.product.id,
    quantity: item.quantity,
    price: item.customization?.unit_price ?? Number(item.product.price),
    customization_data: withProductSuggestions(item.product, item.customization, readSuggestions(item.customization)) ?? null,
  };
}