-- ============================================================
-- Migration: optional header background image for /Lia
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Single-row "settings" table (id is always 1) holding the optional
-- header background photo shown on the public /Lia gallery page.
CREATE TABLE IF NOT EXISTS lia_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  header_image_url text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lia_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (including signed-out visitors) can view the header setting,
-- since it's rendered on the public /Lia page.
DROP POLICY IF EXISTS "Anyone can view lia settings" ON lia_settings;
CREATE POLICY "Anyone can view lia settings"
  ON lia_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert lia settings" ON lia_settings;
CREATE POLICY "Authenticated users can insert lia settings"
  ON lia_settings FOR INSERT
  TO authenticated
  WITH CHECK (id = 1);

DROP POLICY IF EXISTS "Authenticated users can update lia settings" ON lia_settings;
CREATE POLICY "Authenticated users can update lia settings"
  ON lia_settings FOR UPDATE
  TO authenticated
  USING (id = 1)
  WITH CHECK (id = 1);

-- Header background images are stored in the existing `lia-images`
-- bucket (under `${auth.uid()}/header-...`), so no new storage bucket
-- or policies are needed.
