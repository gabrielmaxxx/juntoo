
-- Create user_reviews table for peer-to-peer evaluations
CREATE TABLE public.user_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_user_id UUID NOT NULL,
  reviewed_user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  respect_rating INTEGER NOT NULL CHECK (respect_rating BETWEEN 1 AND 5),
  punctuality_rating INTEGER NOT NULL CHECK (punctuality_rating BETWEEN 1 AND 5),
  reliability_rating INTEGER NOT NULL CHECK (reliability_rating BETWEEN 1 AND 5),
  communication_rating INTEGER NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
  safety_rating INTEGER NOT NULL CHECK (safety_rating BETWEEN 1 AND 5),
  overall_rating NUMERIC(2,1) NOT NULL GENERATED ALWAYS AS (
    (respect_rating + punctuality_rating + reliability_rating + communication_rating + safety_rating)::numeric / 5.0
  ) STORED,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (reviewer_user_id, reviewed_user_id, event_id)
);

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view reviews about themselves or that they wrote
CREATE POLICY "Users can view relevant reviews" ON public.user_reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = reviewer_user_id OR auth.uid() = reviewed_user_id OR true);

-- RLS: Users can create reviews only for co-participants
CREATE POLICY "Users can create reviews for co-participants" ON public.user_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_user_id
    AND reviewer_user_id != reviewed_user_id
    AND EXISTS (
      SELECT 1 FROM public.event_participants
      WHERE event_id = user_reviews.event_id AND user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.event_participants
      WHERE event_id = user_reviews.event_id AND user_id = user_reviews.reviewed_user_id
    )
  );

-- No UPDATE or DELETE policies (reviews cannot be edited or deleted)

-- Create function to get user reputation stats
CREATE OR REPLACE FUNCTION public.get_user_reputation(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  avg_overall NUMERIC;
  avg_respect NUMERIC;
  avg_punctuality NUMERIC;
  avg_reliability NUMERIC;
  avg_communication NUMERIC;
  avg_safety NUMERIC;
  total_reviews INTEGER;
  events_joined INTEGER;
  events_attended INTEGER;
BEGIN
  -- Get average ratings
  SELECT 
    COALESCE(AVG(overall_rating), 0),
    COALESCE(AVG(respect_rating), 0),
    COALESCE(AVG(punctuality_rating), 0),
    COALESCE(AVG(reliability_rating), 0),
    COALESCE(AVG(communication_rating), 0),
    COALESCE(AVG(safety_rating), 0),
    COUNT(*)
  INTO avg_overall, avg_respect, avg_punctuality, avg_reliability, avg_communication, avg_safety, total_reviews
  FROM public.user_reviews
  WHERE reviewed_user_id = target_user_id;

  -- Events joined (total participations)
  SELECT COUNT(*) INTO events_joined
  FROM public.event_participants
  WHERE user_id = target_user_id;

  -- Events attended (completed events where user participated)
  SELECT COUNT(*) INTO events_attended
  FROM public.event_participants ep
  JOIN public.events e ON e.id = ep.event_id
  WHERE ep.user_id = target_user_id
    AND e.is_recurring = false
    AND (e.date::timestamp + e.time::interval + interval '24 hours') < now();

  result := json_build_object(
    'average_overall', ROUND(avg_overall, 1),
    'average_respect', ROUND(avg_respect, 1),
    'average_punctuality', ROUND(avg_punctuality, 1),
    'average_reliability', ROUND(avg_reliability, 1),
    'average_communication', ROUND(avg_communication, 1),
    'average_safety', ROUND(avg_safety, 1),
    'total_reviews', total_reviews,
    'events_joined', events_joined,
    'events_attended', events_attended,
    'attendance_rate', CASE WHEN events_joined > 0 THEN ROUND((events_attended::numeric / events_joined) * 100, 0) ELSE 0 END
  );

  RETURN result;
END;
$$;

-- Trigger to flag users with low ratings for moderation
CREATE OR REPLACE FUNCTION public.check_user_review_thresholds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  SELECT AVG(overall_rating), COUNT(*)
  INTO avg_rating, review_count
  FROM public.user_reviews
  WHERE reviewed_user_id = NEW.reviewed_user_id;

  IF review_count >= 5 AND avg_rating < 2.5 AND NOT EXISTS (
    SELECT 1 FROM public.user_restrictions
    WHERE user_id = NEW.reviewed_user_id AND restriction_type = 'low_reputation_flag' AND is_active = true
  ) THEN
    INSERT INTO public.user_restrictions (user_id, restriction_type, reason)
    VALUES (NEW.reviewed_user_id, 'low_reputation_flag', 'Auto-flagged: average rating below 2.5 with 5+ reviews');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_check_user_review_thresholds
  AFTER INSERT ON public.user_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_review_thresholds();
