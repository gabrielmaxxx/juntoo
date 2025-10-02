-- Create event_messages table for chat functionality
CREATE TABLE IF NOT EXISTS public.event_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Only participants can view messages
CREATE POLICY "Participants can view event messages"
ON public.event_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_participants
    WHERE event_participants.event_id = event_messages.event_id
    AND event_participants.user_id = auth.uid()
  )
);

-- Policy: Only participants can send messages
CREATE POLICY "Participants can send messages"
ON public.event_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.event_participants
    WHERE event_participants.event_id = event_messages.event_id
    AND event_participants.user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_event_messages_event_id ON public.event_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_created_at ON public.event_messages(created_at);