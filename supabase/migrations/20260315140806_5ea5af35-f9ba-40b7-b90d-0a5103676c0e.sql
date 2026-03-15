
-- RPC: Get unread counts for DMs and event messages in a single call
CREATE OR REPLACE FUNCTION public.get_unread_counts(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dm_unread bigint;
  event_unread bigint;
  notif_unread bigint;
BEGIN
  -- Unread DMs: messages in user's conversations, not sent by user, not read
  SELECT COUNT(*) INTO dm_unread
  FROM direct_messages dm
  JOIN conversation_participants cp ON cp.conversation_id = dm.conversation_id
  WHERE cp.user_id = p_user_id
    AND dm.sender_id != p_user_id
    AND dm.read = false;

  -- Unread event messages: messages in events user participates in, after last read
  SELECT COUNT(*) INTO event_unread
  FROM event_messages em
  JOIN event_participants ep ON ep.event_id = em.event_id AND ep.user_id = p_user_id
  LEFT JOIN event_message_reads emr ON emr.event_id = em.event_id AND emr.user_id = p_user_id
  WHERE em.user_id != p_user_id
    AND (emr.last_read_at IS NULL OR em.created_at > emr.last_read_at);

  -- Unread notifications (excluding new_message type)
  SELECT COUNT(*) INTO notif_unread
  FROM notifications
  WHERE user_id = p_user_id
    AND read = false
    AND type != 'new_message';

  RETURN json_build_object(
    'dm_unread', dm_unread,
    'event_unread', event_unread,
    'notif_unread', notif_unread
  );
END;
$$;

-- RPC: Get friends' events in a single query (replaces 3 sequential queries)
CREATE OR REPLACE FUNCTION public.get_friends_events(p_user_id uuid, p_limit integer DEFAULT 3)
RETURNS SETOF events_with_details
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
