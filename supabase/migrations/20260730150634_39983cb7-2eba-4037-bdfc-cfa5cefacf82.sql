ALTER TABLE public.ativos REPLICA IDENTITY FULL;
ALTER TABLE public.aportes REPLICA IDENTITY FULL;
ALTER TABLE public.dividendos REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ativos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.aportes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dividendos; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;