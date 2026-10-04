import definition from '../data/name-pen.json' with { type: 'json' };
import type { Product } from '@/types';

// Upgrade existing catalog records without requiring a database write. Keep
// their IDs, availability and pricing, including the original UUID-style ID.
export function withNamePenCustomization(product: Product): Product {
  if (product.id !== definition.id && product.id !== 'd61a8ce8-8944-489d-8c97-fd86d6c281c3') return product;
  return {
    ...product,
    image_url: definition.image_url,
    description: product.customization_type === 'name_pen' ? product.description : definition.description,
    customization_type: 'name_pen',
    customization_options: {
      ...definition.customization_options,
      ...product.customization_options,
      gallery: [definition.image_url],
    },
  };
}