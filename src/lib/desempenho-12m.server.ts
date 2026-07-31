/**
 * Desempenho de 12 meses por ativo (server-only).
 *
 * Fonte: Yahoo Finance (chart 1y / 1mo, com adjclose = já considera proventos e
 * desdobramentos). O Ibovespa (^BVSP) é buscado junto e serve de benchmark para
 * a nota de desempenho da carteira.
 *
 * Cache em memória de 6h por ticker + deduplicação de requisições em voo,
 * porque a variação de 12 meses muda muito pouco ao longo do dia.
 */

import { normalizarSimbolo } from "./market.server";

export type Desempenho12m = {
  ticker: string;
  /** Retorno total em 12 meses (%) — null quando não há histórico suficiente. */
  retorno12m: number | null;
  /** Retorno anualizado é igual ao de 12m nesta janela; mantido por clareza. */
  primeiroPreco: number | null;
  ultimoPreco: number | null;
  /** Maior queda do período (%). */
  drawdown12m: number | null;
};

const TTL_MS = 6 * 60 * 60 * 1000;
const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

const cache = new Map<string, { em: number; valor: Desempenho12m }>();
const emVoo = new Map<string, Promise<Desempenho12m>>();

type ChartResp = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
  };
};

const vazio = (ticker: string): Desempenho12m => ({
  ticker,
  retorno12m: null,
  primeiroPreco: null,
  ultimoPreco: null,
  drawdown12m: null,
});

async function buscarSerie(ticker: string): Promise<Desempenho12m> {
  const simbolo = normalizarSimbolo(ticker);
  for (const host of HOSTS) {
    let res: Response;
    try {
      res = await fetch(
        `${host}/v8/finance/chart/${encodeURIComponent(simbolo)}?range=1y&interval=1mo`,
        { headers: { Accept: "application/json" } },
      );
    } catch {
      continue;
    }
    if (!res.ok) continue;
    const json = (await res.json().catch(() => null)) as ChartResp | null;
    const r = json?.chart?.result?.[0];
    const closes = r?.indicators?.adjclose?.[0]?.adjclose ?? r?.indicators?.quote?.[0]?.close ?? [];
    const serie = closes.filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
    if (serie.length < 2) continue;

    const primeiro = serie[0];
    const ultimo = serie[serie.length - 1];
    let pico = -Infinity;
    let drawdown = 0;
    for (const v of serie) {
      pico = Math.max(pico, v);
      drawdown = Math.min(drawdown, (v - pico) / pico);
    }
    return {
      ticker: ticker.toUpperCase(),
      retorno12m: ((ultimo - primeiro) / primeiro) * 100,
      primeiroPreco: primeiro,
      ultimoPreco: ultimo,
      drawdown12m: drawdown * 100,
    };
  }
  return vazio(ticker.toUpperCase());
}

async function comCache(ticker: string): Promise<Desempenho12m> {
  const chave = ticker.trim().toUpperCase();
  if (!chave) return vazio(chave);
  const agora = Date.now();
  const salvo = cache.get(chave);
  if (salvo && agora - salvo.em < TTL_MS) return salvo.valor;

  const voando = emVoo.get(chave);
  if (voando) return voando;

  const promessa = buscarSerie(chave)
    .then((valor) => {
      // Só guarda resultados úteis; falhas ficam de fora para tentar de novo.
      if (valor.retorno12m !== null) cache.set(chave, { em: Date.now(), valor });
      return valor;
    })
    .catch(() => (salvo?.valor ?? vazio(chave)))
    .finally(() => emVoo.delete(chave));

  emVoo.set(chave, promessa);
  return promessa;
}

/** Desempenho de 12m dos tickers pedidos + benchmark Ibovespa. */
export async function desempenho12mLote(tickers: string[]): Promise<{
  ativos: Desempenho12m[];
  benchmark: number | null;
}> {
  const unicos = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))].slice(0, 80);
  const [ativos, ibov] = await Promise.all([
    Promise.all(unicos.map((t) => comCache(t))),
    comCache("^BVSP"),
  ]);
  return { ativos, benchmark: ibov.retorno12m };
}
