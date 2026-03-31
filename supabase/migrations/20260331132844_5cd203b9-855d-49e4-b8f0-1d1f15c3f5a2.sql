
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '' CHECK (char_length(bio) <= 150);
