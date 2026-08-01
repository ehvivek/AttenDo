-- Add an UPDATE policy for assets so the admin can change the color
DROP POLICY IF EXISTS "Admin can update assets" ON public.assets;
DROP POLICY IF EXISTS "Auth users can update assets" ON public.assets;

-- This allows the admin (vivek) to update any asset
CREATE POLICY "Admin can update assets" ON public.assets 
FOR UPDATE 
USING (auth.jwt() ->> 'email' = 'vivek67@attendo.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'vivek67@attendo.com');
