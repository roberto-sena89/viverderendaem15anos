CREATE TABLE public.radar_analises (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  veredito text not null,
  tese text,
  riscos text,
  gatilhos text,
  fatores_externos jsonb not null default '[]'::jsonb,
  gerada_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);
CREATE INDEX radar_analises_ticker_gerada_em_idx ON public.radar_analises (ticker, gerada_em DESC);
GRANT SELECT ON public.radar_analises TO authenticated;
GRANT ALL ON public.radar_analises TO service_role;
ALTER TABLE public.radar_analises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados podem ler analises" ON public.radar_analises FOR SELECT TO authenticated USING (true);