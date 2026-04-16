
-- =============================================
-- 1. EVENT MESSAGES: Allow author to UPDATE and DELETE own messages
-- =============================================

-- Author can edit their own message
CREATE POLICY "Author can update own messages"
ON public.event_messages
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Author can delete their own message
CREATE POLICY "Author can delete own messages"
ON public.event_messages
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- 2. USER REVIEWS: Allow UPDATE and DELETE within 24h
-- =============================================

-- Reviewer can update within 24 hours
CREATE POLICY "Reviewer can update own review within 24h"
ON public.user_reviews
FOR UPDATE TO authenticated
USING (
  auth.uid() = reviewer_user_id
  AND created_at > now() - interval '24 hours'
)
WITH CHECK (auth.uid() = reviewer_user_id);

-- Reviewer can delete within 24 hours
CREATE POLICY "Reviewer can delete own review within 24h"
ON public.user_reviews
FOR DELETE TO authenticated
USING (
  auth.uid() = reviewer_user_id
  AND created_at > now() - interval '24 hours'
);

-- =============================================
-- 3. PRIVATE EVENTS: Participants can view private events they joined
-- =============================================

CREATE POLICY "Participants can view private events they joined"
ON public.events
FOR SELECT TO authenticated
USING (
  is_private = true
  AND is_event_participant(id, auth.uid())
);

-- =============================================
-- 4. CAPACITY CHECK TRIGGER: Prevent joining full events
-- =============================================

CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_cap integer;
BEGIN
  -- Get event max_participants
  SELECT max_participants INTO max_cap
  FROM events WHERE id = NEW.event_id;

  -- If no limit set, allow
  IF max_cap IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count current participants
  SELECT COUNT(*) INTO current_count
  FROM event_participants
  WHERE event_id = NEW.event_id;

  IF current_count >= max_cap THEN
    RAISE EXCEPTION 'Event is full (% of % spots taken)', current_count, max_cap;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_event_capacity
BEFORE INSERT ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.check_event_capacity();
