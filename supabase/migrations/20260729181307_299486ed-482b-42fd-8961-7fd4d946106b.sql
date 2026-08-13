CREATE TABLE public.sincronizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo text NOT NULL,
  fonte text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  dentro_do_pregao boolean NOT NULL DEFAULT false,
  total_tickers integer NOT NULL DEFAULT 0,
  atualizados integer NOT NULL DEFAULT 0,
  historico_gravado integer NOT NULL DEFAULT 0,
  falhas text[] NOT NULL DEFAULT '{}',
  erro text,
  duracao_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sincronizacoes TO authenticated;
GRANT ALL ON public.sincronizacoes TO service_role;

ALTER TABLE public.sincronizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver sincronizacoes"
ON public.sincronizacoes FOR SELECT TO authenticated USING (true);

CREATE INDEX sincronizacoes_created_at_idx ON public.sincronizacoes (created_at DESC);