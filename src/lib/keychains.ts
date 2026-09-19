import type { Product } from '@/types';

export const KEYCHAIN_CATEGORY_IMAGE = 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcS6vGSEux1aF3adce8A9t6YodYFooQQuXWkzWc1EUrwNWU-Cdhv4-X_6PDFy4gZFeXyuO730uo8gnfC7VSN34RGduG7JqI6ig';

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
    image_url: 'https://m.media-amazon.com/images/I/81VzuOVNExL._SX679_.jpg', price: 149,
    printTypes: ['Single Side Print', 'Double Side Print'],
    description: 'Warm, lightweight MDF keychain with a clean square photo area.',
    previewFrame: { top: '28%', left: '28%', width: '44%', height: '44%' },
  },
  {
    id: 'keychain-mdf-heart', name: 'MDF Heart Keychain', material: 'MDF/Wood', shape: 'heart',
    image_url: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcT1vA0udoB_io8TlxyD5mV892PSwBXRbCfEKcGaVnUJCobZO6RII5lpTG_t1J5BJKg777QgFKRtWhqnix5at8diUY40KUxVeB4j9zxo9-Hj1xKU7LZUPnKe', price: 149,
    printTypes: ['Single Side Print', 'Double Side Print'],
    description: 'A soft heart silhouette made for a meaningful everyday keepsake.',
    previewFrame: { top: '30%', left: '25%', width: '50%', height: '50%' },
  },
  {
    id: 'keychain-metal-love', name: 'Metal Love Keychain', material: 'Metal', shape: 'love',
    image_url: 'https://images.meesho.com/images/products/1076887390/izmkq_512.avif?width=512', price: 199,
    printTypes: ['Double Side Print'], description: 'Polished metal love shape with vivid two-sided printing.',
    previewFrame: { top: '30%', left: '25%', width: '50%', height: '50%' },
  },
  {
    id: 'keychain-metal-square', name: 'Metal Square Keychain', material: 'Metal', shape: 'square',
    image_url: 'https://digiprintshop.com/wp-content/uploads/2025/01/keychain-square-pic11.jpg', price: 199,
    printTypes: ['Double Side Print'], description: 'Crisp square metal keychain with a durable premium finish.',
    previewFrame: { top: '25%', left: '25%', width: '50%', height: '50%' },
  },
  {
    id: 'keychain-metal-rectangle', name: 'Metal Rectangle Keychain', material: 'Metal', shape: 'rectangle',
    image_url: 'https://rukminim2.flixcart.com/image/1676/1676/xif0q/key-chain/u/i/f/premium-custom-men-photo-keychain-rectangular-shape-for-birthday-original-imaheqgqbbsytfkp.jpeg?q=90', price: 229,
    printTypes: ['Double Side Print'], description: 'A sleek rectangular metal keepsake for portraits and names.',
    previewFrame: { top: '22%', left: '25%', width: '50%', height: '56%' },
  },
  {
    id: 'keychain-metal-hexagon', name: 'Metal Hexagon Keychain', material: 'Metal', shape: 'hexagon',
    image_url: 'https://kalanidhigifts.in/cdn/shop/files/PhotoPrintedHexagonMetalDoubleSideKeychain_2.avif?v=1776754016&width=1920', price: 229,
    printTypes: ['Double Side Print'], description: 'Geometric hexagon metal keychain printed on both sides.',
    previewFrame: { top: '20%', left: '20%', width: '60%', height: '60%' },
  },
  {
    id: 'keychain-acrylic-heart', name: 'Acrylic Heart Keychain', material: 'Acrylic', shape: 'heart',
    image_url: 'https://cdn.printshoppy.com/image/cache/catalog/product-image/key-chains-2/kc-102-600x600.jpg', price: 199,
    printTypes: ['Single Side Print'], description: 'Glossy transparent acrylic heart with a bright single-sided photo.',
    previewFrame: { top: '47%', left: '26%', width: '36%', height: '37%' }
  },
  {
    id: 'keychain-acrylic-locket', name: 'Acrylic Heart Opening Locket', material: 'Acrylic', shape: 'locket',
    image_url: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTlFUZkCJoJDiKHHE0JsqtXVa7i5liq7Pk4aAlilxZ3saSlhwg8535MA1NlrEJQsK97sDErfXKb9kzEMPBITy5MHVSmm0vMGt4TbC3812IKwfelXBY4_9D9iKg', price: 299,
    printTypes: ['Left/Right Print', 'Name Laser Print'], description: 'A special opening acrylic locket for two photos or a name engraving.',
    previewFrame: { top: '35%', left: '30%', width: '40%', height: '45%' },
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
