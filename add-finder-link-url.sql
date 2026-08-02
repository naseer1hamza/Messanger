-- ============================================================
-- Migration: Add link_url to finder_items
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Optional URL that, when set, the finder image links out to on click
-- (e.g. an external profile, product page, etc.)
ALTER TABLE finder_items ADD COLUMN IF NOT EXISTS link_url text;
