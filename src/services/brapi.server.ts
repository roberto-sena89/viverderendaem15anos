/**
 * Serviço server-only da BRAPI (https://brapi.dev) para a barra de cotações.
 *
 * Cobre três endpoints: ações/índices/FIIs/ETFs (`/api/quote`), criptomoedas
 * (`/api/v2/crypto`) e câmbio (`/api/v2/currency`). O token permanece no
 * servidor. Cache em memória com TTL de 5s e deduplicação de chamadas.
 */

export type CotacaoTicker = {
  /** Identificador estável do ativo (ex.: PETR4, BTC, USD-BRL). */
  id: string;
  rotulo: string;
  grupo: "indice" | "acao" | "fii" | "etf" | "cripto" | "cambio";
  preco: number | null;
  variacaoPercent: number | null;
  moeda: string;
  /** Índices são exibidos em pontos, sem prefixo monetário. */
  pontos: boolean;
};

export type AtivoTicker = {
  id: string;
  rotulo: string;
  simbolo: string;
  grupo: CotacaoTicker["grupo"];
  fonte: "quote" | "crypto" | "currency";
  pontos?: boolean;
};

/** Universo exibido na fita. Para incluir um novo ativo, basta adicionar aqui. */
export const ATIVOS_TICKER: AtivoTicker[] = [
  { id: "IBOV", rotulo: "IBOV", simbolo: "^BVSP", grupo: "indice", fonte: "quote", pontos: true },
  { id: "IFIX", rotulo: "IFIX", simbolo: "IFIX.SA", grupo: "indice", fonte: "quote", pontos: true },
  { id: "SMLL", rotulo: "SMLL", simbolo: "SMLL.SA", grupo: "indice", fonte: "quote", pontos: true },

  { id: "PETR4", rotulo: "PETR4", simbolo: "PETR4", grupo: "acao", fonte: "quote" },
  { id: "VALE3", rotulo: "VALE3", simbolo: "VALE3", grupo: "acao", fonte: "quote" },
  { id: "ITUB4", rotulo: "ITUB4", simbolo: "ITUB4", grupo: "acao", fonte: "quote" },
  { id: "BBAS3", rotulo: "BBAS3", simbolo: "BBAS3", grupo: "acao", fonte: "quote" },
  { id: "BBDC4", rotulo: "BBDC4", simbolo: "BBDC4", grupo: "acao", fonte: "quote" },
  { id: "ABEV3", rotulo: "ABEV3", simbolo: "ABEV3", grupo: "acao", fonte: "quote" },
  { id: "WEGE3", rotulo: "WEGE3", simbolo: "WEGE3", grupo: "acao", fonte: "quote" },

  { id: "MXRF11", rotulo: "MXRF11", simbolo: "MXRF11", grupo: "fii", fonte: "quote" },
  { id: "HGLG11", rotulo: "HGLG11", simbolo: "HGLG11", grupo: "fii", fonte: "quote" },
  { id: "KNRI11", rotulo: "KNRI11", simbolo: "KNRI11", grupo: "fii", fonte: "quote" },
  { id: "XPLG11", rotulo: "XPLG11", simbolo: "XPLG11", grupo: "fii", fonte: "quote" },

  { id: "BOVA11", rotulo: "BOVA11", simbolo: "BOVA11", grupo: "etf", fonte: "quote" },
  { id: "IVVB11", rotulo: "IVVB11", simbolo: "IVVB11", grupo: "etf", fonte: "quote" },
  { id: "SMAL11", rotulo: "SMAL11", simbolo: "SMAL11", grupo: "etf", fonte: "quote" },
  { id: "HASH11", rotulo: "HASH11", simbolo: "HASH11", grupo: "etf", fonte: "quote" },

  { id: "BTC", rotulo: "BTC", simbolo: "BTC", grupo: "cripto", fonte: "crypto" },
  { id: "ETH", rotulo: "ETH", simbolo: "ETH", grupo: "cripto", fonte: "crypto" },
  { id: "SOL", rotulo: "SOL", simbolo: "SOL", grupo: "cripto", fonte: "crypto" },

  { id: "USD-BRL", rotulo: "USD", simbolo: "USD-BRL", grupo: "cambio", fonte: "currency" },
  { id: "EUR-BRL", rotulo: "EUR", simbolo: "EUR-BRL", grupo: "cambio", fonte: "currency" },
];

const TTL_MS = 5_000;
const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "application/json",
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

let cache: { em: number; valor: CotacaoTicker[] } | null = null;
let emVoo: Promise<CotacaoTicker[]> | null = null;

function url(caminho: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const token = process.env.BRAPI_TOKEN;
  if (token) qs.set("token", token);
  return `https://brapi.dev${caminho}?${qs.toString()}`;
}

async function json(u: string): Promise<Record<string, unknown> | null> {
  const token = process.env.BRAPI_TOKEN;
  try {
    const res = await fetch(u, {
      headers: token ? { ...NAVEGADOR, Authorization: `Bearer ${token}` } : NAVEGADOR,
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function buscarQuotes(ativos: AtivoTicker[]): Promise<Map<string, CotacaoTicker>> {
  const mapa = new Map<string, CotacaoTicker>();
  const blocos: AtivoTicker[][] = [];
  for (let i = 0; i < ativos.length; i += 10) blocos.push(ativos.slice(i, i + 10));

  await Promise.all(
    blocos.map(async (bloco) => {
      const alvo = bloco.map((a) => a.simbolo).join(",");
      const j = await json(url(`/api/quote/${encodeURIComponent(alvo)}`, {}));
      const results = (j?.results ?? []) as Array<Record<string, unknown>>;
      for (const r of results) {
        const simbolo = String(r.symbol ?? "").toUpperCase();
        const ativo = bloco.find((a) => a.simbolo.toUpperCase() === simbolo);
        if (!ativo) continue;
        mapa.set(ativo.id, {
          id: ativo.id,
          rotulo: ativo.rotulo,
          grupo: ativo.grupo,
          preco: num(r.regularMarketPrice),
          variacaoPercent: num(r.regularMarketChangePercent),
          moeda: (r.currency as string) ?? "BRL",
          pontos: ativo.pontos === true,
        });
      }
    }),
  );
  return mapa;
}

async function buscarCriptos(ativos: AtivoTicker[]): Promise<Map<string, CotacaoTicker>> {
  const mapa = new Map<string, CotacaoTicker>();
  if (!ativos.length) return mapa;
  const j = await json(
    url("/api/v2/crypto", { coin: ativos.map((a) => a.simbolo).join(","), currency: "BRL" }),
  );
  const coins = (j?.coins ?? []) as Array<Record<string, unknown>>;
  for (const c of coins) {
    const simbolo = String(c.coin ?? c.coinName ?? "").toUpperCase();
    const ativo = ativos.find((a) => a.simbolo.toUpperCase() === simbolo);
    if (!ativo) continue;
    mapa.set(ativo.id, {
      id: ativo.id,
      rotulo: ativo.rotulo,
      grupo: ativo.grupo,
      preco: num(c.regularMarketPrice),
      variacaoPercent: num(c.regularMarketChangePercent),
      moeda: (c.currency as string) ?? "BRL",
      pontos: false,
    });
  }
  return mapa;
}

async function buscarCambio(ativos: AtivoTicker[]): Promise<Map<string, CotacaoTicker>> {
  const mapa = new Map<string, CotacaoTicker>();
  if (!ativos.length) return mapa;
  const j = await json(url("/api/v2/currency", { currency: ativos.map((a) => a.simbolo).join(",") }));
  const moedas = (j?.currency ?? []) as Array<Record<string, unknown>>;
  for (const m of moedas) {
    const par = String(m.fromCurrency ?? "").toUpperCase();
    const ativo = ativos.find((a) => a.simbolo.split("-")[0].toUpperCase() === par);
    if (!ativo) continue;
    const preco = num(m.bidPrice) ?? num(Number(m.bidPrice));
    mapa.set(ativo.id, {
      id: ativo.id,
      rotulo: ativo.rotulo,
      grupo: ativo.grupo,
      preco: preco ?? (Number.isFinite(Number(m.bidPrice)) ? Number(m.bidPrice) : null),
      variacaoPercent: Number.isFinite(Number(m.bidVariation))
        ? Number(m.bidVariation)
        : num(m.bidVariation),
      moeda: "BRL",
      pontos: false,
    });
  }
  return mapa;
}

/** Cotações da fita com cache de 5s e deduplicação de chamadas simultâneas. */
export async function cotacoesFita(): Promise<CotacaoTicker[]> {
  const agora = Date.now();
  if (cache && agora - cache.em < TTL_MS) return cache.valor;
  if (emVoo) return emVoo;

  emVoo = (async () => {
    const [q, c, m] = await Promise.all([
      buscarQuotes(ATIVOS_TICKER.filter((a) => a.fonte === "quote")),
      buscarCriptos(ATIVOS_TICKER.filter((a) => a.fonte === "crypto")),
      buscarCambio(ATIVOS_TICKER.filter((a) => a.fonte === "currency")),
    ]);
    const anterior = new Map((cache?.valor ?? []).map((v) => [v.id, v] as const));
    const saida = ATIVOS_TICKER.map(
      (a) =>
        q.get(a.id) ??
        c.get(a.id) ??
        m.get(a.id) ??
        anterior.get(a.id) ?? {
          id: a.id,
          rotulo: a.rotulo,
          grupo: a.grupo,
          preco: null,
          variacaoPercent: null,
          moeda: "BRL",
          pontos: a.pontos === true,
        },
    );
    if (saida.some((s) => s.preco !== null)) cache = { em: Date.now(), valor: saida };
    return saida;
  })().finally(() => {
    emVoo = null;
  });

  return emVoo;
}
