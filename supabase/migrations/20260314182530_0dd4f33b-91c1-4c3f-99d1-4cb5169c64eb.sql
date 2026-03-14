ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'event_join'::text,
  'new_message'::text,
  'new_event'::text,
  'event_updated'::text,
  'participant_joined'::text,
  'friend_request'::text,
  'friend_request_accepted'::text,
  'event_reminder'::text
]));