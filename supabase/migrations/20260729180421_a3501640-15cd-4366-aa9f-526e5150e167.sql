CREATE TABLE public.historico_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  preco numeric NOT NULL,
  fonte text NOT NULL DEFAULT 'brapi',
  classe text NOT NULL DEFAULT 'variavel',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT historico_precos_ticker_data_key UNIQUE (ticker, data)
);

CREATE INDEX historico_precos_ticker_data_idx ON public.historico_precos (ticker, data DESC);

GRANT SELECT ON public.historico_precos TO authenticated;
GRANT ALL ON public.historico_precos TO service_role;

ALTER TABLE public.historico_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ler o historico"
ON public.historico_precos
FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER historico_precos_set_updated_at
BEFORE UPDATE ON public.historico_precos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();