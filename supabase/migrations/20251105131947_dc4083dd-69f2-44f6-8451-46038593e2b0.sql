-- Create function to notify friend request
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
  sender_avatar TEXT;
BEGIN
  -- Get sender's name and avatar
  SELECT full_name, avatar_url INTO sender_name, sender_avatar 
  FROM profiles 
  WHERE user_id = NEW.user_id;
  
  -- Create notification for the friend request recipient
  INSERT INTO public.notifications (
    user_id, 
    type, 
    title, 
    message, 
    event_id,
    read
  )
  VALUES (
    NEW.friend_id,
    'friend_request',
    'Nova solicitação de amizade',
    sender_name || ' quer ser seu amigo!',
    NEW.id::text, -- Using friendship id as event_id for reference
    false
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for friend requests
DROP TRIGGER IF EXISTS on_friend_request_created ON friendships;
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON friendships
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_friend_request();

-- Create function to notify friend request accepted
CREATE OR REPLACE FUNCTION public.notify_friend_request_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accepter_name TEXT;
BEGIN
  -- Only notify when status changes from pending to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get accepter's name
    SELECT full_name INTO accepter_name 
    FROM profiles 
    WHERE user_id = NEW.friend_id;
    
    -- Notify the original requester
    INSERT INTO public.notifications (
      user_id, 
      type, 
      title, 
      message, 
      read
    )
    VALUES (
      NEW.user_id,
      'friend_request_accepted',
      'Solicitação aceita!',
      accepter_name || ' aceitou seu pedido de amizade!',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for friend request acceptance
DROP TRIGGER IF EXISTS on_friend_request_accepted ON friendships;
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request_accepted();