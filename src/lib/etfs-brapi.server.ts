/**
 * Cotações ao vivo da grade de ETFs via BRAPI (https://brapi.dev).
 *
 * O token nunca sai do servidor. Consulta em lote (`/api/quote/T1,T2,...`),
 * em blocos de 10 tickers, com cache curto de 4s para evitar repetição.
 */

export type PrecoBrapiEtf = {
  ticker: string;
  preco: number | null;
  variacao: number | null;
  variacaoPercent: number | null;
  volume: number | null;
  atualizadoEm: string | null;
  /** Moeda da cotação ("BRL", "USD", ...). Evita misturar preços de bolsas diferentes. */
  moeda: string | null;
};

const TTL_MS = 4_000;
const BLOCO = 10;
const NAVEGADOR = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "application/json",
};

const cache = new Map<string, { em: number; valor: PrecoBrapiEtf }>();

function blocos<T>(lista: T[], tamanho: number): T[][] {
  const saida: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) saida.push(lista.slice(i, i + tamanho));
  return saida;
}

async function buscarBloco(tickers: string[]): Promise<PrecoBrapiEtf[]> {
  const token = process.env.BRAPI_TOKEN;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  const qs = params.toString();
  const url = `https://brapi.dev/api/quote/${tickers.join("%2C")}${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, {
      headers: token ? { ...NAVEGADOR, Authorization: `Bearer ${token}` } : NAVEGADOR,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    return (json?.results ?? [])
      .map((r) => ({
        ticker: String(r.symbol ?? "").toUpperCase(),
        preco: num(r.regularMarketPrice),
        variacao: num(r.regularMarketChange),
        variacaoPercent: num(r.regularMarketChangePercent),
        volume: num(r.regularMarketVolume),
        atualizadoEm: (r.regularMarketTime as string) ?? new Date().toISOString(),
        moeda: typeof r.currency === "string" ? r.currency.toUpperCase() : null,

      }))
      .filter((p) => p.ticker);
  } catch {
    return [];
  }
}

/** Requisições em andamento por ticker (deduplicação de chamadas simultâneas). */
const emVoo = new Map<string, Promise<PrecoBrapiEtf | null>>();

/** Limpa entradas antigas do cache para não crescer indefinidamente. */
function podarCache(agora: number) {
  if (cache.size < 500) return;
  for (const [k, v] of cache) if (agora - v.em > TTL_MS * 30) cache.delete(k);
}

/**
 * Cotações BRAPI dos tickers informados.
 *
 * - Cache por ativo (TTL 4s): tickers já atualizados não geram nova chamada.
 * - Deduplicação: se o mesmo ticker já está sendo buscado, a chamada aguarda a
 *   requisição em andamento em vez de disparar outra.
 */
export async function precosBrapiEtfs(tickers: string[]): Promise<PrecoBrapiEtf[]> {
  const agora = Date.now();
  podarCache(agora);
  const limpos = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];

  const prontos: PrecoBrapiEtf[] = [];
  const aguardar: Array<Promise<PrecoBrapiEtf | null>> = [];
  const faltantes: string[] = [];

  for (const t of limpos) {
    const salvo = cache.get(t);
    if (salvo && agora - salvo.em < TTL_MS) {
      prontos.push(salvo.valor);
      continue;
    }
    const pendente = emVoo.get(t);
    if (pendente) {
      aguardar.push(pendente);
      continue;
    }
    faltantes.push(t);
  }

  for (const bloco of blocos(faltantes, BLOCO)) {
    const requisicao = buscarBloco(bloco).then((lote) => {
      const em = Date.now();
      const porTicker = new Map(lote.map((p) => [p.ticker, p]));
      for (const p of lote) cache.set(p.ticker, { em, valor: p });
      for (const t of bloco) emVoo.delete(t);
      return porTicker;
    });
    requisicao.catch(() => {
      for (const t of bloco) emVoo.delete(t);
    });
    for (const t of bloco) {
      const promessa = requisicao.then((m) => m.get(t) ?? null).catch(() => null);
      emVoo.set(t, promessa);
      aguardar.push(promessa);
    }

  }

  const resolvidos = await Promise.all(aguardar);
  for (const p of resolvidos) if (p) prontos.push(p);

  const vistos = new Set<string>();
  return prontos.filter((p) => (vistos.has(p.ticker) ? false : (vistos.add(p.ticker), true)));
}

