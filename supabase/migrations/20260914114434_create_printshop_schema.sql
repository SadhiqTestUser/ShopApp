/*
# PrintShop Schema — Profiles, Products, Orders, Order Items

1. New Tables
- `profiles`: Extends auth.users with full_name, phone, and role (customer/admin).
- `products`: Catalog of customizable print products.
- `orders`: Customer orders.
- `order_items`: Line items in an order.

2. Security
- RLS enabled on all tables.
- profiles: users read/update own profile; admins read all.
- products: anon + authenticated can read; only admins can write.
- orders: users read/create own orders; admins read all and update status.
- order_items: users read items from own orders; admins read all.

3. Helper Functions
- is_admin(): SECURITY DEFINER function to check if current user has admin role.
- handle_new_user(): Trigger to auto-create a profile when a user signs up.

4. Seed Data
- 8 sample products across categories.
*/

-- Create tables FIRST
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  total numeric(10,2) NOT NULL DEFAULT 0,
  shipping_address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0
);

-- Helper function (after tables exist)
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Trigger function
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Products policies
DROP POLICY IF EXISTS "read_products" ON products;
CREATE POLICY "read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_products" ON products;
CREATE POLICY "admin_insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_products" ON products;
CREATE POLICY "admin_update_products" ON products FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_products" ON products;
CREATE POLICY "admin_delete_products" ON products FOR DELETE
  TO authenticated USING (is_admin());

-- Orders policies
DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_update_orders" ON orders;
CREATE POLICY "admin_update_orders" ON orders FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Order items policies
DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
CREATE POLICY "select_own_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    OR is_admin()
  );

DROP POLICY IF EXISTS "insert_own_order_items" ON order_items;
CREATE POLICY "insert_own_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- Seed products
INSERT INTO products (name, description, price, category, image_url) VALUES
  ('Custom Photo Book', 'Premium hardcover photo album with lay-flat binding. Choose your photos, pick a layout, and we print a keepsake that lasts a lifetime.', 799, 'Photo Books', 'https://images.pexels.com/photos/18317486/pexels-photo-18317486.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Personalized Phone Case', 'Slim, durable phone case printed with your favorite photo or design. Compatible with all major phone models.', 349, 'Accessories', 'https://images.pexels.com/photos/1670768/pexels-photo-1670768.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Custom Photo Mug', 'Start your morning with a smile. 11oz ceramic mug printed with your photo, full-color and dishwasher safe.', 249, 'Drinkware', 'https://images.pexels.com/photos/9261414/pexels-photo-9261414.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Canvas Wall Print', 'Turn your best shots into gallery-quality canvas prints. Stretched on a wooden frame, ready to hang.', 1199, 'Wall Art', 'https://images.pexels.com/photos/1880721/pexels-photo-1880721.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Acrylic Fridge Magnet', 'Set of 6 custom photo magnets. High-gloss acrylic finish with strong magnetic backing.', 199, 'Gifts', 'https://images.pexels.com/photos/8101470/pexels-photo-8101470.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Personalized Name Pen', 'Metal ballpoint pen engraved with your name. Smooth writing, premium finish, available in 5 colors.', 149, 'Stationery', 'https://images.pexels.com/photos/261767/pexels-photo-261767.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Photo Collage Frame', 'Multi-photo wall frame with custom layout. Print up to 12 photos in a single elegant frame.', 699, 'Wall Art', 'https://images.pexels.com/photos/28529926/pexels-photo-28529926.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Custom Greeting Cards', 'Set of 10 personalized greeting cards with your photos and messages. Premium cardstock, envelopes included.', 299, 'Stationery', 'https://images.pexels.com/photos/1724181/pexels-photo-1724181.jpeg?auto=compress&cs=tinysrgb&h=650&w=940')
ON CONFLICT DO NOTHING;