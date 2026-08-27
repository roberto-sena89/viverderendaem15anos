CREATE TABLE IF NOT EXISTS public.alertas_preco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('acima', 'abaixo')),
  valor_alvo numeric NOT NULL CHECK (valor_alvo > 0),
  ativo boolean NOT NULL DEFAULT true,
  disparado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alertas_preco_user ON public.alertas_preco (user_id);
CREATE INDEX IF NOT EXISTS idx_alertas_preco_ticker ON public.alertas_preco (ticker) WHERE ativo = true;
GRANT ALL ON public.alertas_preco TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas_preco TO authenticated;
ALTER TABLE public.alertas_preco ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own price alerts" ON public.alertas_preco FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own price alerts" ON public.alertas_preco FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own price alerts" ON public.alertas_preco FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own price alerts" ON public.alertas_preco FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.carteiras_compartilhadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  nome text NOT NULL DEFAULT 'Minha carteira',
  ativos jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_patrimonio numeric NOT NULL DEFAULT 0,
  dividend_yield numeric,
  renda_mensal_estimada numeric,
  incluir_valores boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz
);
CREATE INDEX IF NOT EXISTS idx_carteiras_compartilhadas_user ON public.carteiras_compartilhadas (user_id);
CREATE INDEX IF NOT EXISTS idx_carteiras_compartilhadas_token ON public.carteiras_compartilhadas (token);
GRANT ALL ON public.carteiras_compartilhadas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carteiras_compartilhadas TO authenticated;
ALTER TABLE public.carteiras_compartilhadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own shared cards" ON public.carteiras_compartilhadas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own shared cards" ON public.carteiras_compartilhadas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shared cards" ON public.carteiras_compartilhadas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shared cards" ON public.carteiras_compartilhadas FOR DELETE TO authenticated USING (auth.uid() = user_id);