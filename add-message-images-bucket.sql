-- ============================================================
-- Migration: Create message-images storage bucket
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the public bucket for message images
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Storage policies
-- ============================================================

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload message images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'message-images');

-- Allow public read (bucket is public, so image URLs work without auth)
CREATE POLICY "Public read access for message images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'message-images');

-- Allow users to delete their own uploaded images
CREATE POLICY "Authenticated users can delete message images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'message-images');
