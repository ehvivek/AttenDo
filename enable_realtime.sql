-- Enable Realtime for the assets table so students see instant updates when files are uploaded or deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'assets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE assets;
  END IF;
END;
$$;
