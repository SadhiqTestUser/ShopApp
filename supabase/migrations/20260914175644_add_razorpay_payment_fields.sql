-- Add Razorpay payment fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;

-- Add shipping fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_pincode text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state text;

-- Update order status to include 'paid'
-- We'll use payment_status for tracking payment separately from order status

-- Allow users to update their own orders (needed for payment verification flow)
-- Currently only admin can update. We need a policy for users to update payment fields on their own orders
DROP POLICY IF EXISTS "update_own_orders_payment" ON orders;
CREATE POLICY "update_own_orders_payment" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);