-- 1. Create Notifications Table
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  target_batch text DEFAULT 'All', -- 'All', 'D1', 'D2', etc.
  type text NOT NULL, -- 'asset', 'announcement', 'system'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Notification Reads Table (Tracks who has read what)
CREATE TABLE public.notification_reads (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, notification_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
-- Anyone can read notifications intended for them (or 'All')
CREATE POLICY "Users can read relevant notifications" 
ON public.notifications FOR SELECT 
USING ( true );

CREATE POLICY "Auth users can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK ( auth.role() = 'authenticated' );

-- Notification Reads Policies
-- Users can only read/insert their own reads
CREATE POLICY "Users can manage their own reads" 
ON public.notification_reads FOR ALL 
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- 3. Enable Realtime on Notifications
alter publication supabase_realtime add table public.notifications;
