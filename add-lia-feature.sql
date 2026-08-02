-- ============================================================
-- Migration: Lia portfolio/gallery page (public gallery + upload)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE IF NOT EXISTS lia_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lia_items_user_id_idx ON lia_items (user_id);
CREATE INDEX IF NOT EXISTS lia_items_created_at_idx ON lia_items (created_at);

-- ============================================================
-- 2. Row Level Security
-- ============================================================

ALTER TABLE lia_items ENABLE ROW LEVEL SECURITY;

-- /Lia is a public gallery page, so anyone (including signed-out
-- visitors) can view the items.
DROP POLICY IF EXISTS "Anyone can view lia items" ON lia_items;
CREATE POLICY "Anyone can view lia items"
  ON lia_items FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own lia items" ON lia_items;
CREATE POLICY "Users can insert their own lia items"
  ON lia_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lia items" ON lia_items;
CREATE POLICY "Users can update their own lia items"
  ON lia_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own lia items" ON lia_items;
CREATE POLICY "Users can delete their own lia items"
  ON lia_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. Storage bucket for lia images
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('lia-images', 'lia-images', true)
ON CONFLICT (id) DO NOTHING;

-- Files must be uploaded under a `${auth.uid()}/...` path so ownership
-- can be checked from the storage path alone.
DROP POLICY IF EXISTS "Users can upload their own lia images" ON storage.objects;
CREATE POLICY "Users can upload their own lia images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lia-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Public read access for lia images" ON storage.objects;
CREATE POLICY "Public read access for lia images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'lia-images');

DROP POLICY IF EXISTS "Users can delete their own lia images" ON storage.objects;
CREATE POLICY "Users can delete their own lia images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lia-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
