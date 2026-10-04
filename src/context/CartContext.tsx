import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Product } from '@/types';
import type { PhotoView } from '@/components/keychain/keychainGeometry';
import type { MugConfig } from '@/components/mug/mugState';
import type { MugDesign } from '@/lib/mugs';
import type { FrameCrop } from '@/components/photo-frame/frameGeometry';
import type { FrameColor, FrameOrientation } from '@/lib/photoFrames';
import { withProductSuggestions } from '@/lib/orderSuggestions';

const CART_STORAGE_KEY = 'printcraft_cart';

function makeCartItemId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  customization?: {
    customization_type: string;
    page_count: number | null;
    magnet_shape: string | null;
    images: string[];
    original_images?: string[];
    production_images?: string[];
    unit_price: number;
    suggestions?: string;
    shape?: string | null;
    layout?: string | null;
    frame_size?: string | null;
    frame_orientation?: FrameOrientation;
    frame_color?: FrameColor;
    frame_design?: {
      version: number;
      size_id: string;
      width_inches: number;
      height_inches: number;
      original_url: string;
      image_width: number;
      image_height: number;
      crop: FrameCrop;
    };
    number_of_people?: number | null;
    soft_copy?: boolean;
    keychain_material?: string | null;
    keychain_shape?: string | null;
    print_type?: string | null;
    keychain_design?: {
      template_id: string;
      version: number;
      photos: { original_url: string; width: number; height: number; view: PhotoView }[];
    };
    magnets?: { shape: string; quantity: number; image: string | null; original_image?: string | null }[];
    pencil_names?: string[];
    pencil_packs?: number;
    pen_names?: string[];
    pen_packs?: number;
    name_packs?: { name: string; packs: number }[];
    pad_material?: string | null;
    material_label?: string | null;
    pad_size?: string | null;
    child_name?: string | null;
    mug_type?: string | null;
    mug_type_label?: string | null;
    mug_color?: string | null;
    handle_style?: string | null;
    design_id?: string | null;
    design_name?: string | null;
    mug_texts?: string[];
    mug_config?: MugConfig;
    mug_design?: MugDesign;
  } | null;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, customization?: CartItem['customization']) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateSuggestions: (itemId: string, suggestions: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      const saved: CartItem[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(saved)) return [];
      // Older carts had only product IDs, which cannot distinguish two designs
      // of the same product. Assign a stable, unique ID to each existing row.
      const ids = new Set<string>();
      return saved.map((item) => {
        const id = typeof item.id === 'string' && item.id && !ids.has(item.id) ? item.id : makeCartItemId();
        ids.add(id);
        return { ...item, id };
      });
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore write errors (e.g. storage full or unavailable)
    }
  }, [items]);

  function addToCart(product: Product, quantity = 1, customization: CartItem['customization'] = null) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && !i.customization && !customization);
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { id: makeCartItemId(), product, quantity, customization }];
    });
  }

  function removeFromCart(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  function updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    );
  }

  function updateSuggestions(itemId: string, suggestions: string) {
    setItems((prev) => prev.map((item) => item.id === itemId
      ? { ...item, customization: withProductSuggestions(item.product, item.customization, suggestions) }
      : item));
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => {
    const unit = i.customization?.unit_price ?? Number(i.product.price);
    return sum + unit * i.quantity;
  }, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, updateSuggestions, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
