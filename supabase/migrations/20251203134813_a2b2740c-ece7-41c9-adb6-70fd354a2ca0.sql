-- Create table for pinned events
CREATE TABLE public.pinned_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.pinned_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own pinned events
CREATE POLICY "Users can view their own pinned events"
ON public.pinned_events
FOR SELECT
USING (auth.uid() = user_id);

-- Users can pin events
CREATE POLICY "Users can pin events"
ON public.pinned_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unpin events
CREATE POLICY "Users can unpin events"
ON public.pinned_events
FOR DELETE
USING (auth.uid() = user_id);