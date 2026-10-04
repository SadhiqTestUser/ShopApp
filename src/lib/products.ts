import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PHOTO_FRAMES_PRODUCT, withDigiPaintingCustomization, withPhotoFrames } from '@/lib/photoFrames';
import { withNamePenCustomization } from '@/lib/namePen';
import type { Product } from '@/types';

export const STATIONERY_PAD_PRODUCT: Product = {
  id: 'customizable-writing-pad',
  name: 'Customizable Writing Pad',
  description: 'A4 MDF wooden or acrylic writing pad with your photo placed inside the writing area. Drag, zoom and edit your image before adding it to cart.',
  price: 399,
  category: 'Stationery',
  image_url: '/stationery/pads/5a7b6026-10d9-4402-bff8-82021ea5869c.png',
  active: true,
  created_at: '2026-10-04T00:00:00.000000+00:00',
  customization_type: 'stationery_pad',
  customization_options: {
    materials: ['wooden', 'acrylic'],
    defaultMaterial: 'wooden',
    size: 'A4',
    price: 399,
    maxImages: 1,
  },
};

export async function loadProducts(): Promise<Product[]> {
  // Read inactive entries too so a deactivated built-in product stays hidden.
  const snapshot = await getDocs(collection(db, 'products'));
  const products = snapshot.docs.map((entry) => withNamePenCustomization({ ...entry.data(), id: entry.id } as Product));
  const withBuiltIns = products.some((product) => product.id === STATIONERY_PAD_PRODUCT.id)
    ? products
    : [...products, STATIONERY_PAD_PRODUCT];
  return withPhotoFrames(withBuiltIns);
}

export async function loadProduct(id: string): Promise<Product | null> {
  const snapshot = await getDoc(doc(db, 'products', id));
  if (snapshot.exists()) {
    const product = { ...snapshot.data(), id: snapshot.id } as Product;
    return product.active ? withDigiPaintingCustomization(withNamePenCustomization(product)) : null;
  }
  if (id === PHOTO_FRAMES_PRODUCT.id) return PHOTO_FRAMES_PRODUCT;
  if (id === STATIONERY_PAD_PRODUCT.id) return STATIONERY_PAD_PRODUCT;
  return null;
}