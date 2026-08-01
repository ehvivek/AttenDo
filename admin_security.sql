-- Update Polls Policies to restrict to Admin
DROP POLICY IF EXISTS "Allow insert for polls" ON public.polls;
DROP POLICY IF EXISTS "Allow delete for polls" ON public.polls;

CREATE POLICY "Allow insert for polls" ON public.polls 
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'vivek67@attendo.com');

CREATE POLICY "Allow delete for polls" ON public.polls 
FOR DELETE USING (auth.jwt() ->> 'email' = 'vivek67@attendo.com');

-- Update Poll Options Policies to restrict to Admin
DROP POLICY IF EXISTS "Allow insert for poll_options" ON public.poll_options;
DROP POLICY IF EXISTS "Allow delete for poll_options" ON public.poll_options;

CREATE POLICY "Allow insert for poll_options" ON public.poll_options 
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'vivek67@attendo.com');

CREATE POLICY "Allow delete for poll_options" ON public.poll_options 
FOR DELETE USING (auth.jwt() ->> 'email' = 'vivek67@attendo.com');

-- Update Notifications Policies to restrict to Admin
DROP POLICY IF EXISTS "Auth users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can delete notifications" ON public.notifications;

CREATE POLICY "Admin can insert notifications" ON public.notifications 
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'vivek67@attendo.com');

CREATE POLICY "Admin can delete notifications" ON public.notifications 
FOR DELETE USING (auth.jwt() ->> 'email' = 'vivek67@attendo.com');

-- Fix Poll Votes UPDATE policy to be fully secure
DROP POLICY IF EXISTS "Allow update for poll_votes" ON public.poll_votes;

CREATE POLICY "Allow update for poll_votes" ON public.poll_votes 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
