CREATE TABLE public.preferencias_mercado (
  user_id uuid NOT NULL PRIMARY KEY DEFAULT auth.uid(),
  favoritos text[] NOT NULL DEFAULT '{}'::text[],
  filtro_favoritos boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preferencias_mercado TO authenticated;
GRANT ALL ON public.preferencias_mercado TO service_role;

ALTER TABLE public.preferencias_mercado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferencias_mercado"
ON public.preferencias_mercado
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER preferencias_mercado_set_updated_at
BEFORE UPDATE ON public.preferencias_mercado
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.preferencias_mercado REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.preferencias_mercado;