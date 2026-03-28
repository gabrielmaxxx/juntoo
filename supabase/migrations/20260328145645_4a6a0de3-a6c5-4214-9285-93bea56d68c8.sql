-- Fix recursive RLS on event_participants that breaks all event queries
CREATE OR REPLACE FUNCTION public.is_event_participant(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_participants
    WHERE event_id = _event_id
      AND user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Users can view participants of accessible events" ON public.event_participants;

CREATE POLICY "Users can view participants of accessible events"
ON public.event_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_participants.event_id
      AND (e.is_private = false OR e.created_by = auth.uid())
  )
  OR public.is_event_participant(event_participants.event_id, auth.uid())
);