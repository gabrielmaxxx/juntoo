
-- Comprehensive platform metrics RPC
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  now_ts timestamptz := now();
  today_start timestamptz := date_trunc('day', now_ts);
  yesterday_start timestamptz := today_start - interval '1 day';
  week_ago timestamptz := now_ts - interval '7 days';
  month_ago timestamptz := now_ts - interval '30 days';
BEGIN
  SELECT json_build_object(
    -- NORTH STAR: completed events with real participation
    'north_star', (
      SELECT json_build_object(
        'completed_events_with_participants', (
          SELECT COUNT(DISTINCT e.id) FROM events e
          JOIN event_participants ep ON ep.event_id = e.id
          WHERE e.is_recurring = false
            AND (e.date::timestamp + e.time::interval) < now_ts
        ),
        'total_participations_completed', (
          SELECT COUNT(*) FROM event_participants ep
          JOIN events e ON e.id = ep.event_id
          WHERE e.is_recurring = false
            AND (e.date::timestamp + e.time::interval) < now_ts
        ),
        'avg_participants_per_completed', (
          SELECT COALESCE(ROUND(AVG(cnt), 1), 0) FROM (
            SELECT COUNT(ep.id) as cnt FROM events e
            JOIN event_participants ep ON ep.event_id = e.id
            WHERE e.is_recurring = false
              AND (e.date::timestamp + e.time::interval) < now_ts
            GROUP BY e.id
          ) sub
        )
      )
    ),

    -- ACQUISITION
    'acquisition', (
      SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'new_today', (SELECT COUNT(*) FROM profiles WHERE created_at >= today_start),
        'new_yesterday', (SELECT COUNT(*) FROM profiles WHERE created_at >= yesterday_start AND created_at < today_start),
        'new_this_week', (SELECT COUNT(*) FROM profiles WHERE created_at >= week_ago),
        'new_this_month', (SELECT COUNT(*) FROM profiles WHERE created_at >= month_ago),
        'onboarding_completed', (SELECT COUNT(*) FROM profiles WHERE onboarding_completed = true),
        'onboarding_rate', (
          SELECT CASE WHEN COUNT(*) > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE onboarding_completed = true))::numeric / COUNT(*) * 100, 1)
            ELSE 0 END
          FROM profiles
        )
      )
    ),

    -- ACTIVATION
    'activation', (
      SELECT json_build_object(
        'users_joined_events', (SELECT COUNT(DISTINCT user_id) FROM event_participants),
        'users_created_events', (SELECT COUNT(DISTINCT created_by) FROM events),
        'activation_rate', (
          SELECT CASE WHEN COUNT(*) > 0
            THEN ROUND((SELECT COUNT(DISTINCT user_id) FROM event_participants)::numeric / COUNT(*) * 100, 1)
            ELSE 0 END
          FROM profiles
        ),
        'activated_first_24h', (
          SELECT COUNT(DISTINCT ep.user_id) FROM event_participants ep
          JOIN profiles p ON p.user_id = ep.user_id
          WHERE ep.joined_at <= p.created_at + interval '24 hours'
        ),
        'activation_24h_rate', (
          SELECT CASE WHEN COUNT(*) > 0
            THEN ROUND(
              (SELECT COUNT(DISTINCT ep.user_id) FROM event_participants ep
               JOIN profiles p ON p.user_id = ep.user_id
               WHERE ep.joined_at <= p.created_at + interval '24 hours')::numeric 
              / COUNT(*) * 100, 1)
            ELSE 0 END
          FROM profiles
        )
      )
    ),

    -- ENGAGEMENT
    'engagement', (
      SELECT json_build_object(
        'total_messages', (SELECT COUNT(*) FROM event_messages),
        'messages_today', (SELECT COUNT(*) FROM event_messages WHERE created_at >= today_start),
        'messages_this_week', (SELECT COUNT(*) FROM event_messages WHERE created_at >= week_ago),
        'events_with_chat_activity', (SELECT COUNT(DISTINCT event_id) FROM event_messages WHERE created_at >= week_ago),
        'dm_count_week', (SELECT COUNT(*) FROM direct_messages WHERE created_at >= week_ago),
        'avg_participations_per_event', (
          SELECT COALESCE(ROUND(AVG(cnt), 1), 0) FROM (
            SELECT COUNT(*) as cnt FROM event_participants GROUP BY event_id
          ) sub
        ),
        'total_reviews', (SELECT COUNT(*) FROM user_reviews),
        'reviews_this_week', (SELECT COUNT(*) FROM user_reviews WHERE created_at >= week_ago)
      )
    ),

    -- RETENTION
    'retention', (
      SELECT json_build_object(
        'd1_retention', (
          SELECT CASE WHEN COUNT(DISTINCT p.user_id) > 0
            THEN ROUND(
              COUNT(DISTINCT CASE WHEN EXISTS (
                SELECT 1 FROM event_participants ep 
                WHERE ep.user_id = p.user_id AND ep.joined_at >= p.created_at + interval '1 day'
              ) THEN p.user_id END)::numeric / COUNT(DISTINCT p.user_id) * 100, 1)
            ELSE 0 END
          FROM profiles p WHERE p.created_at < now_ts - interval '1 day'
        ),
        'd7_retention', (
          SELECT CASE WHEN COUNT(DISTINCT p.user_id) > 0
            THEN ROUND(
              COUNT(DISTINCT CASE WHEN EXISTS (
                SELECT 1 FROM event_participants ep 
                WHERE ep.user_id = p.user_id AND ep.joined_at >= p.created_at + interval '7 days'
              ) THEN p.user_id END)::numeric / COUNT(DISTINCT p.user_id) * 100, 1)
            ELSE 0 END
          FROM profiles p WHERE p.created_at < now_ts - interval '7 days'
        ),
        'recurring_participants', (
          SELECT COUNT(*) FROM (
            SELECT user_id FROM event_participants GROUP BY user_id HAVING COUNT(DISTINCT event_id) >= 2
          ) sub
        ),
        'recurring_rate', (
          SELECT CASE WHEN COUNT(DISTINCT user_id) > 0
            THEN ROUND(
              (SELECT COUNT(*) FROM (SELECT user_id FROM event_participants GROUP BY user_id HAVING COUNT(DISTINCT event_id) >= 2) sub)::numeric
              / COUNT(DISTINCT user_id) * 100, 1)
            ELSE 0 END
          FROM event_participants
        )
      )
    ),

    -- TRUST & SAFETY
    'trust', (
      SELECT json_build_object(
        'avg_user_rating', (SELECT COALESCE(ROUND(AVG(overall_rating), 2), 0) FROM user_reviews),
        'avg_event_rating', (SELECT COALESCE(ROUND(AVG(rating), 2), 0) FROM event_reviews),
        'total_reports', (SELECT COUNT(*) FROM reports),
        'open_reports', (SELECT COUNT(*) FROM reports WHERE status = 'created'),
        'reports_this_week', (SELECT COUNT(*) FROM reports WHERE created_at >= week_ago),
        'problematic_users', (SELECT COUNT(DISTINCT user_id) FROM user_restrictions WHERE is_active = true),
        'active_penalties', (SELECT COUNT(*) FROM user_penalties WHERE is_active = true),
        'banned_users', (SELECT COUNT(DISTINCT user_id) FROM user_penalties WHERE penalty_type = 'ban' AND is_active = true),
        'suspended_users', (SELECT COUNT(DISTINCT user_id) FROM user_penalties WHERE penalty_type = 'suspension' AND is_active = true AND (expires_at IS NULL OR expires_at > now_ts)),
        'verified_users', (SELECT COUNT(*) FROM profiles WHERE verified = true),
        'verification_rate', (
          SELECT CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE verified = true)::numeric / COUNT(*) * 100, 1)
            ELSE 0 END
          FROM profiles
        )
      )
    ),

    -- CONTENT
    'content', (
      SELECT json_build_object(
        'total_events', (SELECT COUNT(*) FROM events),
        'events_today', (SELECT COUNT(*) FROM events WHERE created_at >= today_start),
        'events_this_week', (SELECT COUNT(*) FROM events WHERE created_at >= week_ago),
        'active_events', (SELECT COUNT(*) FROM events WHERE date >= CURRENT_DATE AND is_recurring = false),
        'private_events', (SELECT COUNT(*) FROM events WHERE is_private = true),
        'recurring_events', (SELECT COUNT(*) FROM events WHERE is_recurring = true),
        'total_friendships', (SELECT COUNT(*) FROM friendships WHERE status = 'accepted'),
        'pending_friend_requests', (SELECT COUNT(*) FROM friendships WHERE status = 'pending')
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;
