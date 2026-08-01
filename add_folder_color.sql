-- Add a color column to the assets table to allow admins to color-code folders
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS color text;
