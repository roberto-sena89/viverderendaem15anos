/**
 * Agregador da grade de criptomoedas.
 *
 * Fonte principal: CoinGecko `coins/markets` (lote de 250 por requisição,
 * com sparkline e variações de vários períodos). Câmbio USD/BRL vem da
 * AwesomeAPI, com fallback na própria CoinGecko.
 *
 * O mercado cripto é 24/7, então o cache é curto (30s em memória) e existe
 * um cache de retaguarda em `public.cotacoes_cache` para não deixar a tela
 * vazia quando a fonte pública recusa a requisição (429).
 */

import { classificarCripto, type LinhaCripto, type RespostaCripto } from "@/lib/cripto-base";

const CHAVE_CACHE = "cripto:grade";
const TTL_MS = 30_000;
const PAGINAS = 2;
const POR_PAGINA = 250;

let memoria: { valor: RespostaCripto; em: number } | null = null;
let emVoo: Promise<RespostaCripto> | null = null;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function lerBanco(): Promise<RespostaCripto | null> {
  try {
    const db = await admin();
    const { data } = await db
      .from("cotacoes_cache")
      .select("payload")
      .eq("categoria", CHAVE_CACHE)
      .maybeSingle();
    return (data?.payload as unknown as RespostaCripto) ?? null;
  } catch {
    return null;
  }
}

async function gravarBanco(valor: RespostaCripto) {
  try {
    const db = await admin();
    await db.from("cotacoes_cache").upsert(
      {
        categoria: CHAVE_CACHE,
        payload: JSON.parse(JSON.stringify(valor)),
        parcial: valor.parcial,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "categoria" },
    );
  } catch {
    /* cache é best-effort */
  }
}

async function json<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "investidor15anos/1.0" },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

type MoedaCG = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  market_cap_rank?: number | null;
  current_price?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
  high_24h?: number | null;
  low_24h?: number | null;
  circulating_supply?: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  price_change_percentage_200d_in_currency?: number | null;
  price_change_percentage_1y_in_currency?: number | null;
  sparkline_in_7d?: { price?: number[] };
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function converter(m: MoedaCG): LinhaCripto {
  const ticker = String(m.symbol ?? "").toUpperCase();
  const { categoria, rede } = classificarCripto(m.id, m.name ?? "", ticker);
  const spark = (m.sparkline_in_7d?.price ?? []).filter((n) => Number.isFinite(n));
  return {
    id: m.id,
    ticker,
    nome: m.name ?? ticker,
    imagem: m.image ?? null,
    rank: num(m.market_cap_rank),
    categoria,
    rede,
    precoUsd: num(m.current_price),
    variacao1h: num(m.price_change_percentage_1h_in_currency),
    variacao24h: num(m.price_change_percentage_24h_in_currency),
    variacao7d: num(m.price_change_percentage_7d_in_currency),
    variacao30d: num(m.price_change_percentage_30d_in_currency),
    variacao6m: num(m.price_change_percentage_200d_in_currency),
    variacao12m: num(m.price_change_percentage_1y_in_currency),
    capitalizacao: num(m.market_cap),
    volume24h: num(m.total_volume),
    maximo24h: num(m.high_24h),
    minimo24h: num(m.low_24h),
    fornecimento: num(m.circulating_supply),
    spark: spark.filter((_, i) => i % 4 === 0).slice(-42),
  };
}

/** Dólar comercial em reais, sincronizado junto com as cotações cripto. */
export async function cambioUsdBrl(): Promise<number> {
  const awesome = await json<{ USDBRL?: { bid?: string } }>(
    "https://economia.awesomeapi.com.br/json/last/USD-BRL",
  );
  const bid = Number(awesome?.USDBRL?.bid);
  if (Number.isFinite(bid) && bid > 0) return bid;

  const cg = await json<{ tether?: { brl?: number } }>(
    "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=brl",
  );
  const brl = cg?.tether?.brl;
  if (typeof brl === "number" && brl > 0) return brl;

  return memoria?.valor.usdBrl ?? 5.4;
}

async function buscar(): Promise<RespostaCripto> {
  const params =
    "vs_currency=usd&order=market_cap_desc&sparkline=true&price_change_percentage=1h%2C24h%2C7d%2C30d%2C200d%2C1y";

  const paginas = await Promise.all(
    Array.from({ length: PAGINAS }, (_, i) =>
      json<MoedaCG[]>(
        `https://api.coingecko.com/api/v3/coins/markets?${params}&per_page=${POR_PAGINA}&page=${i + 1}`,
      ),
    ),
  );

  const brutas = paginas.flatMap((p) => p ?? []);
  const parcial = paginas.some((p) => p === null);

  if (!brutas.length) {
    const antigo = memoria?.valor ?? (await lerBanco());
    if (antigo) return { ...antigo, parcial: true };
    throw new Error("Fonte de criptomoedas indisponível no momento.");
  }

  const vistos = new Set<string>();
  const linhas = brutas
    .filter((m) => m?.id && !vistos.has(m.id) && vistos.add(m.id))
    .map(converter)
    .sort((a, b) => (b.capitalizacao ?? 0) - (a.capitalizacao ?? 0));

  const usdBrl = await cambioUsdBrl();
  const capitalizacaoTotal = linhas.reduce((s, l) => s + (l.capitalizacao ?? 0), 0);
  const btc = linhas.find((l) => l.id === "bitcoin");
  const dominanciaBtc =
    btc?.capitalizacao && capitalizacaoTotal > 0
      ? (btc.capitalizacao / capitalizacaoTotal) * 100
      : null;

  return {
    linhas,
    usdBrl,
    capitalizacaoTotal,
    dominanciaBtc,
    atualizadoEm: new Date().toISOString(),
    fonte: "CoinGecko · AwesomeAPI",
    parcial,
  };
}

/** Grade de criptomoedas com cache curto (mercado 24/7). */
export async function gradeCriptoComCache(forcar = false): Promise<RespostaCripto> {
  const agora = Date.now();
  if (!forcar && memoria && agora - memoria.em < TTL_MS) return memoria.valor;
  if (emVoo) return emVoo;

  emVoo = (async () => {
    try {
      const valor = await buscar();
      memoria = { valor, em: Date.now() };
      void gravarBanco(valor);
      return valor;
    } catch (erro) {
      const antigo = memoria?.valor ?? (await lerBanco());
      if (antigo) return { ...antigo, parcial: true };
      throw erro;
    } finally {
      emVoo = null;
    }
  })();

  return emVoo;
}

export type PontoHistorico = { t: number; preco: number };

/** Série histórica de uma moeda para o modal de detalhes. */
export async function historicoCripto(id: string, dias: string): Promise<PontoHistorico[]> {
  const dado = await json<{ prices?: [number, number][] }>(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${encodeURIComponent(dias)}`,
  );
  return (dado?.prices ?? []).map(([t, preco]) => ({ t, preco }));
}
