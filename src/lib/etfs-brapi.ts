/**
 * Cotações ao vivo (BRAPI) dos ETFs visíveis na grade.
 *
 * Complementa o canal WebSocket: enquanto o Realtime entrega a grade inteira
 * quando o cache é regravado, este hook busca de 5 em 5 segundos apenas os
 * tickers da página aberta, direto na BRAPI.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { precosEtfsBrapi } from "@/lib/etfs.functions";
import type { PrecoBrapiEtf } from "@/lib/etfs-brapi.server";
import type { PrecoAoVivoEtf } from "@/lib/etfs-tempo-real";

export const INTERVALO_BRAPI_ETFS_MS = 5_000;

export type EstadoBrapiEtfs = {
  precos: Map<string, PrecoAoVivoEtf>;
  atualizadoEm: string | null;
  ativo: boolean;
};

/** Cotações BRAPI dos tickers visíveis, atualizadas a cada 5s. */
export function usePrecosBrapiEtfs(tickers: string[], habilitado: boolean): EstadoBrapiEtfs {
  const buscar = useServerFn(precosEtfsBrapi);
  const chave = useMemo(() => [...tickers].sort().join(","), [tickers]);

  const q = useQuery({
    queryKey: ["etfs", "brapi", chave],
    queryFn: () => buscar({ data: { tickers } }),
    enabled: habilitado && tickers.length > 0,
    refetchInterval: habilitado ? INTERVALO_BRAPI_ETFS_MS : false,
    refetchIntervalInBackground: false,
    staleTime: INTERVALO_BRAPI_ETFS_MS,
    retry: 1,
  });

  return useMemo(() => {
    const precos = new Map<string, PrecoAoVivoEtf>();
    let em: string | null = null;
    for (const p of (q.data ?? []) as PrecoBrapiEtf[]) {
      if (p.preco === null) continue;
      precos.set(p.ticker, {
        preco: p.preco,
        variacao: p.variacao,
        variacaoPercent: p.variacaoPercent,
        volume: p.volume,
      });
      if (p.atualizadoEm && (!em || p.atualizadoEm > em)) em = p.atualizadoEm;
    }
    return { precos, atualizadoEm: em, ativo: Boolean(habilitado && precos.size) };
  }, [q.data, habilitado]);
}
