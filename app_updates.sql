-- Migration to add app_versions for OTA updates

-- Create the table
CREATE TABLE public.app_versions (
    id SERIAL PRIMARY KEY,
    version_code INTEGER NOT NULL UNIQUE,
    version_name TEXT NOT NULL,
    release_notes TEXT,
    download_url TEXT,
    is_mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on app_versions"
    ON public.app_versions
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert/update (if admin access needed later, this can be restricted)
-- For now, allow authenticated to insert just for admin ease, or just leave it for superusers.
CREATE POLICY "Allow authenticated users to insert app_versions"
    ON public.app_versions
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update app_versions"
    ON public.app_versions
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Insert initial version v0.A2
INSERT INTO public.app_versions (version_code, version_name, release_notes, download_url, is_mandatory)
VALUES (
    2,
    'v0.A2',
    'new timetable of thurday updates',
    'https://github.com/ehvivek/AttenDo/releases/latest/download/app-debug.apk',
    true
);
