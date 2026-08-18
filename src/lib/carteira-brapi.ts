/**
 * Cotações BRAPI (tempo real) dos ativos da carteira.
 *
 * Complementa o provider de cotações: busca na BRAPI os tickers presentes na
 * carteira e devolve preço e variação do dia por ticker.
 *
 * - Mercado aberto: atualiza a cada 5s (preço em tempo real).
 * - Mercado fechado: atualiza a cada 5min, mantendo o último preço antes do
 *   fechamento (a BRAPI devolve o preço de fechamento do último pregão).
 * - Nunca descarta um preço já conhecido: se a BRAPI falhar, o último valor
 *   recebido continua exibido até chegar um novo.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { precosEtfsBrapi } from "@/lib/etfs.functions";
import type { PrecoBrapiEtf } from "@/lib/etfs-brapi.server";
import { estadoMercadoGlobal, estadoPregao } from "@/lib/cotacoes-tempo-real";

/** Ritmo de atualização com o pregão aberto. */
export const INTERVALO_BRAPI_CARTEIRA_MS = 5_000;
/** Ritmo de atualização com o mercado fechado (apenas revalida o fechamento). */
export const INTERVALO_BRAPI_FECHADO_MS = 5 * 60_000;

export type PrecoVivoCarteira = {
  preco: number;
  variacaoPercent: number | null;
  atualizadoEm: string | null;
  /** false quando o valor é o último preço antes do fechamento do mercado. */
  aoVivo: boolean;
};

export const chaveBrapi = (t: string) => t.trim().toUpperCase().replace(/\.SA$/i, "");

/** Mapa ticker -> cotação da BRAPI (tempo real no pregão, fechamento fora dele). */
export function usePrecosBrapiCarteira(tickers: string[]): Map<string, PrecoVivoCarteira> {
  const buscar = useServerFn(precosEtfsBrapi);
  const lista = useMemo(
    () => [...new Set(tickers.map(chaveBrapi).filter((t) => /^[A-Z0-9.-]{2,12}$/.test(t)))].sort(),
    [tickers],
  );
  const chave = lista.join(",");

  const aberto = useMercadoAberto();

  const q = useQuery({
    queryKey: ["carteira", "brapi", chave],
    queryFn: () => buscar({ data: { tickers: lista } }),
    enabled: lista.length > 0,
    refetchInterval: aberto ? INTERVALO_BRAPI_CARTEIRA_MS : INTERVALO_BRAPI_FECHADO_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: aberto ? INTERVALO_BRAPI_CARTEIRA_MS : INTERVALO_BRAPI_FECHADO_MS,
    retry: 1,
  });

  /** Últimos preços conhecidos: preserva a posição da carteira se a fonte falhar. */
  const ultimos = useRef(new Map<string, PrecoVivoCarteira>());

  return useMemo(() => {
    for (const p of (q.data ?? []) as PrecoBrapiEtf[]) {
      if (p.preco === null || !Number.isFinite(p.preco) || p.preco <= 0) continue;
      // A carteira é em reais: um ticker que resolve para uma bolsa estrangeira
      // (ex.: "IVVB" nos EUA em vez de "IVVB11" na B3) devolve preço em USD e
      // distorceria todo o saldo. Nesse caso, ignoramos a cotação.
      if (p.moeda && p.moeda !== "BRL") continue;

      ultimos.current.set(chaveBrapi(p.ticker), {
        preco: p.preco,
        variacaoPercent: p.variacaoPercent ?? null,
        atualizadoEm: p.atualizadoEm ?? null,
        aoVivo: aberto,
      });
    }
    return new Map(ultimos.current);
  }, [q.data, aberto]);
}

/** true quando a B3 ou o mercado americano estão abertos (reavaliado a cada minuto). */
function useMercadoAberto(): boolean {
  const [aberto, setAberto] = useState(() => estadoPregao().aberto || estadoMercadoGlobal().aberto);
  useEffect(() => {
    const id = setInterval(
      () => setAberto(estadoPregao().aberto || estadoMercadoGlobal().aberto),
      60_000,
    );
    return () => clearInterval(id);
  }, []);
  return aberto;
}
