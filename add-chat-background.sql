-- ============================================================
-- Migration: Add chat_background_url to profiles table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add the column to the profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS chat_background_url TEXT;

-- ============================================================
-- 2. Create the storage bucket for chat backgrounds
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-backgrounds', 'chat-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Storage policies — allow authenticated users to manage
--    their own background images
-- ============================================================

-- Allow any authenticated user to upload to their own folder
CREATE POLICY "Authenticated users can upload chat backgrounds"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-backgrounds');

-- Allow public read access (since bucket is public)
CREATE POLICY "Public read access for chat backgrounds"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'chat-backgrounds');

-- Allow authenticated users to update/replace their own files
CREATE POLICY "Authenticated users can update chat backgrounds"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'chat-backgrounds');

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete chat backgrounds"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-backgrounds');
