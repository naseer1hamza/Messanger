-- ============================================================
-- Migration: Finder side-app (browse + upload with static filters)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- This migration supersedes an earlier draft that used a flexible
-- tag system (finder_tags / finder_item_tags). Filters are now a fixed
-- set of columns, so those tables are no longer needed.
DROP TABLE IF EXISTS finder_item_tags;
DROP TABLE IF EXISTS finder_tags;

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE IF NOT EXISTS finder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  title text,
  country text,
  drinking text,
  smoking text,
  gender text,
  sexuality text,
  ethnicity text,
  eye_color text,
  hair_color text,
  -- manually entered by the uploader; the "Nearby Users" filter is a
  -- slider over this value rather than real geolocation.
  distance_km integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- safe to re-run: adds the static filter columns if this ran before
-- the columns existed.
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS drinking text;
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS smoking text;
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS sexuality text;
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS ethnicity text;
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS eye_color text;
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS hair_color text;
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS distance_km integer;

CREATE INDEX IF NOT EXISTS finder_items_user_id_idx ON finder_items (user_id);
CREATE INDEX IF NOT EXISTS finder_items_country_idx ON finder_items (country);
CREATE INDEX IF NOT EXISTS finder_items_gender_idx ON finder_items (gender);

-- ============================================================
-- 2. Row Level Security
-- ============================================================

ALTER TABLE finder_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view finder items" ON finder_items;
CREATE POLICY "Authenticated users can view finder items"
  ON finder_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own finder items" ON finder_items;
CREATE POLICY "Users can insert their own finder items"
  ON finder_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own finder items" ON finder_items;
CREATE POLICY "Users can update their own finder items"
  ON finder_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own finder items" ON finder_items;
CREATE POLICY "Users can delete their own finder items"
  ON finder_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. Storage bucket for finder images
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('finder-images', 'finder-images', true)
ON CONFLICT (id) DO NOTHING;

-- Files must be uploaded under a `${auth.uid()}/...` path so ownership
-- can be checked from the storage path alone.
DROP POLICY IF EXISTS "Users can upload their own finder images" ON storage.objects;
CREATE POLICY "Users can upload their own finder images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'finder-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Public read access for finder images" ON storage.objects;
CREATE POLICY "Public read access for finder images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'finder-images');

DROP POLICY IF EXISTS "Users can delete their own finder images" ON storage.objects;
CREATE POLICY "Users can delete their own finder images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'finder-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
