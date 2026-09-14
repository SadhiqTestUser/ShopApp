/*
# Add Product Customization Support + Storage Bucket

## Changes
1. Add `customization_type` column to `products` — determines which customization flow to show
   (photo_book, magnet, phone_case, standard)
2. Add `customization_options` jsonb column to `products` — stores available options (page counts, shapes, etc.)
3. Add `customization_data` jsonb column to `order_items` — stores the user's customization selections + uploaded image URLs
4. Create storage bucket `customization-uploads` for user-uploaded images
5. Add storage policies for authenticated users to upload/read their own files
6. Update existing product seed data with customization types

## Customization Types
- `photo_book`: User selects page count (10/20/30), uploads photos for each page
- `magnet`: User selects shape (round/square), uploads photos
- `phone_case`: User uploads a single photo for the case
- `mug`: User uploads a single photo
- `standard`: No customization, just quantity
*/

-- Add customization columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS customization_type text DEFAULT 'standard';
ALTER TABLE products ADD COLUMN IF NOT EXISTS customization_options jsonb DEFAULT '{}';

-- Add customization data to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS customization_data jsonb;

-- Update existing products with customization types
UPDATE products SET customization_type = 'photo_book', customization_options = '{"pageCounts": [10, 20, 30], "pricePerPage": 50}'::jsonb WHERE name = 'Custom Photo Book';
UPDATE products SET customization_type = 'phone_case', customization_options = '{"maxImages": 1}'::jsonb WHERE name = 'Personalized Phone Case';
UPDATE products SET customization_type = 'mug', customization_options = '{"maxImages": 1}'::jsonb WHERE name = 'Custom Photo Mug';
UPDATE products SET customization_type = 'magnet', customization_options = '{"shapes": ["round", "square"], "maxImages": 6}'::jsonb WHERE name = 'Acrylic Fridge Magnet';
UPDATE products SET customization_type = 'standard' WHERE customization_type IS NULL;

-- Create storage bucket for customization uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('customization-uploads', 'customization-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload and read
DROP POLICY IF EXISTS "auth_upload_customization" ON storage.objects;
CREATE POLICY "auth_upload_customization" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'customization-uploads');

DROP POLICY IF EXISTS "auth_read_customization" ON storage.objects;
CREATE POLICY "auth_read_customization" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'customization-uploads');

DROP POLICY IF EXISTS "auth_delete_customization" ON storage.objects;
CREATE POLICY "auth_delete_customization" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'customization-uploads');