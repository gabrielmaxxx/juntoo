CREATE TYPE public.partnership_status AS ENUM ('prospeccao','conversa_aberta','teste_agendado','parceria_ativa','encerrada');
CREATE TYPE public.partnership_modality AS ENUM ('troca_de_valor','destaque_simples','comissao_evento','assinatura_empresarial');

CREATE TABLE public.partnership_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  status public.partnership_status NOT NULL DEFAULT 'prospeccao',
  modality public.partnership_modality NOT NULL DEFAULT 'troca_de_valor',
  monthly_value numeric,
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  business_verification_id uuid REFERENCES public.business_verifications(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnership_leads TO authenticated;
GRANT ALL ON public.partnership_leads TO service_role;

ALTER TABLE public.partnership_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view partnership leads" ON public.partnership_leads
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Staff can create partnership leads" ON public.partnership_leads
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Staff can update partnership leads" ON public.partnership_leads
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins can delete partnership leads" ON public.partnership_leads
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX idx_partnership_leads_status ON public.partnership_leads(status);

CREATE TRIGGER update_partnership_leads_updated_at
BEFORE UPDATE ON public.partnership_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();