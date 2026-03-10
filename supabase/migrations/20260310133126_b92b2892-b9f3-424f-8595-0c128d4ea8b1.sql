
-- Add verification columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'user',
ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_level integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS business_verified boolean NOT NULL DEFAULT false;

-- Create user_verifications table
CREATE TABLE public.user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_url text NOT NULL,
  selfie_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own verification" ON public.user_verifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own verification" ON public.user_verifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all verifications" ON public.user_verifications
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Moderators can update verifications" ON public.user_verifications
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
  );

-- Create business_verifications table
CREATE TABLE public.business_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  trade_name text,
  cnpj text NOT NULL,
  company_document_url text NOT NULL,
  owner_document_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT unique_cnpj UNIQUE (cnpj)
);

ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own business verification" ON public.business_verifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own business verification" ON public.business_verifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all business verifications" ON public.business_verifications
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Moderators can update business verifications" ON public.business_verifications
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
  );

-- Create verification-documents storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can upload their own docs
CREATE POLICY "Users can upload verification docs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own verification docs" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Moderators can view all verification docs" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'verification-documents' AND (
      public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Function to approve user verification
CREATE OR REPLACE FUNCTION public.approve_user_verification(p_verification_id uuid, p_moderator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Update verification status
  UPDATE user_verifications
  SET status = 'approved', reviewed_by = p_moderator_id, reviewed_at = now()
  WHERE id = p_verification_id AND status = 'pending'
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verification not found or already reviewed';
  END IF;

  -- Update profile
  UPDATE profiles SET verified = true, verification_level = 1 WHERE user_id = v_user_id;

  -- Reputation bonus
  INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
  VALUES (v_user_id, 5, 'Verificação de identidade aprovada', p_moderator_id);

  -- Update trust score
  INSERT INTO user_trust_scores (user_id, score, updated_at)
  VALUES (v_user_id, 105, now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = LEAST(100, user_trust_scores.score + 5),
    updated_at = now();
END;
$$;

-- Function to approve business verification
CREATE OR REPLACE FUNCTION public.approve_business_verification(p_verification_id uuid, p_moderator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE business_verifications
  SET status = 'approved', reviewed_by = p_moderator_id, reviewed_at = now()
  WHERE id = p_verification_id AND status = 'pending'
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verification not found or already reviewed';
  END IF;

  UPDATE profiles SET business_verified = true, verification_level = 2 WHERE user_id = v_user_id;

  INSERT INTO user_reputation_log (user_id, change_amount, reason, moderator_id)
  VALUES (v_user_id, 5, 'Verificação empresarial aprovada', p_moderator_id);

  INSERT INTO user_trust_scores (user_id, score, updated_at)
  VALUES (v_user_id, 105, now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = LEAST(100, user_trust_scores.score + 5),
    updated_at = now();
END;
$$;
