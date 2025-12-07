-- Drop and recreate view with SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.events_with_details;

CREATE VIEW public.events_with_details 
WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.title,
  e.description,
  e.category,
  e.date,
  e.time,
  e.location,
  e.city,
  e.state,
  e.price,
  e.max_participants,
  e.is_private,
  e.private_code,
  e.is_recurring,
  e.recurrence_type,
  e.recurrence_end_date,
  e.parent_event_id,
  e.image_url,
  e.created_by,
  e.created_at,
  e.updated_at,
  p.full_name as creator_name,
  p.avatar_url as creator_avatar,
  COALESCE(pc.participants_count, 0)::integer as participants_count,
  COALESCE(rc.average_rating, 0)::numeric as average_rating,
  COALESCE(rc.review_count, 0)::integer as review_count
FROM events e
LEFT JOIN profiles p ON p.user_id = e.created_by
LEFT JOIN LATERAL (
  SELECT COUNT(*)::integer as participants_count
  FROM event_participants ep
  WHERE ep.event_id = e.id
) pc ON true
LEFT JOIN LATERAL (
  SELECT 
    AVG(er.rating)::numeric as average_rating,
    COUNT(*)::integer as review_count
  FROM event_reviews er
  WHERE er.event_id = e.id
) rc ON true;