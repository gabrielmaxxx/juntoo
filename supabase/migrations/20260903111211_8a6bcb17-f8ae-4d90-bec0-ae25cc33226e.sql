-- 1) Sponsorship columns on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_tier text,
  ADD COLUMN IF NOT EXISTS sponsor_expires_at timestamptz;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_sponsor_tier_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_sponsor_tier_check
  CHECK (sponsor_tier IS NULL OR sponsor_tier IN ('basico','segmentado','cpm'));

CREATE INDEX IF NOT EXISTS idx_events_sponsored ON public.events (is_sponsored, sponsor_expires_at);

-- Only staff can toggle sponsorship fields
CREATE OR REPLACE FUNCTION public.enforce_sponsorship_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(NEW.is_sponsored,false) IS DISTINCT FROM COALESCE(OLD.is_sponsored,false))
     OR (NEW.sponsor_tier IS DISTINCT FROM OLD.sponsor_tier)
     OR (NEW.sponsor_expires_at IS DISTINCT FROM OLD.sponsor_expires_at) THEN
    IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'moderator') OR public.is_service_role()) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o patrocínio de um evento';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_sponsorship_admin_only() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_enforce_sponsorship_admin_only ON public.events;
CREATE TRIGGER trg_enforce_sponsorship_admin_only
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsorship_admin_only();

-- 2) Log table
CREATE TABLE IF NOT EXISTS public.sponsored_events_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sponsor_tier text NOT NULL CHECK (sponsor_tier IN ('basico','segmentado','cpm')),
  amount_charged numeric(10,2),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  action text NOT NULL DEFAULT 'activated' CHECK (action IN ('activated','deactivated')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsored_events_log TO authenticated;
GRANT ALL ON public.sponsored_events_log TO service_role;

ALTER TABLE public.sponsored_events_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view sponsorship log" ON public.sponsored_events_log;
CREATE POLICY "Staff can view sponsorship log" ON public.sponsored_events_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "Staff can insert sponsorship log" ON public.sponsored_events_log;
CREATE POLICY "Staff can insert sponsorship log" ON public.sponsored_events_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "Admins can update sponsorship log" ON public.sponsored_events_log;
CREATE POLICY "Admins can update sponsorship log" ON public.sponsored_events_log
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins can delete sponsorship log" ON public.sponsored_events_log;
CREATE POLICY "Admins can delete sponsorship log" ON public.sponsored_events_log
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER update_sponsored_events_log_updated_at
  BEFORE UPDATE ON public.sponsored_events_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sponsored_events_log_event ON public.sponsored_events_log (event_id, created_at DESC);

-- 3) Expose sponsorship on the public listing view
CREATE OR REPLACE VIEW public.events_with_details
WITH (security_invoker = on) AS
SELECT e.id,
    e.title,
    e.description,
    e.category,
    e.date,
    e."time",
    e.location,
    e.city,
    e.state,
    e.price,
    e.max_participants,
    e.is_private,
    e.is_recurring,
    e.recurrence_type,
    e.recurrence_end_date,
    e.parent_event_id,
        CASE
            WHEN e.image_url ~~ 'data:%'::text THEN NULL::text
            ELSE e.image_url
        END AS image_url,
    e.created_by,
    e.created_at,
    e.updated_at,
        CASE
            WHEN e.created_by = auth.uid() THEN e.private_code
            ELSE NULL::text
        END AS private_code,
    p.full_name AS creator_name,
    p.avatar_url AS creator_avatar,
    COALESCE(pc.participants_count, 0) AS participants_count,
    COALESCE(rc.average_rating, 0::numeric) AS average_rating,
    COALESCE(rc.review_count, 0) AS review_count,
    e.is_featured,
    (COALESCE(e.is_sponsored, false) AND (e.sponsor_expires_at IS NULL OR e.sponsor_expires_at > now())) AS is_sponsored,
    e.sponsor_tier,
    e.sponsor_expires_at
   FROM events e
     LEFT JOIN profiles p ON p.user_id = e.created_by
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS participants_count
           FROM event_participants ep
          WHERE ep.event_id = e.id) pc ON true
     LEFT JOIN LATERAL ( SELECT avg(er.rating) AS average_rating,
            count(*)::integer AS review_count
           FROM event_reviews er
          WHERE er.event_id = e.id) rc ON true;