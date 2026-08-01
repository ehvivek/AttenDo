-- Create polls table
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  target_batch text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by text
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
  text text NOT NULL
);

-- Create poll_votes table to prevent double voting
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(poll_id, user_id) -- A user can only vote once per poll
);

-- Set up Row Level Security (RLS)
-- For this app, if RLS is disabled by the user, these policies aren't strictly required, 
-- but they are good practice.
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read polls and options
CREATE POLICY "Allow public read access to polls" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Allow public read access to poll_options" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Allow public read access to poll_votes" ON public.poll_votes FOR SELECT USING (true);

-- Allow authenticated users to insert votes
CREATE POLICY "Allow insert for poll_votes" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins would normally be the only ones to insert polls, but if RLS is disabled, it works.
CREATE POLICY "Allow insert for polls" ON public.polls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for poll_options" ON public.poll_options FOR INSERT WITH CHECK (true);

-- Enable real-time for poll_votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
