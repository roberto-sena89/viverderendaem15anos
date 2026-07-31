CREATE TABLE public.precos_ultimos (
  ticker text PRIMARY KEY,
  preco numeric NOT NULL,
  variacao_percent numeric,
  fonte text NOT NULL DEFAULT 'brapi',
  ao_vivo boolean NOT NULL DEFAULT false,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.precos_ultimos TO authenticated;
GRANT ALL ON public.precos_ultimos TO service_role;

ALTER TABLE public.precos_ultimos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ler os ultimos precos"
ON public.precos_ultimos FOR SELECT TO authenticated USING (true);

CREATE TRIGGER precos_ultimos_set_updated_at
BEFORE UPDATE ON public.precos_ultimos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();