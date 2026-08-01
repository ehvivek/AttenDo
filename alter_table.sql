ALTER TABLE public.attendance DROP CONSTRAINT attendance_subject_id_fkey;
ALTER TABLE public.attendance DROP CONSTRAINT attendance_user_id_subject_id_date_key;
ALTER TABLE public.attendance DROP COLUMN subject_id;
ALTER TABLE public.attendance ADD COLUMN course_code text NOT NULL;
ALTER TABLE public.attendance ADD UNIQUE (user_id, course_code, date);
