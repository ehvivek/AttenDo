-- Add a boolean column to track admin pinned assets
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS is_pinned_admin boolean DEFAULT false;
