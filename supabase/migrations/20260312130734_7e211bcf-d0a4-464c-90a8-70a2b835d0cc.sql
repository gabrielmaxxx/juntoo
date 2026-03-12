
-- Add super_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Create moderation_logs table
CREATE TABLE public.moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all logs"
  ON public.moderation_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs"
  ON public.moderation_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX idx_moderation_logs_admin ON public.moderation_logs(admin_id);
CREATE INDEX idx_moderation_logs_target ON public.moderation_logs(target_type, target_id);
CREATE INDEX idx_moderation_logs_created ON public.moderation_logs(created_at DESC);
