
-- Create report status enum
CREATE TYPE public.report_status AS ENUM ('created', 'under_review', 'resolved', 'dismissed');

-- Create report category enum
CREATE TYPE public.report_category AS ENUM (
  'harassment',
  'hate_speech',
  'sexual_content',
  'spam',
  'fraud',
  'fake_profile',
  'suspicious_behavior',
  'dangerous_event',
  'misleading_event',
  'other'
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID NOT NULL,
  reported_user_id UUID,
  reported_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  reported_message_id UUID,
  category report_category NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  evidence_image_url TEXT,
  status report_status NOT NULL DEFAULT 'created',
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  reviewer_notes TEXT
);

-- Create user_restrictions table for safety triggers
CREATE TABLE public.user_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  restriction_type TEXT NOT NULL, -- 'flagged', 'restricted', 'priority_review'
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create user_roles table for moderators
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_user_id OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- RLS on user_restrictions
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can manage restrictions"
  ON public.user_restrictions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own restrictions"
  ON public.user_restrictions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Auto-mark urgent reports trigger
CREATE OR REPLACE FUNCTION public.auto_mark_urgent_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category IN ('harassment', 'hate_speech', 'sexual_content', 'fraud', 'dangerous_event') THEN
    NEW.is_urgent = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_auto_mark_urgent
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_mark_urgent_report();

-- Auto safety triggers function
CREATE OR REPLACE FUNCTION public.check_report_thresholds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID;
  reports_24h INTEGER;
  reports_7d INTEGER;
BEGIN
  target_user := NEW.reported_user_id;
  IF target_user IS NULL THEN RETURN NEW; END IF;

  -- Count reports in last 24 hours
  SELECT COUNT(*) INTO reports_24h
  FROM public.reports
  WHERE reported_user_id = target_user
    AND created_at > now() - interval '24 hours';

  -- Count reports in last 7 days
  SELECT COUNT(*) INTO reports_7d
  FROM public.reports
  WHERE reported_user_id = target_user
    AND created_at > now() - interval '7 days';

  -- 3 reports in 24h -> flag
  IF reports_24h >= 3 AND NOT EXISTS (
    SELECT 1 FROM public.user_restrictions
    WHERE user_id = target_user AND restriction_type = 'flagged' AND is_active = true
  ) THEN
    INSERT INTO public.user_restrictions (user_id, restriction_type, reason)
    VALUES (target_user, 'flagged', 'Auto-flagged: 3+ reports in 24 hours');
  END IF;

  -- 5 reports in 24h -> priority review
  IF reports_24h >= 5 AND NOT EXISTS (
    SELECT 1 FROM public.user_restrictions
    WHERE user_id = target_user AND restriction_type = 'priority_review' AND is_active = true
  ) THEN
    INSERT INTO public.user_restrictions (user_id, restriction_type, reason)
    VALUES (target_user, 'priority_review', 'Auto-priority: 5+ reports in 24 hours');
  END IF;

  -- 10 reports in 7d -> restrict
  IF reports_7d >= 10 AND NOT EXISTS (
    SELECT 1 FROM public.user_restrictions
    WHERE user_id = target_user AND restriction_type = 'restricted' AND is_active = true
  ) THEN
    INSERT INTO public.user_restrictions (user_id, restriction_type, reason, expires_at)
    VALUES (target_user, 'restricted', 'Auto-restricted: 10+ reports in 7 days', now() + interval '7 days');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_check_report_thresholds
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_report_thresholds();

-- Storage bucket for report evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-evidence', 'report-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for report evidence
CREATE POLICY "Users can upload evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Moderators can view evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-evidence' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  ));
