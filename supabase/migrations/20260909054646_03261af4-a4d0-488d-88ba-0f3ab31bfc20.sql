ALTER TABLE public.alertas_preco
  ADD COLUMN IF NOT EXISTS variacao_percent numeric,
  ADD COLUMN IF NOT EXISTS preco_referencia numeric,
  ADD COLUMN IF NOT EXISTS frequencia text NOT NULL DEFAULT 'uma_vez',
  ADD COLUMN IF NOT EXISTS disparos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_disparo_em timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.alertas_disparos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alerta_id uuid,
  ticker text NOT NULL,
  tipo text NOT NULL,
  preco numeric NOT NULL,
  valor_alvo numeric NOT NULL,
  variacao_percent numeric,
  frequencia text NOT NULL DEFAULT 'uma_vez',
  mensagem text,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.alertas_disparos TO authenticated;
GRANT ALL ON public.alertas_disparos TO service_role;

ALTER TABLE public.alertas_disparos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alert history"
  ON public.alertas_disparos FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert history"
  ON public.alertas_disparos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert history"
  ON public.alertas_disparos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS alertas_disparos_user_criado_idx
  ON public.alertas_disparos (user_id, criado_em DESC);