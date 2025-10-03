-- Add foreign key for user_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_messages_user_id_fkey'
  ) THEN
    ALTER TABLE public.event_messages
    ADD CONSTRAINT event_messages_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;