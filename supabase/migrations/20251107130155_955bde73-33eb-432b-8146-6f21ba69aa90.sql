-- Create trigger to notify users about new events matching their interests
CREATE TRIGGER trigger_notify_matching_events
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matching_events();