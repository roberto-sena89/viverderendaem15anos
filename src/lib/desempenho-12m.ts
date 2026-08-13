import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obterDesempenho12m } from "./desempenho-12m.functions";

export type NotaDesempenho = {
  /** Nota 0–10 derivada do retorno de 12 meses frente ao Ibovespa. */
  nota: number;
  retorno12m: number | null;
  excedente: number | null;
  classificacao: "Excelente" | "Bom" | "Neutro" | "Fraco" | "Ruim" | "Sem histórico";
};

/** Classificação textual da nota, no padrão de casas de análise. */
export function classificarNota(
  nota: number,
  temHistorico: boolean,
): NotaDesempenho["classificacao"] {
  if (!temHistorico) return "Sem histórico";
  if (nota >= 8.5) return "Excelente";
  if (nota >= 7) return "Bom";
  if (nota >= 5) return "Neutro";
  if (nota >= 3) return "Fraco";
  return "Ruim";
}

/**
 * Nota 0–10 do desempenho em 12 meses:
 * base 5 (igual ao Ibovespa) +/- 0,25 ponto por ponto percentual de excedente,
 * limitada a 0–10. Sem benchmark, usa o retorno absoluto como referência.
 */
export function notaPorDesempenho(
  retorno12m: number | null,
  benchmark: number | null,
): NotaDesempenho {
  if (retorno12m === null || !Number.isFinite(retorno12m)) {
    return { nota: 5, retorno12m: null, excedente: null, classificacao: "Sem histórico" };
  }
  const base = benchmark ?? 0;
  const excedente = retorno12m - base;
  const nota = Math.max(0, Math.min(10, 5 + excedente * 0.25));
  return { nota, retorno12m, excedente, classificacao: classificarNota(nota, true) };
}

/** Busca (e mantém em cache por 30 min) o desempenho de 12 meses dos tickers. */
export function useDesempenho12m(tickers: string[]) {
  const buscar = useServerFn(obterDesempenho12m);
  const lista = useMemo(
    () => [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))].sort(),
    [tickers],
  );

  const query = useQuery({
    queryKey: ["desempenho-12m", lista],
    enabled: lista.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => buscar({ data: { tickers: lista } }),
  });

  const porTicker = useMemo(() => {
    const mapa = new Map<string, NotaDesempenho>();
    const benchmark = query.data?.benchmark ?? null;
    for (const item of query.data?.ativos ?? []) {
      mapa.set(item.ticker.toUpperCase(), notaPorDesempenho(item.retorno12m, benchmark));
    }
    return mapa;
  }, [query.data]);

  return {
    porTicker,
    benchmark: query.data?.benchmark ?? null,
    carregando: query.isLoading,
  };
}
