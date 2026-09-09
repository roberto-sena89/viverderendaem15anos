ALTER TABLE public.relatorios
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'concluida',
  ADD COLUMN IF NOT EXISTS analise_ia text,
  ADD COLUMN IF NOT EXISTS provedor_ia text;

ALTER TABLE public.alertas_preco
  ADD COLUMN IF NOT EXISTS mensagem text;