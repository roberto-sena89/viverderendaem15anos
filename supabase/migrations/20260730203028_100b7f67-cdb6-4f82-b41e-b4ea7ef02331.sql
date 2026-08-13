CREATE OR REPLACE FUNCTION public.recalcular_ativo(_user_id uuid, _ticker text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  qtd numeric := 0;
  custo numeric := 0;
  pm numeric := 0;
  n_linhas integer := 0;
  ativo record;
BEGIN
  FOR r IN
    SELECT quantidade, preco FROM public.aportes
    WHERE user_id = _user_id AND upper(ticker) = upper(_ticker)
    ORDER BY data ASC, created_at ASC
  LOOP
    n_linhas := n_linhas + 1;
    IF r.quantidade >= 0 THEN
      qtd := qtd + r.quantidade;
      custo := custo + r.quantidade * r.preco;
    ELSE
      pm := CASE WHEN qtd > 0 THEN custo / qtd ELSE 0 END;
      qtd := qtd + r.quantidade;
      custo := custo + r.quantidade * pm;
    END IF;
  END LOOP;

  IF qtd <= 0 THEN
    qtd := GREATEST(0, qtd);
    custo := 0;
  END IF;
  pm := CASE WHEN qtd > 0 THEN custo / qtd ELSE 0 END;

  SELECT * INTO ativo FROM public.ativos
  WHERE user_id = _user_id AND upper(ticker) = upper(_ticker) LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF n_linhas = 0 AND qtd = 0 THEN
    DELETE FROM public.ativos WHERE id = ativo.id;
    RETURN;
  END IF;

  UPDATE public.ativos
  SET quantidade = qtd,
      preco_medio = pm,
      preco_atual = CASE WHEN ativo.preco_atual > 0 THEN ativo.preco_atual ELSE pm END,
      updated_at = now()
  WHERE id = ativo.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.aportes_sincronizar_ativo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.recalcular_ativo(NEW.user_id, NEW.ticker);
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF TG_OP = 'DELETE' OR upper(OLD.ticker) <> upper(NEW.ticker) THEN
      PERFORM public.recalcular_ativo(OLD.user_id, OLD.ticker);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_aportes_sincronizar_ativo ON public.aportes;
CREATE TRIGGER trg_aportes_sincronizar_ativo
AFTER INSERT OR UPDATE OR DELETE ON public.aportes
FOR EACH ROW EXECUTE FUNCTION public.aportes_sincronizar_ativo();

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT DISTINCT user_id, ticker FROM public.aportes LOOP
    PERFORM public.recalcular_ativo(t.user_id, t.ticker);
  END LOOP;
END $$;