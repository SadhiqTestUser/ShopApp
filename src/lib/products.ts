import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PHOTO_FRAMES_PRODUCT, withDigiPaintingCustomization, withPhotoFrames } from '@/lib/photoFrames';
import { withNamePenCustomization } from '@/lib/namePen';
import type { Product } from '@/types';

export async function loadProducts(): Promise<Product[]> {
  // Read inactive entries too so a deactivated built-in product stays hidden.
  const snapshot = await getDocs(collection(db, 'products'));
  return withPhotoFrames(snapshot.docs.map((entry) => withNamePenCustomization({ ...entry.data(), id: entry.id } as Product)));
}

export async function loadProduct(id: string): Promise<Product | null> {
  const snapshot = await getDoc(doc(db, 'products', id));
  if (snapshot.exists()) {
    const product = { ...snapshot.data(), id: snapshot.id } as Product;
    return product.active ? withDigiPaintingCustomization(withNamePenCustomization(product)) : null;
  }
  return id === PHOTO_FRAMES_PRODUCT.id ? PHOTO_FRAMES_PRODUCT : null;
}