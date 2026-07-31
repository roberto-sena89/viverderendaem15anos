/**
 * Cotações BRAPI (tempo real) dos ativos da carteira.
 *
 * Complementa o provider de cotações: a cada 5s busca na BRAPI os tickers
 * presentes na carteira e devolve preço e variação do dia por ticker.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { precosEtfsBrapi } from "@/lib/etfs.functions";
import type { PrecoBrapiEtf } from "@/lib/etfs-brapi.server";

export const INTERVALO_BRAPI_CARTEIRA_MS = 5_000;

export type PrecoVivoCarteira = {
  preco: number;
  variacaoPercent: number | null;
  atualizadoEm: string | null;
};

export const chaveBrapi = (t: string) => t.trim().toUpperCase().replace(/\.SA$/i, "");

/** Mapa ticker -> cotação ao vivo da BRAPI, atualizado a cada 5s. */
export function usePrecosBrapiCarteira(tickers: string[]): Map<string, PrecoVivoCarteira> {
  const buscar = useServerFn(precosEtfsBrapi);
  const lista = useMemo(
    () => [...new Set(tickers.map(chaveBrapi).filter((t) => /^[A-Z0-9.\-]{2,12}$/.test(t)))].sort(),
    [tickers],
  );
  const chave = lista.join(",");

  const q = useQuery({
    queryKey: ["carteira", "brapi", chave],
    queryFn: () => buscar({ data: { tickers: lista } }),
    enabled: lista.length > 0,
    refetchInterval: INTERVALO_BRAPI_CARTEIRA_MS,
    refetchIntervalInBackground: false,
    staleTime: INTERVALO_BRAPI_CARTEIRA_MS,
    retry: 1,
  });

  return useMemo(() => {
    const mapa = new Map<string, PrecoVivoCarteira>();
    for (const p of (q.data ?? []) as PrecoBrapiEtf[]) {
      if (p.preco === null || !Number.isFinite(p.preco)) continue;
      mapa.set(chaveBrapi(p.ticker), {
        preco: p.preco,
        variacaoPercent: p.variacaoPercent ?? null,
        atualizadoEm: p.atualizadoEm ?? null,
      });
    }
    return mapa;
  }, [q.data]);
}
