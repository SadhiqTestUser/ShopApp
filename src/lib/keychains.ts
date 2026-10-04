import type { Product } from '@/types';

export const KEYCHAIN_CATEGORY_IMAGE = '/keychains/keychains.png';

export type KeychainMaterial = 'MDF/Wood' | 'Metal' | 'Acrylic';
export type KeychainPrintType = 'Single Side Print' | 'Double Side Print' | 'Left/Right Print' | 'Name Laser Print';

export interface KeychainDefinition {
  id: string;
  name: string;
  material: KeychainMaterial;
  shape: string;
  image_url: string;
  price: number;
  printTypes: KeychainPrintType[];
  description: string;
  previewFrame?: { top: string; left: string; width: string; height: string };
}

export const KEYCHAINS: KeychainDefinition[] = [
  {
    id: 'keychain-mdf-square', name: 'MDF Square Keychain', material: 'MDF/Wood', shape: 'square',
    image_url: '/keychains/mdf-square.png', price: 149,
    printTypes: ['Single Side Print', 'Double Side Print'],
    description: 'Warm, lightweight MDF keychain with a clean square photo area.',
    previewFrame: { top: '28%', left: '28%', width: '44%', height: '44%' },
  },
  {
    id: 'keychain-mdf-heart', name: 'MDF Heart Keychain', material: 'MDF/Wood', shape: 'heart',
    image_url: '/keychains/mdf-heart.png', price: 149,
    printTypes: ['Single Side Print', 'Double Side Print'],
    description: 'A soft heart silhouette made for a meaningful everyday keepsake.',
    previewFrame: { top: '30%', left: '25%', width: '50%', height: '50%' },
  },
  {
    id: 'keychain-metal-love', name: 'Metal Love Keychain', material: 'Metal', shape: 'love',
    image_url: '/keychains/metal-love.png', price: 199,
    printTypes: ['Double Side Print'], description: 'Polished metal love shape with vivid two-sided printing.',
    previewFrame: { top: '30%', left: '25%', width: '50%', height: '50%' },
  },
  {
    id: 'keychain-metal-square', name: 'Metal Square Keychain', material: 'Metal', shape: 'square',
    image_url: '/keychains/metal-square.png', price: 199,
    printTypes: ['Double Side Print'], description: 'Crisp square metal keychain with a durable premium finish.',
    previewFrame: { top: '25%', left: '25%', width: '50%', height: '50%' },
  },
  {
    id: 'keychain-metal-rectangle', name: 'Metal Rectangle Keychain', material: 'Metal', shape: 'rectangle',
    image_url: '/keychains/metal-rectangle.png', price: 229,
    printTypes: ['Double Side Print'], description: 'A sleek rectangular metal keepsake for portraits and names.',
    previewFrame: { top: '22%', left: '25%', width: '50%', height: '56%' },
  },
  {
    id: 'keychain-metal-hexagon', name: 'Metal Hexagon Keychain', material: 'Metal', shape: 'hexagon',
    image_url: '/keychains/metal-hexagon.png', price: 229,
    printTypes: ['Double Side Print'], description: 'Geometric hexagon metal keychain printed on both sides.',
    previewFrame: { top: '20%', left: '20%', width: '60%', height: '60%' },
  },
  {
    id: 'keychain-acrylic-heart', name: 'Acrylic Heart Keychain', material: 'Acrylic', shape: 'heart',
    image_url: '/keychains/acrylic-heart.jpg', price: 199,
    printTypes: ['Single Side Print'], description: 'Glossy transparent acrylic heart with a bright single-sided photo.',
    previewFrame: { top: '36%', left: '26%', width: '39%', height: '38%' }
  },
];

export function keychainAsProduct(definition: KeychainDefinition): Product {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    price: definition.price,
    category: 'Accessories',
    image_url: definition.image_url,
    active: true,
    created_at: '2026-09-18T00:00:00.000Z',
    customization_type: 'keychain',
    customization_options: {
      material: definition.material,
      shape: definition.shape,
      printTypes: definition.printTypes,
      maxImages: definition.printTypes[0] === 'Single Side Print' ? 1 : 2,
      image_url: definition.image_url,
      previewFrame: definition.previewFrame,
    },
  };
}

export function findKeychain(id: string): Product | null {
  const definition = KEYCHAINS.find((item) => item.id === id);
  return definition ? keychainAsProduct(definition) : null;
}
