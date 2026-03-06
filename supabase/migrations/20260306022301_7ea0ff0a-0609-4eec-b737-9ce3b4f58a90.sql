
CREATE TABLE public.privacy_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  show_profile_public BOOLEAN NOT NULL DEFAULT true,
  show_location BOOLEAN NOT NULL DEFAULT true,
  allow_friend_requests BOOLEAN NOT NULL DEFAULT true,
  allow_direct_messages BOOLEAN NOT NULL DEFAULT true,
  show_online_status BOOLEAN NOT NULL DEFAULT true,
  show_events_participated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.privacy_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own privacy preferences"
  ON public.privacy_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy preferences"
  ON public.privacy_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy preferences"
  ON public.privacy_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
