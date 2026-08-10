-- ============================================================
-- Migration: optional footer image for /Lia (shown under the videos)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Reuses the singleton `lia_settings` row (id = 1) created by
-- add-lia-header.sql. If that migration hasn't been run yet, run it
-- first so this table exists.
ALTER TABLE lia_settings ADD COLUMN IF NOT EXISTS footer_image_url text;
