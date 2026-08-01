-- Create Subjects Table
CREATE TABLE public.subjects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  credits integer NOT NULL,
  type text NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Attendance Table
CREATE TABLE public.attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  status text NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, subject_id, date) -- A student can only have one attendance record per subject per day
);

-- Create Assets Table
CREATE TABLE public.assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL, -- 'file' or 'notice'
  file_url text, -- Cloudinary URL
  folder text NOT NULL,
  uploaded_by uuid REFERENCES auth.users NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup Row Level Security (RLS)

-- 1. Subjects: Users can only see and edit their own subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own subjects" ON public.subjects
  FOR ALL USING (auth.uid() = user_id);

-- 2. Attendance: Users can only see and edit their own attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own attendance" ON public.attendance
  FOR ALL USING (auth.uid() = user_id);

-- 3. Assets: Anyone authenticated can read assets. Only admins can insert/update/delete.
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view assets" ON public.assets
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY "Only admins can insert assets" ON public.assets
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' = 'vivek67@attendo.com'
  );

CREATE POLICY "Only admins can delete assets" ON public.assets
  FOR DELETE USING (
    auth.jwt() ->> 'email' = 'vivek67@attendo.com'
  );
