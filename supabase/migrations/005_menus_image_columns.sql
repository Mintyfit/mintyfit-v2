-- Add image columns to menus and recipes tables
-- Run in Supabase SQL Editor

-- menus: add image_url + image_thumb_url
ALTER TABLE public.menus
  ADD COLUMN IF NOT EXISTS image_url       TEXT,
  ADD COLUMN IF NOT EXISTS image_thumb_url TEXT;

-- recipes: add image_thumb_url (image_url already exists)
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS image_thumb_url TEXT;
