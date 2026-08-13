/**
 * Serviço server-only de cotações da BRAPI (https://brapi.dev).
 *
 * O token (BRAPI_TOKEN) nunca sai do servidor: o cliente conversa apenas com a
 * server function em `src/lib/mercado-brapi.functions.ts`.
 *
 * - Cache em memória com TTL de 5s (evita chamadas repetidas para o mesmo ativo)
 * - Retry exponencial para 429/5xx
 * - Mensagens de erro traduzidas para 401/404/429/500
 */

export type CotacaoBrapi = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  currency: string;
  regularMarketPrice: number | null;
  regularMarketChange: number | null;
  regularMarketChangePercent: number | null;
  regularMarketOpen: number | null;
  regularMarketDayHigh: number | null;
  regularMarketDayLow: number | null;
  regularMarketPreviousClose: number | null;
  regularMarketVolume: number | null;
  regularMarketTime: string | null;
  marketState: string | null;
  /** Série intradiária para o mini gráfico (sparkline). */
  spark: number[];
};

const TTL_MS = 30_000;
/** Após um 429, para de bater na BRAPI por este período (serve cache antigo). */
const COOLDOWN_429_MS = 60_000;
const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "application/json",
};

const cache = new Map<string, { em: number; valor: CotacaoBrapi }>();
const emVoo = new Map<string, Promise<CotacaoBrapi>>();
let bloqueadoAte = 0;

function vazio(symbol: string): CotacaoBrapi {
  return {
    symbol: symbol.toUpperCase(),
    shortName: null,
    longName: null,
    currency: "BRL",
    regularMarketPrice: null,
    regularMarketChange: null,
    regularMarketChangePercent: null,
    regularMarketOpen: null,
    regularMarketDayHigh: null,
    regularMarketDayLow: null,
    regularMarketPreviousClose: null,
    regularMarketVolume: null,
    regularMarketTime: null,
    marketState: null,
    spark: [],
  };
}

function erroDeStatus(status: number): string {
  if (status === 401 || status === 403) return "Token da BRAPI inválido ou sem permissão.";
  if (status === 404) return "Ativo inexistente na BRAPI.";
  if (status === 429)
    return "Limite de requisições da BRAPI atingido. Tente novamente em instantes.";
  if (status >= 500) return "A BRAPI está indisponível no momento.";
  return `Falha ao consultar a BRAPI (HTTP ${status}).`;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET https://brapi.dev/api/quote/{symbol} com retry exponencial. */
async function buscarNaBrapi(symbol: string): Promise<CotacaoBrapi> {
  const token = process.env.BRAPI_TOKEN;
  // O plano gratuito da BRAPI só aceita interval=1d; intervalos intradiários
  // devolvem HTTP 400 (INVALID_INTERVAL). Se o histórico for recusado, repetimos
  // a chamada sem os parâmetros de série (o preço continua disponível).
  const montarUrl = (comHistorico: boolean) => {
    const params = new URLSearchParams();
    if (comHistorico) {
      params.set("range", "3mo");
      params.set("interval", "1d");
    }
    if (token) params.set("token", token);
    const qs = params.toString();
    return `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}${qs ? `?${qs}` : ""}`;
  };

  let comHistorico = true;
  let ultimoErro = "Não foi possível obter a cotação.";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (tentativa > 0) await espera(400 * 2 ** (tentativa - 1));
    let res: Response;
    try {
      res = await fetch(montarUrl(comHistorico), {
        headers: token ? { ...NAVEGADOR, Authorization: `Bearer ${token}` } : NAVEGADOR,
      });
    } catch {
      ultimoErro = "Falha de rede ao consultar a BRAPI.";
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (res.status === 429) bloqueadoAte = Date.now() + COOLDOWN_429_MS;
      ultimoErro = erroDeStatus(res.status);
      continue;
    }

    if (!res.ok) {
      const detalhe = await res.text().catch(() => "");
      if (res.status === 400 && comHistorico) {
        // Plano sem acesso ao histórico: tenta de novo apenas com a cotação.
        comHistorico = false;
        ultimoErro = erroDeStatus(res.status);
        continue;
      }
      let mensagem = erroDeStatus(res.status);
      try {
        const j = JSON.parse(detalhe) as { message?: string };
        if (j?.message) mensagem = j.message;
      } catch {
        /* corpo não-JSON: mantém a mensagem padrão */
      }
      throw new Error(mensagem);
    }

    const json = (await res.json()) as {
      results?: Array<
        Record<string, unknown> & { historicalDataPrice?: Array<{ close?: number }> }
      >;
    };
    const r = json?.results?.[0];
    if (!r) throw new Error(erroDeStatus(404));

    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    return {
      symbol: String(r.symbol ?? symbol).toUpperCase(),
      shortName: (r.shortName as string) ?? null,
      longName: (r.longName as string) ?? null,
      currency: (r.currency as string) ?? "BRL",
      regularMarketPrice: num(r.regularMarketPrice),
      regularMarketChange: num(r.regularMarketChange),
      regularMarketChangePercent: num(r.regularMarketChangePercent),
      regularMarketOpen: num(r.regularMarketOpen),
      regularMarketDayHigh: num(r.regularMarketDayHigh),
      regularMarketDayLow: num(r.regularMarketDayLow),
      regularMarketPreviousClose: num(r.regularMarketPreviousClose),
      regularMarketVolume: num(r.regularMarketVolume),
      regularMarketTime: (r.regularMarketTime as string) ?? new Date().toISOString(),
      marketState: (r.marketState as string) ?? null,
      spark: (r.historicalDataPrice ?? [])
        .map((p) => p?.close)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
        .slice(-60),
    };
  }
  throw new Error(ultimoErro);
}

/** Cotação com cache, deduplicação e degradação suave em caso de limite (429). */
export async function getQuote(symbol: string): Promise<CotacaoBrapi> {
  const chave = symbol.trim().toUpperCase();
  const agora = Date.now();
  const salvo = cache.get(chave);
  if (salvo && agora - salvo.em < TTL_MS) return salvo.valor;

  // Em cooldown por excesso de requisições: serve o último preço conhecido
  // (ou um registro vazio) em vez de derrubar a tela com erro.
  if (agora < bloqueadoAte) return salvo?.valor ?? vazio(chave);

  const pendente = emVoo.get(chave);
  if (pendente) return pendente;

  const promessa = buscarNaBrapi(chave)
    .then((valor) => {
      cache.set(chave, { em: Date.now(), valor });
      return valor;
    })
    .catch(() => salvo?.valor ?? vazio(chave)) // nunca propaga o erro para a UI

    .finally(() => emVoo.delete(chave));

  emVoo.set(chave, promessa);
  return promessa;
}
