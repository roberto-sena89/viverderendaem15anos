UPDATE public.aportes SET ticker = 'IVVB11' WHERE upper(ticker) = 'IVVB';
UPDATE public.ativos SET ticker = 'IVVB11', nome = 'iShares S&P 500 FIC de Fundo de Índice - Investimento no Exterior', preco_atual = CASE WHEN preco_atual < 100 THEN preco_medio ELSE preco_atual END WHERE upper(ticker) = 'IVVB';
DELETE FROM public.precos_ultimos WHERE ticker = 'IVVB';
DELETE FROM public.historico_precos WHERE ticker = 'IVVB';