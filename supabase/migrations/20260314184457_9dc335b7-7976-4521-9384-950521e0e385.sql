CREATE OR REPLACE FUNCTION public.notify_friend_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
BEGIN
  -- Check if recipient wants friend request notifications
  IF NOT user_wants_notification(NEW.friend_id, 'friend_request') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Alguém') INTO sender_name FROM profiles WHERE user_id = NEW.user_id;
  
  -- Ensure sender_name is never null
  sender_name := COALESCE(sender_name, 'Alguém');

  INSERT INTO public.notifications (
    user_id, type, title, message, event_id, read
  )
  VALUES (
    NEW.friend_id,
    'friend_request',
    'Nova solicitação de amizade',
    sender_name || ' quer ser seu amigo!',
    NEW.id,
    false
  );
  
  RETURN NEW;
END;
$function$;