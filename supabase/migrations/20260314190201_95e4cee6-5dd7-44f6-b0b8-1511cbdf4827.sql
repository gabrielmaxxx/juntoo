-- Fix conversation_participants RLS to use security definer function (avoid self-referencing)
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
TO public
USING (
  is_conversation_member(auth.uid(), conversation_id)
);

-- Create trigger to notify recipient of new direct messages
CREATE OR REPLACE FUNCTION public.notify_direct_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
BEGIN
  -- Find the other participant in the conversation
  SELECT cp.user_id INTO recipient_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id
  LIMIT 1;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if recipient wants message notifications
  IF NOT user_wants_notification(recipient_id, 'new_message') THEN
    RETURN NEW;
  END IF;

  -- Get sender name
  SELECT COALESCE(full_name, 'Alguém') INTO sender_name
  FROM profiles
  WHERE user_id = NEW.sender_id;

  sender_name := COALESCE(sender_name, 'Alguém');

  INSERT INTO public.notifications (user_id, type, title, message, read)
  VALUES (
    recipient_id,
    'new_message',
    'Nova mensagem',
    sender_name || ': ' || LEFT(NEW.content, 100),
    false
  );

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_direct_message_notify ON public.direct_messages;
CREATE TRIGGER on_direct_message_notify
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_direct_message();