
-- Table for tracking read state of event chat messages per user
CREATE TABLE public.event_message_reads (
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

ALTER TABLE public.event_message_reads ENABLE ROW LEVEL SECURITY;

-- Users can view their own read state
CREATE POLICY "Users can view own event message reads"
  ON public.event_message_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can upsert their own read state
CREATE POLICY "Users can upsert own event message reads"
  ON public.event_message_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event message reads"
  ON public.event_message_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_message_reads;
