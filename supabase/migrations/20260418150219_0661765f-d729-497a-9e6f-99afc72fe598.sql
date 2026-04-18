-- Add featured flag to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Index for fast featured lookup
CREATE INDEX IF NOT EXISTS idx_events_featured
ON public.events (is_featured, date)
WHERE is_featured = true;

-- Policy: only admins/moderators can update the is_featured flag
-- (general update policy already exists for creators; we add an admin override)
DROP POLICY IF EXISTS "Admins can feature events" ON public.events;
CREATE POLICY "Admins can feature events"
ON public.events
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));