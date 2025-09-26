-- Create events table first
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  max_participants INTEGER,
  is_private BOOLEAN DEFAULT false,
  private_code TEXT UNIQUE,
  image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create event participants table
CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on participants
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Create basic policies for events (without referencing event_participants)
CREATE POLICY "Public events are viewable by everyone" 
ON public.events 
FOR SELECT 
USING (is_private = false);

CREATE POLICY "Private events are viewable by creator" 
ON public.events 
FOR SELECT 
USING (is_private = true AND auth.uid() = created_by);

CREATE POLICY "Users can create their own events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events" 
ON public.events 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create policies for event participants
CREATE POLICY "Event creators can view participants" 
ON public.event_participants 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.events 
  WHERE id = event_id AND created_by = auth.uid()
));

CREATE POLICY "Participants can view other participants"
ON public.event_participants
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.event_participants ep2 
  WHERE ep2.event_id = event_participants.event_id AND ep2.user_id = auth.uid()
));

CREATE POLICY "Users can join events" 
ON public.event_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events" 
ON public.event_participants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to generate unique private codes
CREATE OR REPLACE FUNCTION generate_private_code()
RETURNS TEXT AS $$
BEGIN
  RETURN substr(md5(random()::text || clock_timestamp()::text), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate private codes for private events
CREATE OR REPLACE FUNCTION set_private_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_private = true AND NEW.private_code IS NULL THEN
    NEW.private_code = generate_private_code();
  ELSIF NEW.is_private = false THEN
    NEW.private_code = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_event_private_code
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION set_private_code();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();