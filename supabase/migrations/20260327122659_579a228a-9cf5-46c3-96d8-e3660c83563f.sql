
-- 1. User consents table for LGPD
CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_terms_version text NOT NULL DEFAULT '1.0',
  accepted_privacy_version text NOT NULL DEFAULT '1.0',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, accepted_terms_version, accepted_privacy_version)
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents" ON public.user_consents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents" ON public.user_consents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. User data requests table
CREATE TABLE public.user_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL, -- 'export' or 'deletion'
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, cancelled
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_data_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data requests" ON public.user_data_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own data requests" ON public.user_data_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage data requests" ON public.user_data_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- 3. Activity logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  ip_address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- 4. Add safety_acknowledged to event_participants
ALTER TABLE public.event_participants ADD COLUMN IF NOT EXISTS safety_acknowledged boolean NOT NULL DEFAULT false;

-- 5. Create index for activity_logs
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_data_requests_user_id ON public.user_data_requests(user_id);
