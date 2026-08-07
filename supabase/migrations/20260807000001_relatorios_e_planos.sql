-- Relatórios de auditoria persistidos (função PRO/PREMIUM do Técnico IA).
-- Guarda o histórico de relatórios gerados pelo usuário para consulta e reuso.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'free'
    CHECK (plano IN ('free', 'pro', 'premium'));

CREATE TABLE IF NOT EXISTS public.relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'auditoria',
  titulo text NOT NULL DEFAULT 'Auditoria da carteira',
  perfil text NOT NULL DEFAULT 'moderado'
    CHECK (perfil IN ('conservador', 'moderado', 'agressivo')),
  score_diversificacao integer NOT NULL DEFAULT 0,
  patrimonio_total numeric NOT NULL DEFAULT 0,
  resumo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.relatorios TO authenticated;
GRANT ALL ON public.relatorios TO service_role;

ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
  ON public.relatorios FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
  ON public.relatorios FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX relatorios_user_created_idx ON public.relatorios (user_id, created_at DESC);
