ALTER TABLE public.relatorios
  ADD COLUMN IF NOT EXISTS resposta text,
  ADD COLUMN IF NOT EXISTS respondida_em timestamp with time zone;