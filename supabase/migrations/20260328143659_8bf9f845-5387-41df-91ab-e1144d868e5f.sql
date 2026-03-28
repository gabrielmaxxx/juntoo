-- Recreate events_with_details view to exclude massive base64 data URIs from image_url
-- Data URIs (2-3MB each) were causing API responses to timeout/exceed size limits
CREATE OR REPLACE VIEW public.events_with_details
WITH (security_invoker = on) AS
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
  e.is_recurring,
  e.recurrence_type,
  e.recurrence_end_date,
  e.parent_event_id,
  CASE 
    WHEN e.image_url LIKE 'data:%' THEN NULL 
    ELSE e.image_url 
  END AS image_url,
  e.created_by,
  e.created_at,
  e.updated_at,
  CASE 
    WHEN e.created_by = auth.uid() THEN e.private_code
    ELSE NULL
  END AS private_code,
  p.full_name AS creator_name,
  p.avatar_url AS creator_avatar,
  COALESCE(pc.participants_count, 0) AS participants_count,
  COALESCE(rc.average_rating, 0::numeric) AS average_rating,
  COALESCE(rc.review_count, 0) AS review_count
FROM events e
LEFT JOIN profiles p ON p.user_id = e.created_by
LEFT JOIN LATERAL (
  SELECT COUNT(*)::integer AS participants_count
  FROM event_participants ep
  WHERE ep.event_id = e.id
) pc ON true
LEFT JOIN LATERAL (
  SELECT AVG(er.rating) AS average_rating, COUNT(*)::integer AS review_count
  FROM event_reviews er
  WHERE er.event_id = e.id
) rc ON true;