export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: number;
  shipping_address: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  products?: Product;
}
