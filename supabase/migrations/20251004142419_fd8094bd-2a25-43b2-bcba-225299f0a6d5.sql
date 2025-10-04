-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('event_join', 'new_message', 'new_event')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  event_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify when user joins event
CREATE OR REPLACE FUNCTION public.notify_event_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_title TEXT;
BEGIN
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, event_id)
  VALUES (
    NEW.user_id,
    'event_join',
    'Participação confirmada!',
    'Você confirmou presença em: ' || event_title,
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for event join notifications
CREATE TRIGGER on_event_join
AFTER INSERT ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_event_join();

-- Create function to notify participants of new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_id UUID;
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.user_id;
  
  FOR participant_id IN 
    SELECT user_id FROM event_participants 
    WHERE event_id = NEW.event_id AND user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, event_id)
    VALUES (
      participant_id,
      'new_message',
      'Nova mensagem no evento',
      sender_name || ' enviou uma mensagem',
      NEW.event_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new message notifications
CREATE TRIGGER on_new_message
AFTER INSERT ON public.event_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- Create function to notify users of new events matching their interests
CREATE OR REPLACE FUNCTION public.notify_matching_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Only notify for public events
  IF NEW.is_private = false THEN
    FOR profile_record IN 
      SELECT user_id FROM profiles 
      WHERE NEW.category = ANY(interests) AND user_id != NEW.created_by
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, event_id)
      VALUES (
        profile_record.user_id,
        'new_event',
        'Novo evento do seu interesse!',
        'Um novo evento de ' || NEW.category || ' foi criado: ' || NEW.title,
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new event notifications
CREATE TRIGGER on_new_event
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_events();