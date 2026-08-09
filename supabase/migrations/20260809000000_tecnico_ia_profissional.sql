-- Upgrade do Técnico IA: análise profissional estruturada com o pensamento de
-- gestor de fundos / tesouraria. Além do veredito, tese, riscos e gatilhos,
-- cada análise agora carrega convicção, horizonte de investimento, cenários
-- (otimista/base/pessimista) e o que monitorar.
ALTER TABLE public.radar_analises
  ADD COLUMN IF NOT EXISTS conviccao TEXT,
  ADD COLUMN IF NOT EXISTS horizonte TEXT,
  ADD COLUMN IF NOT EXISTS cenario_otimista TEXT,
  ADD COLUMN IF NOT EXISTS cenario_base TEXT,
  ADD COLUMN IF NOT EXISTS cenario_pessimista TEXT,
  ADD COLUMN IF NOT EXISTS monitorar TEXT;
