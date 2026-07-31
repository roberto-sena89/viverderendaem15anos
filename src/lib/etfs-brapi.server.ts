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
      }))
      .filter((p) => p.ticker);
  } catch {
    return [];
  }
}

/** Cotações BRAPI dos tickers informados (com cache de 4s por ativo). */
export async function precosBrapiEtfs(tickers: string[]): Promise<PrecoBrapiEtf[]> {
  const agora = Date.now();
  const limpos = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];

  const prontos: PrecoBrapiEtf[] = [];
  const faltantes: string[] = [];
  for (const t of limpos) {
    const salvo = cache.get(t);
    if (salvo && agora - salvo.em < TTL_MS) prontos.push(salvo.valor);
    else faltantes.push(t);
  }

  const lotes = await Promise.all(blocos(faltantes, BLOCO).map((b) => buscarBloco(b)));
  for (const lote of lotes) {
    for (const p of lote) {
      cache.set(p.ticker, { em: Date.now(), valor: p });
      prontos.push(p);
    }
  }
  return prontos;
}
