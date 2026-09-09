-- =========================================
-- MARKETPLACE (Pilar 3) - somente modelagem
-- =========================================

CREATE TYPE public.marketplace_product_type AS ENUM ('produto', 'experiencia', 'ingresso');
CREATE TYPE public.marketplace_product_status AS ENUM ('rascunho', 'publicado', 'pausado', 'arquivado');
CREATE TYPE public.marketplace_order_status AS ENUM ('aguardando_pagamento', 'pago', 'cancelado', 'reembolsado', 'parcialmente_reembolsado', 'falhou');
CREATE TYPE public.marketplace_refund_status AS ENUM ('solicitado', 'aprovado', 'recusado', 'processado');
CREATE TYPE public.marketplace_refund_kind AS ENUM ('integral', 'parcial');
CREATE TYPE public.marketplace_dispute_status AS ENUM ('aberta', 'em_analise', 'resolvida_comprador', 'resolvida_organizador', 'encerrada');
CREATE TYPE public.marketplace_gateway AS ENUM ('nao_definido', 'mercado_pago', 'stripe');

-- ---------- PRODUTOS ----------
CREATE TABLE public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  image_url text,
  product_type public.marketplace_product_type NOT NULL DEFAULT 'produto',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'BRL',
  commission_percent numeric(5,2) NOT NULL DEFAULT 12.5 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  stock integer CHECK (stock IS NULL OR stock >= 0),
  status public.marketplace_product_status NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketplace_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_products TO authenticated;
GRANT ALL ON public.marketplace_products TO service_role;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtos publicados sao visiveis"
  ON public.marketplace_products FOR SELECT
  USING (status = 'publicado');

CREATE POLICY "Organizador ve seus produtos"
  ON public.marketplace_products FOR SELECT TO authenticated
  USING (organizer_id = auth.uid());

CREATE POLICY "Staff ve todos os produtos"
  ON public.marketplace_products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Organizador cria seus produtos"
  ON public.marketplace_products FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizador edita seus produtos"
  ON public.marketplace_products FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Staff edita produtos"
  ON public.marketplace_products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Organizador remove seus produtos"
  ON public.marketplace_products FOR DELETE TO authenticated
  USING (organizer_id = auth.uid());

CREATE INDEX idx_marketplace_products_organizer ON public.marketplace_products(organizer_id);
CREATE INDEX idx_marketplace_products_status ON public.marketplace_products(status);
CREATE INDEX idx_marketplace_products_event ON public.marketplace_products(event_id);

CREATE TRIGGER trg_marketplace_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- PEDIDOS ----------
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL,
  organizer_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  commission_percent numeric(5,2) NOT NULL DEFAULT 12.5,
  commission_cents integer NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  organizer_net_cents integer NOT NULL DEFAULT 0 CHECK (organizer_net_cents >= 0),
  currency text NOT NULL DEFAULT 'BRL',
  status public.marketplace_order_status NOT NULL DEFAULT 'aguardando_pagamento',
  gateway public.marketplace_gateway NOT NULL DEFAULT 'nao_definido',
  gateway_charge_id text,
  payment_method text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.marketplace_orders TO authenticated;
GRANT ALL ON public.marketplace_orders TO service_role;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comprador e organizador veem seus pedidos"
  ON public.marketplace_orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR organizer_id = auth.uid());

CREATE POLICY "Staff ve todos os pedidos"
  ON public.marketplace_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Comprador cria pedido"
  ON public.marketplace_orders FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Staff atualiza pedidos"
  ON public.marketplace_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_marketplace_orders_buyer ON public.marketplace_orders(buyer_id);
CREATE INDEX idx_marketplace_orders_organizer ON public.marketplace_orders(organizer_id);
CREATE INDEX idx_marketplace_orders_product ON public.marketplace_orders(product_id);
CREATE INDEX idx_marketplace_orders_status ON public.marketplace_orders(status);

CREATE TRIGGER trg_marketplace_orders_updated_at
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Calcula totais e split de comissao (12,5% padrao)
CREATE OR REPLACE FUNCTION public.marketplace_calc_order_amounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.total_cents := NEW.unit_price_cents * NEW.quantity;
  NEW.commission_cents := ROUND(NEW.total_cents * NEW.commission_percent / 100.0);
  NEW.organizer_net_cents := NEW.total_cents - NEW.commission_cents;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.marketplace_calc_order_amounts() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_marketplace_orders_amounts
  BEFORE INSERT OR UPDATE OF quantity, unit_price_cents, commission_percent
  ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_calc_order_amounts();

-- ---------- REEMBOLSOS (Anexo G) ----------
CREATE TABLE public.marketplace_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  refund_kind public.marketplace_refund_kind NOT NULL DEFAULT 'integral',
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  reason text NOT NULL,
  status public.marketplace_refund_status NOT NULL DEFAULT 'solicitado',
  policy_reference text NOT NULL DEFAULT 'Anexo G - Politica de Reembolso e Cancelamento',
  reviewed_by uuid,
  reviewer_notes text,
  reviewed_at timestamptz,
  processed_at timestamptz,
  respond_by timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.marketplace_refunds TO authenticated;
GRANT ALL ON public.marketplace_refunds TO service_role;
ALTER TABLE public.marketplace_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solicitante e organizador veem reembolsos"
  ON public.marketplace_refunds FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.organizer_id = auth.uid()))
  );

CREATE POLICY "Staff ve reembolsos"
  ON public.marketplace_refunds FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Comprador solicita reembolso"
  ON public.marketplace_refunds FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND o.buyer_id = auth.uid())
  );

CREATE POLICY "Staff analisa reembolso"
  ON public.marketplace_refunds FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_marketplace_refunds_order ON public.marketplace_refunds(order_id);
CREATE INDEX idx_marketplace_refunds_status ON public.marketplace_refunds(status);

CREATE TRIGGER trg_marketplace_refunds_updated_at
  BEFORE UPDATE ON public.marketplace_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- DISPUTAS (mediacao 72h, Anexo G) ----------
CREATE TABLE public.marketplace_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL,
  buyer_id uuid NOT NULL,
  organizer_id uuid NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status public.marketplace_dispute_status NOT NULL DEFAULT 'aberta',
  respond_by timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  moderator_id uuid,
  decision text,
  decision_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.marketplace_disputes TO authenticated;
GRANT ALL ON public.marketplace_disputes TO service_role;
ALTER TABLE public.marketplace_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partes veem suas disputas"
  ON public.marketplace_disputes FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR organizer_id = auth.uid());

CREATE POLICY "Staff ve disputas"
  ON public.marketplace_disputes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Partes abrem disputa"
  ON public.marketplace_disputes FOR INSERT TO authenticated
  WITH CHECK (
    opened_by = auth.uid()
    AND (buyer_id = auth.uid() OR organizer_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.organizer_id = auth.uid()))
  );

CREATE POLICY "Staff media disputa"
  ON public.marketplace_disputes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_marketplace_disputes_order ON public.marketplace_disputes(order_id);
CREATE INDEX idx_marketplace_disputes_status ON public.marketplace_disputes(status);
CREATE INDEX idx_marketplace_disputes_respond_by ON public.marketplace_disputes(respond_by);

CREATE TRIGGER trg_marketplace_disputes_updated_at
  BEFORE UPDATE ON public.marketplace_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- MENSAGENS DA DISPUTA ----------
CREATE TABLE public.marketplace_dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.marketplace_disputes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  message text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.marketplace_dispute_messages TO authenticated;
GRANT ALL ON public.marketplace_dispute_messages TO service_role;
ALTER TABLE public.marketplace_dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partes veem mensagens publicas da disputa"
  ON public.marketplace_dispute_messages FOR SELECT TO authenticated
  USING (
    is_internal = false
    AND EXISTS (SELECT 1 FROM public.marketplace_disputes d WHERE d.id = dispute_id AND (d.buyer_id = auth.uid() OR d.organizer_id = auth.uid()))
  );

CREATE POLICY "Staff ve mensagens da disputa"
  ON public.marketplace_dispute_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Partes e staff escrevem na disputa"
  ON public.marketplace_dispute_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
      OR (is_internal = false AND EXISTS (SELECT 1 FROM public.marketplace_disputes d WHERE d.id = dispute_id AND (d.buyer_id = auth.uid() OR d.organizer_id = auth.uid())))
    )
  );

CREATE INDEX idx_marketplace_dispute_messages_dispute ON public.marketplace_dispute_messages(dispute_id);