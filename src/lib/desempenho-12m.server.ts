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

import { cdiAcumulado12m, normalizarSimbolo } from "./market.server";

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

const cache = new Map<string, { em: number; closes: number[] }>();
const emVoo = new Map<string, Promise<number[] | null>>();

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

/** Busca os fechamentos mensais ajustados de 12 meses; null quando indisponível. */
async function buscarCloses(ticker: string): Promise<number[] | null> {
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
    const serie = closes.filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0,
    );
    if (serie.length < 2) continue;
    return serie;
  }
  return null;
}

async function comCacheCloses(ticker: string): Promise<number[] | null> {
  const chave = ticker.trim().toUpperCase();
  if (!chave) return null;
  const agora = Date.now();
  const salvo = cache.get(chave);
  if (salvo && agora - salvo.em < TTL_MS) return salvo.closes;

  const voando = emVoo.get(chave);
  if (voando) return voando;

  const promessa = buscarCloses(chave)
    .then((closes) => {
      // Só guarda resultados úteis; falhas ficam de fora para tentar de novo.
      if (closes && closes.length >= 2) cache.set(chave, { em: Date.now(), closes });
      return closes;
    })
    .catch(() => salvo?.closes ?? null)
    .finally(() => emVoo.delete(chave));

  emVoo.set(chave, promessa);
  return promessa;
}

async function comCache(ticker: string): Promise<Desempenho12m> {
  const chave = ticker.trim().toUpperCase();
  if (!chave) return vazio(chave);
  const serie = await comCacheCloses(chave);
  if (!serie || serie.length < 2) return vazio(chave);

  const primeiro = serie[0];
  const ultimo = serie[serie.length - 1];
  let pico = -Infinity;
  let drawdown = 0;
  for (const v of serie) {
    pico = Math.max(pico, v);
    drawdown = Math.min(drawdown, (v - pico) / pico);
  }
  return {
    ticker: chave,
    retorno12m: ((ultimo - primeiro) / primeiro) * 100,
    primeiroPreco: primeiro,
    ultimoPreco: ultimo,
    drawdown12m: drawdown * 100,
  };
}

/** Desempenho de 12m dos tickers pedidos + benchmark Ibovespa. */
export async function desempenho12mLote(tickers: string[]): Promise<{
  ativos: Desempenho12m[];
  benchmark: number | null;
}> {
  const unicos = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))].slice(
    0,
    80,
  );
  const [ativos, ibov] = await Promise.all([
    Promise.all(unicos.map((t) => comCache(t))),
    comCache("^BVSP"),
  ]);
  return { ativos, benchmark: ibov.retorno12m };
}

export type LinhaBenchmark = {
  codigo: string;
  nome: string;
  retorno12m: number | null;
  fonte: string;
};

export type ComparativoBenchmark = {
  benchmark: string;
  excedente: number | null;
};

export type RespostaBenchmarkCarteira = {
  /** Retorno ponderado de 12m da carteira (pesos = valor atual). */
  retornoCarteira: number | null;
  /** Quanto do valor da carteira tem histórico de 12m (%). */
  cobertura: number;
  valorTotal: number;
  benchmarks: LinhaBenchmark[];
  comparativo: ComparativoBenchmark[];
};

/**
 * Benchmark da carteira em 12 meses: retorno ponderado da carteira contra
 * Ibovespa, IFIX, S&P 500 (Yahoo) e CDI acumulado (Banco Central/SGS 12).
 */
export async function benchmarkCarteira(
  ativos: { ticker: string; valor: number }[],
): Promise<RespostaBenchmarkCarteira> {
  const comValor = ativos.filter((a) => a.valor > 0);
  const valorTotal = comValor.reduce((s, a) => s + a.valor, 0);
  if (!comValor.length || !valorTotal) {
    return {
      retornoCarteira: null,
      cobertura: 0,
      valorTotal: 0,
      benchmarks: [],
      comparativo: [],
    };
  }

  const [lote, cdi] = await Promise.all([
    // O Yahoo não expõe série do IFIX; usamos XFIX11.SA (ETF que replica o índice) como fallback.
    desempenho12mLote([...comValor.map((a) => a.ticker), "^IFIX", "XFIX11.SA", "^GSPC"]),
    cdiAcumulado12m(),
  ]);

  const porTicker = new Map(lote.ativos.map((d) => [d.ticker.toUpperCase(), d.retorno12m]));
  const ifix =
    porTicker.get("^IFIX") ?? porTicker.get("XFIX11.SA") ?? porTicker.get("IFIX.SA") ?? null;

  let retornoPonderado = 0;
  let valorCoberto = 0;
  for (const a of comValor) {
    const r = porTicker.get(a.ticker.toUpperCase());
    if (r === null || r === undefined || !Number.isFinite(r)) continue;
    retornoPonderado += a.valor * r;
    valorCoberto += a.valor;
  }
  const retornoCarteira = valorCoberto > 0 ? retornoPonderado / valorCoberto : null;

  const benchmarks: LinhaBenchmark[] = [
    {
      codigo: "IBOV",
      nome: "Ibovespa",
      retorno12m: lote.benchmark,
      fonte: "Yahoo Finance",
    },
    {
      codigo: "IFIX",
      nome: "IFIX (Fundos Imobiliários)",
      retorno12m: ifix,
      fonte: "Yahoo Finance",
    },
    {
      codigo: "CDI",
      nome: "CDI acumulado 12m",
      retorno12m: cdi,
      fonte: "Banco Central (SGS 12)",
    },
    {
      codigo: "SPX",
      nome: "S&P 500",
      retorno12m: porTicker.get("^GSPC") ?? null,
      fonte: "Yahoo Finance",
    },
  ];

  const comparativo: ComparativoBenchmark[] = benchmarks.map((b) => ({
    benchmark: b.codigo,
    excedente:
      b.retorno12m !== null && retornoCarteira !== null ? retornoCarteira - b.retorno12m : null,
  }));

  return {
    retornoCarteira,
    cobertura: valorCoberto / valorTotal,
    valorTotal,
    benchmarks,
    comparativo,
  };
}

/**
 * Séries mensais de 12 meses (fechamentos ajustados) dos tickers + série do
 * Ibovespa. Usada para métricas de risco e séries comparativas da carteira.
 */
export async function seriesMensais12m(tickers: string[]): Promise<{
  porTicker: Map<string, number[]>;
  ibov: number[] | null;
}> {
  const unicos = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))].slice(
    0,
    80,
  );
  const [series, ibov] = await Promise.all([
    Promise.all(unicos.map((t) => comCacheCloses(t))),
    comCacheCloses("^BVSP"),
  ]);
  const porTicker = new Map<string, number[]>();
  unicos.forEach((t, i) => {
    const closes = series[i];
    if (closes && closes.length >= 2) porTicker.set(t, closes);
  });
  return { porTicker, ibov };
}
