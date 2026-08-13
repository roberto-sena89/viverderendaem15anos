CREATE TABLE IF NOT EXISTS public.ia_habilidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  titulo text NOT NULL,
  instrucao text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ia_habilidades_user_nome_key UNIQUE (user_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_habilidades TO authenticated;
GRANT ALL ON public.ia_habilidades TO service_role;

ALTER TABLE public.ia_habilidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ia_habilidades" ON public.ia_habilidades;
CREATE POLICY "Users manage own ia_habilidades"
  ON public.ia_habilidades FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ia_habilidades_user_ativo_idx ON public.ia_habilidades (user_id, ativo);