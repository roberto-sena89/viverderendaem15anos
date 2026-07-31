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
  /** Símbolo na BRAPI. */
  simbolo: string;
  grupo: CotacaoTicker["grupo"];
  fonte: "quote";
  /** Símbolo na fonte complementar (índices, cripto e câmbio). */
  alternativo?: string;
  /** Quando true, a fonte complementar é a principal do ativo. */
  alternativoPrimario?: boolean;
  pontos?: boolean;
};

/** Universo exibido na fita. Para incluir um novo ativo, basta adicionar aqui. */
export const ATIVOS_TICKER: AtivoTicker[] = [
  { id: "IBOV", rotulo: "IBOV", simbolo: "^BVSP", grupo: "indice", fonte: "quote", alternativo: "^BVSP", alternativoPrimario: true, pontos: true },
  { id: "IFIX", rotulo: "IFIX", simbolo: "IFIX", grupo: "indice", fonte: "quote", alternativo: "IFIX.SA", alternativoPrimario: true, pontos: true },
  { id: "SMLL", rotulo: "SMLL", simbolo: "SMLL", grupo: "indice", fonte: "quote", alternativo: "SMLL.SA", alternativoPrimario: true, pontos: true },

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

  { id: "BTC", rotulo: "BTC", simbolo: "BTC", grupo: "cripto", fonte: "quote", alternativo: "BTC-BRL", alternativoPrimario: true },
  { id: "ETH", rotulo: "ETH", simbolo: "ETH", grupo: "cripto", fonte: "quote", alternativo: "ETH-BRL", alternativoPrimario: true },
  { id: "SOL", rotulo: "SOL", simbolo: "SOL", grupo: "cripto", fonte: "quote", alternativo: "SOL-BRL", alternativoPrimario: true },

  { id: "USD-BRL", rotulo: "USD", simbolo: "USDBRL", grupo: "cambio", fonte: "quote", alternativo: "BRL=X", alternativoPrimario: true },
  { id: "EUR-BRL", rotulo: "EUR", simbolo: "EURBRL", grupo: "cambio", fonte: "quote", alternativo: "EURBRL=X", alternativoPrimario: true },
];


const TTL_MS = 5_000;
/** Cada ativo é revalidado na BRAPI no máximo a cada 20s (plano gratuito: 1 ativo/requisição). */
const TTL_ATIVO_MS = 20_000;
/** Quantos ativos são revalidados na BRAPI por ciclo (rodízio). */
const LOTE_POR_CICLO = 6;

const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "application/json",
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Último valor conhecido por ativo (cache de fallback quando a fonte falha). */
const porAtivo = new Map<string, { em: number; valor: CotacaoTicker }>();
let cache: { em: number; valor: CotacaoTicker[] } | null = null;
let emVoo: Promise<CotacaoTicker[]> | null = null;
let cursor = 0;
let ultimoYahoo = 0;

function base(a: AtivoTicker): CotacaoTicker {
  return {
    id: a.id,
    rotulo: a.rotulo,
    grupo: a.grupo,
    preco: null,
    variacaoPercent: null,
    moeda: "BRL",
    pontos: a.pontos === true,
  };
}

/** BRAPI: cotação individual (o plano gratuito aceita 1 ativo por requisição). */
async function brapiUnitario(a: AtivoTicker): Promise<CotacaoTicker | null> {
  const token = process.env.BRAPI_TOKEN;
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(a.simbolo)}${qs}`, {
      headers: token ? { ...NAVEGADOR, Authorization: `Bearer ${token}` } : NAVEGADOR,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { results?: Array<Record<string, unknown>> };
    const r = j?.results?.[0];
    if (!r) return null;
    const preco = num(r.regularMarketPrice);
    if (preco === null) return null;
    return {
      ...base(a),
      preco,
      variacaoPercent: num(r.regularMarketChangePercent),
      moeda: (r.currency as string) ?? "BRL",
    };
  } catch {
    return null;
  }
}

/** Fonte complementar (índices, cripto e câmbio, indisponíveis no plano gratuito da BRAPI). */
async function complemento(ativos: AtivoTicker[]): Promise<Map<string, CotacaoTicker>> {
  const mapa = new Map<string, CotacaoTicker>();
  if (!ativos.length) return mapa;
  try {
    const { buscarFita } = await import("@/lib/market.server");
    const itens = await buscarFita(ativos.map((a) => ({ simbolo: a.alternativo!, rotulo: a.id })));
    for (const i of itens) {
      const a = ativos.find((x) => x.id === i.nome);
      if (!a || i.preco === null) continue;
      mapa.set(a.id, {
        ...base(a),
        preco: i.preco,
        variacaoPercent: i.variacaoPercent ?? null,
        moeda: i.moeda ?? "BRL",
      });
    }
  } catch {
    /* mantém o último valor em cache */
  }
  return mapa;
}

/** Cotações da fita com cache de 5s, rodízio de revalidação e deduplicação. */
export async function cotacoesFita(): Promise<CotacaoTicker[]> {
  const agora = Date.now();
  if (cache && agora - cache.em < TTL_MS) return cache.valor;
  if (emVoo) return emVoo;

  emVoo = (async () => {
    const brapi = ATIVOS_TICKER.filter((a) => a.fonte === "quote" && !a.alternativoPrimario);
    const vencidos = brapi.filter((a) => {
      const s = porAtivo.get(a.id);
      return !s || Date.now() - s.em > TTL_ATIVO_MS;
    });
    // Rodízio: revalida apenas um lote por ciclo para respeitar o limite do plano.
    const lote: AtivoTicker[] = [];
    for (let i = 0; i < Math.min(LOTE_POR_CICLO, vencidos.length); i++) {
      lote.push(vencidos[(cursor + i) % vencidos.length]);
    }
    cursor = vencidos.length ? (cursor + lote.length) % vencidos.length : 0;

    const resultados = await Promise.all(lote.map((a) => brapiUnitario(a)));
    resultados.forEach((r, i) => {
      if (r) porAtivo.set(lote[i].id, { em: Date.now(), valor: r });
    });

    // Índices, criptomoedas e câmbio vêm da fonte complementar (a cada 30s).
    const outros = ATIVOS_TICKER.filter((a) => a.alternativo);
    const faltando = outros.filter((a) => !porAtivo.has(a.id));
    if (faltando.length || Date.now() - ultimoYahoo > 30_000) {
      ultimoYahoo = Date.now();
      const m = await complemento(outros);
      for (const [id, v] of m) porAtivo.set(id, { em: Date.now(), valor: v });
    }

    const saida = ATIVOS_TICKER.map((a) => porAtivo.get(a.id)?.valor ?? base(a));
    if (saida.some((s) => s.preco !== null)) cache = { em: Date.now(), valor: saida };
    return saida;
  })().finally(() => {
    emVoo = null;
  });

  return emVoo;
}
