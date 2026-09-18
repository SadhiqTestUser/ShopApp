import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Product } from '@/types';

const CART_STORAGE_KEY = 'printcraft_cart';

export interface CartItem {
  product: Product;
  quantity: number;
  customization?: {
    customization_type: string;
    page_count: number | null;
    magnet_shape: string | null;
    images: string[];
    unit_price: number;
    shape?: string | null;
    layout?: string | null;
    frame_size?: string | null;
    number_of_people?: number | null;
    soft_copy?: boolean;
  } | null;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, customization?: CartItem['customization']) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
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
          i.product.id === product.id && !i.customization ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity, customization }];
    });
  }

  function removeFromCart(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
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
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
