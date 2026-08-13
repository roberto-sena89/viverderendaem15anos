CREATE TABLE public.cotacoes_cache (
  categoria TEXT NOT NULL PRIMARY KEY,
  payload JSONB NOT NULL,
  parcial BOOLEAN NOT NULL DEFAULT false,
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cotacoes_cache TO authenticated;
GRANT ALL ON public.cotacoes_cache TO service_role;

ALTER TABLE public.cotacoes_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ler o cache de cotacoes"
ON public.cotacoes_cache FOR SELECT TO authenticated USING (true);