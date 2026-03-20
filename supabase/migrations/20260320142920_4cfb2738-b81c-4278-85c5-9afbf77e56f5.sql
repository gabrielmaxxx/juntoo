
-- Drop dependent function first
DROP FUNCTION IF EXISTS public.get_friends_events(uuid, integer);

-- Recreate events_with_details view with private_code protection
DROP VIEW IF EXISTS public.events_with_details;

CREATE VIEW public.events_with_details
WITH (security_invoker = on) AS
SELECT 
  e.id,
  e.title,
  e.description,
  e.category,
  e.date,
  e."time",
  e.location,
  e.city,
  e.state,
  e.price,
  e.max_participants,
  e.is_private,
  e.is_recurring,
  e.recurrence_type,
  e.recurrence_end_date,
  e.parent_event_id,
  e.image_url,
  e.created_by,
  e.created_at,
  e.updated_at,
  CASE WHEN e.created_by = auth.uid() THEN e.private_code ELSE NULL END AS private_code,
  p.full_name AS creator_name,
  p.avatar_url AS creator_avatar,
  COALESCE(pc.participants_count, 0) AS participants_count,
  COALESCE(rc.average_rating, (0)::numeric) AS average_rating,
  COALESCE(rc.review_count, 0) AS review_count
FROM events e
LEFT JOIN profiles p ON p.user_id = e.created_by
LEFT JOIN LATERAL (
  SELECT (count(*))::integer AS participants_count
  FROM event_participants ep WHERE ep.event_id = e.id
) pc ON true
LEFT JOIN LATERAL (
  SELECT avg(er.rating) AS average_rating, (count(*))::integer AS review_count
  FROM event_reviews er WHERE er.event_id = e.id
) rc ON true;

-- Recreate get_friends_events function
CREATE OR REPLACE FUNCTION public.get_friends_events(p_user_id uuid, p_limit integer DEFAULT 3)
RETURNS SETOF events_with_details
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ewd.*
  FROM events_with_details ewd
  JOIN event_participants ep ON ep.event_id = ewd.id
  JOIN friendships f ON (
    (f.user_id = p_user_id AND f.friend_id = ep.user_id)
    OR (f.friend_id = p_user_id AND f.user_id = ep.user_id)
  )
  WHERE f.status = 'accepted'
    AND ewd.is_private = false
    AND (ewd.date >= CURRENT_DATE OR ewd.is_recurring = true)
  ORDER BY ewd.date ASC
  LIMIT p_limit;
$$;

-- Tighten event_participants SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.event_participants;

CREATE POLICY "Users can view participants of accessible events" 
ON public.event_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = event_participants.event_id 
    AND (e.is_private = false OR e.created_by = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM event_participants ep2 
    WHERE ep2.event_id = event_participants.event_id 
    AND ep2.user_id = auth.uid()
  )
);

-- Create function to check profile visibility
CREATE OR REPLACE FUNCTION public.is_profile_public(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT show_profile_public FROM privacy_preferences WHERE user_id = target_user_id),
    true
  )
$$;

-- Update profiles SELECT policy to respect privacy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view accessible profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_profile_public(user_id)
  OR has_role(auth.uid(), 'moderator')
  OR has_role(auth.uid(), 'admin')
);
