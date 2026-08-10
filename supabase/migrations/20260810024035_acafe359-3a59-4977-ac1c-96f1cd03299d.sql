ALTER TABLE public.radar_analises
  ADD COLUMN IF NOT EXISTS conviccao text,
  ADD COLUMN IF NOT EXISTS horizonte text,
  ADD COLUMN IF NOT EXISTS cenario_otimista text,
  ADD COLUMN IF NOT EXISTS cenario_base text,
  ADD COLUMN IF NOT EXISTS cenario_pessimista text,
  ADD COLUMN IF NOT EXISTS monitorar text;