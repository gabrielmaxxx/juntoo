-- Table for spontaneous availability
CREATE TABLE public.availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interests TEXT[] NOT NULL DEFAULT '{}',
  city TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT one_active_per_user UNIQUE (user_id, is_active)
);

-- Index for cleanup cron and queries
CREATE INDEX idx_availability_expires_at ON public.availability (expires_at) WHERE is_active = true;
CREATE INDEX idx_availability_city_active ON public.availability (city, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see active availability
CREATE POLICY "Users can view active availability"
  ON public.availability FOR SELECT
  TO authenticated
  USING (is_active = true AND expires_at > now());

-- Users can insert their own availability
CREATE POLICY "Users can create own availability"
  ON public.availability FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own availability (deactivate)
CREATE POLICY "Users can update own availability"
  ON public.availability FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own availability
CREATE POLICY "Users can delete own availability"
  ON public.availability FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Cleanup function for expired availability
CREATE OR REPLACE FUNCTION public.cleanup_expired_availability()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.availability
  SET is_active = false
  WHERE is_active = true AND expires_at <= now();
$$;

-- Function to get available users with common interests in the same city
CREATE OR REPLACE FUNCTION public.get_available_users(
  p_user_id UUID,
  p_city TEXT DEFAULT NULL,
  p_interests TEXT[] DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  interests TEXT[],
  city TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  full_name TEXT,
  avatar_url TEXT,
  common_interests TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.user_id,
    a.interests,
    a.city,
    a.location_lat,
    a.location_lng,
    a.expires_at,
    a.created_at,
    p.full_name,
    p.avatar_url,
    ARRAY(
      SELECT unnest(a.interests)
      INTERSECT
      SELECT unnest(p_interests)
    ) AS common_interests
  FROM public.availability a
  JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.is_active = true
    AND a.expires_at > now()
    AND a.user_id != p_user_id
    AND (p_city IS NULL OR a.city = p_city)
    AND a.interests && p_interests
  ORDER BY a.created_at DESC
  LIMIT 50;
$$;