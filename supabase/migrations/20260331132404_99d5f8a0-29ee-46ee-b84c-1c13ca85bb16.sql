
-- Pinned messages table
CREATE TABLE public.pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.event_messages(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, message_id)
);

ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- Participants can view pinned messages
CREATE POLICY "Participants can view pinned messages"
  ON public.pinned_messages FOR SELECT
  TO authenticated
  USING (is_event_participant(event_id, auth.uid()));

-- Only event creator can pin/unpin
CREATE POLICY "Creator can pin messages"
  ON public.pinned_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = pinned_by
    AND EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
  );

CREATE POLICY "Creator can unpin messages"
  ON public.pinned_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
  );
