CREATE TABLE public.ativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  ticker text NOT NULL,
  nome text NOT NULL,
  categoria text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 0,
  preco_medio numeric NOT NULL DEFAULT 0,
  preco_atual numeric NOT NULL DEFAULT 0,
  dy numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticker)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ativos TO authenticated;
GRANT ALL ON public.ativos TO service_role;
ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ativos" ON public.ativos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.aportes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  data date NOT NULL DEFAULT current_date,
  corretora text NOT NULL DEFAULT '',
  ticker text NOT NULL,
  categoria text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 0,
  preco numeric NOT NULL DEFAULT 0,
  taxas numeric NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aportes TO authenticated;
GRANT ALL ON public.aportes TO service_role;
ALTER TABLE public.aportes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own aportes" ON public.aportes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.dividendos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  data date NOT NULL DEFAULT current_date,
  ticker text NOT NULL,
  tipo text NOT NULL DEFAULT 'Dividendo',
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dividendos TO authenticated;
GRANT ALL ON public.dividendos TO service_role;
ALTER TABLE public.dividendos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dividendos" ON public.dividendos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  alvo numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own metas" ON public.metas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.plano_config (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  idade_atual integer NOT NULL DEFAULT 30,
  idade_aposentadoria integer NOT NULL DEFAULT 45,
  aporte_mensal numeric NOT NULL DEFAULT 5000,
  aumento_anual numeric NOT NULL DEFAULT 5,
  rentabilidade_anual numeric NOT NULL DEFAULT 10,
  inflacao_anual numeric NOT NULL DEFAULT 4.5,
  taxa_retirada numeric NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_config TO authenticated;
GRANT ALL ON public.plano_config TO service_role;
ALTER TABLE public.plano_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plano" ON public.plano_config FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_ativos_updated_at BEFORE UPDATE ON public.ativos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_aportes_updated_at BEFORE UPDATE ON public.aportes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_dividendos_updated_at BEFORE UPDATE ON public.dividendos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_metas_updated_at BEFORE UPDATE ON public.metas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_plano_updated_at BEFORE UPDATE ON public.plano_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();