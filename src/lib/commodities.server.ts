/**
 * Grade de commodities internacionais.
 *
 * Fonte: contratos futuros de referência (CME/NYMEX, ICE, LME, SGX, CBOT)
 * consultados via Yahoo Finance, com série diária de 1 ano usada para
 * variação em 12 meses, variação em 30 dias e sparkline.
 *
 * O câmbio USD/BRL é buscado na mesma rodada, na mesma frequência das
 * cotações, para que a conversão em reais acompanhe o dólar do momento.
 */

import { COMMODITIES, type DefCommodity, type LinhaCommodity, type RespostaCommodities } from "@/lib/commodities-base";

const PADRAO: Record<string, string> = { Accept: "application/json" };
const NAVEGADOR: Record<string, string> = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const memoria = new Map<string, { expira: number; valor: unknown }>();

async function json<T>(url: string, ttlMs: number, headers: Record<string, string>): Promise<T | null> {
  const cache = memoria.get(url);
  if (cache && cache.expira > Date.now()) return cache.valor as T;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;
    const valor = (await res.json()) as T;
    memoria.set(url, { valor, expira: Date.now() + ttlMs });
    return valor;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number };
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }>;
  };
};

/** Fila global: a fonte pública derruba rajadas simultâneas (HTTP 429). */
let ativos = 0;
let fila: Promise<unknown> = Promise.resolve();

async function yahoo(url: string, headers: Record<string, string>) {
  while (ativos >= 2) await fila.catch(() => undefined);
  ativos++;
  const p = (async () => {
    try {
      return await json<YahooChart>(url, 45_000, headers);
    } finally {
      await dormir(120);
      ativos--;
    }
  })();
  fila = p.catch(() => undefined);
  return p;
}

/* ------------------------------------------------------------------ *
 * Câmbio USD/BRL
 * ------------------------------------------------------------------ */

let cambio = { valor: 0, expira: 0 };

async function usdBrl(): Promise<number> {
  if (cambio.valor > 0 && cambio.expira > Date.now()) return cambio.valor;
  const awesome = await json<{ USDBRL?: { bid?: string } }>(
    "https://economia.awesomeapi.com.br/json/last/USD-BRL",
    30_000,
    PADRAO,
  );
  const bid = Number(awesome?.USDBRL?.bid);
  if (Number.isFinite(bid) && bid > 0) {
    cambio = { valor: bid, expira: Date.now() + 30_000 };
    return bid;
  }
  const y = await yahoo("https://query1.finance.yahoo.com/v8/finance/chart/BRL=X?range=1d&interval=1d", PADRAO);
  const preco = y?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof preco === "number" && preco > 0) {
    cambio = { valor: preco, expira: Date.now() + 30_000 };
    return preco;
  }
  return cambio.valor > 0 ? cambio.valor : 5.4;
}

/* ------------------------------------------------------------------ *
 * Uma commodity
 * ------------------------------------------------------------------ */

async function commodity(def: DefCommodity): Promise<LinhaCommodity> {
  const base: LinhaCommodity = {
    codigo: def.codigo,
    nome: def.nome,
    categoria: def.categoria,
    bolsa: def.bolsa,
    unidade: def.unidade,
    descricao: def.descricao,
    precoUsd: null,
    variacaoDia: null,
    variacao12m: null,
    variacao30d: null,
    fechamentoAnterior: null,
    minima12m: null,
    maxima12m: null,
    spark: [],
    fonte: "Yahoo Finance",
  };

  const fator = def.fator ?? 1;
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

  for (const simbolo of def.simbolos) {
    for (let t = 0; t < 4; t++) {
      const host = hosts[t % hosts.length];
      const headers = t < 2 ? PADRAO : NAVEGADOR;
      if (t > 0) await dormir(200 * t);
      const dados = await yahoo(
        `https://${host}/v8/finance/chart/${encodeURIComponent(simbolo)}?range=1y&interval=1d`,
        headers,
      );
      const r = dados?.chart?.result?.[0];
      const serie = (r?.indicators?.quote?.[0]?.close ?? []).filter(
        (v): v is number => typeof v === "number" && Number.isFinite(v),
      );
      const bruto = r?.meta?.regularMarketPrice || serie.at(-1) || null;
      if (typeof bruto !== "number" || bruto === 0) continue;

      const preco = bruto * fator;
      const anterior = (serie.length > 1 ? serie.at(-2)! : (r?.meta?.previousClose ?? null)) as number | null;
      const anteriorConv = anterior === null ? null : anterior * fator;
      const primeiro = serie.length ? serie[0]! * fator : null;
      const trintaAtras = serie.length > 21 ? serie[serie.length - 22]! * fator : null;
      const convertida = serie.map((v) => v * fator);

      return {
        ...base,
        precoUsd: preco,
        fechamentoAnterior: anteriorConv,
        variacaoDia: anteriorConv && anteriorConv > 0 ? ((preco - anteriorConv) / anteriorConv) * 100 : null,
        variacao12m: primeiro && primeiro > 0 ? ((preco - primeiro) / primeiro) * 100 : null,
        variacao30d: trintaAtras && trintaAtras > 0 ? ((preco - trintaAtras) / trintaAtras) * 100 : null,
        minima12m: convertida.length ? Math.min(...convertida) : null,
        maxima12m: convertida.length ? Math.max(...convertida) : null,
        spark: convertida.slice(-30),
      };
    }
  }

  return base;
}

/* ------------------------------------------------------------------ *
 * Grade completa (com cache curto compartilhado)
 * ------------------------------------------------------------------ */

let cache: { resposta: RespostaCommodities; expira: number } | null = null;
let emVoo: Promise<RespostaCommodities> | null = null;

const TTL_MS = 20_000;

async function montar(): Promise<RespostaCommodities> {
  const [linhas, dolar] = await Promise.all([
    Promise.all(COMMODITIES.map((d) => commodity(d).catch(() => null))),
    usdBrl(),
  ]);

  const validas = linhas.filter((l): l is LinhaCommodity => l !== null);
  const parcial = validas.some((l) => l.precoUsd === null) || validas.length !== COMMODITIES.length;

  return {
    linhas: validas,
    usdBrl: dolar,
    atualizadoEm: new Date().toISOString(),
    parcial,
  };
}

/** Grade de commodities, servida do cache curto para não estourar a fonte. */
export async function buscarCommodities(forcar = false): Promise<RespostaCommodities> {
  if (!forcar && cache && cache.expira > Date.now()) return cache.resposta;
  if (emVoo) return emVoo;

  emVoo = (async () => {
    try {
      const resposta = await montar();
      // Mantém o último preço bom quando a fonte falha em alguma commodity.
      if (cache) {
        resposta.linhas = resposta.linhas.map((l) => {
          if (l.precoUsd !== null) return l;
          const antiga = cache?.resposta.linhas.find((a) => a.codigo === l.codigo);
          return antiga && antiga.precoUsd !== null ? { ...antiga } : l;
        });
      }
      cache = { resposta, expira: Date.now() + TTL_MS };
      return resposta;
    } catch (erro) {
      if (cache) return cache.resposta;
      throw erro;
    } finally {
      emVoo = null;
    }
  })();

  return emVoo;
}
