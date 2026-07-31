/**
 * Grade de cotações em tempo real (estilo terminal financeiro).
 *
 * Fontes:
 * - brapi.dev  -> ações, FIIs e ETFs da B3 (lote)
 * - Yahoo      -> índices, câmbio, commodities e futuros
 * - CoinGecko  -> criptomoedas (lote único, com sparkline)
 *
 * Todas as respostas ficam em cache curto em memória para respeitar o
 * limite de requisições das fontes públicas.
 */

export type LinhaCotacao = {
  ticker: string;
  simbolo: string;
  nome: string;
  categoria: CategoriaMercado;
  grupo: string | null;
  preco: number | null;
  fechamentoAnterior: number | null;
  variacao: number | null;
  variacaoPercent: number | null;
  minimo: number | null;
  maximo: number | null;
  volume: number | null;
  moeda: string;
  spark: number[];
  extra: { rotulo: string; valor: string }[];
};

export type CategoriaMercado =
  | "acoes"
  | "fiis"
  | "futuros"
  | "commodities"
  | "etfs"
  | "cripto"
  | "cambio"
  | "indices";

export type RespostaGrade = {
  categoria: CategoriaMercado;
  linhas: LinhaCotacao[];
  atualizadoEm: string;
  fonte: string;
  parcial: boolean;
};

/* ------------------------------------------------------------------ *
 * Universo de ativos
 * ------------------------------------------------------------------ */

type Def = { ticker: string; nome: string; grupo?: string; simbolo?: string };

export const ACOES: Def[] = [
  { ticker: "ITUB4", nome: "Itaú Unibanco", grupo: "Financeiro" },
  { ticker: "BBDC4", nome: "Bradesco", grupo: "Financeiro" },
  { ticker: "BBAS3", nome: "Banco do Brasil", grupo: "Financeiro" },
  { ticker: "SANB11", nome: "Santander Brasil", grupo: "Financeiro" },
  { ticker: "BPAC11", nome: "BTG Pactual", grupo: "Financeiro" },
  { ticker: "B3SA3", nome: "B3", grupo: "Financeiro" },
  { ticker: "ITSA4", nome: "Itaúsa", grupo: "Financeiro" },
  { ticker: "PETR4", nome: "Petrobras PN", grupo: "Energia" },
  { ticker: "PETR3", nome: "Petrobras ON", grupo: "Energia" },
  { ticker: "PRIO3", nome: "PRIO", grupo: "Energia" },
  { ticker: "AXIA3", nome: "Axia Energia (ex-Eletrobras)", grupo: "Energia" },
  { ticker: "EGIE3", nome: "Engie Brasil", grupo: "Energia" },
  { ticker: "TAEE11", nome: "Taesa", grupo: "Energia" },
  { ticker: "CPLE3", nome: "Copel", grupo: "Energia" },
  { ticker: "VALE3", nome: "Vale", grupo: "Commodities" },
  { ticker: "CSNA3", nome: "CSN", grupo: "Commodities" },
  { ticker: "GGBR4", nome: "Gerdau", grupo: "Commodities" },
  { ticker: "SUZB3", nome: "Suzano", grupo: "Commodities" },
  { ticker: "KLBN11", nome: "Klabin", grupo: "Commodities" },
  { ticker: "ABEV3", nome: "Ambev", grupo: "Consumo" },
  { ticker: "MGLU3", nome: "Magazine Luiza", grupo: "Consumo" },
  { ticker: "LREN3", nome: "Lojas Renner", grupo: "Consumo" },
  { ticker: "ASAI3", nome: "Assaí", grupo: "Consumo" },
  { ticker: "RADL3", nome: "Raia Drogasil", grupo: "Consumo" },
  { ticker: "JBSS32", nome: "JBS", grupo: "Consumo" },
  { ticker: "RENT3", nome: "Localiza", grupo: "Consumo" },
  { ticker: "WEGE3", nome: "WEG", grupo: "Indústria" },
  { ticker: "EMBJ3", nome: "Embraer", grupo: "Indústria" },
  { ticker: "RAIL3", nome: "Rumo", grupo: "Indústria" },
  { ticker: "MOTV3", nome: "Motiva (ex-CCR)", grupo: "Indústria" },
  { ticker: "TOTS3", nome: "Totvs", grupo: "Tecnologia" },
  { ticker: "VIVT3", nome: "Vivo", grupo: "Tecnologia" },
  { ticker: "CASH3", nome: "Méliuz", grupo: "Tecnologia" },
  { ticker: "HAPV3", nome: "Hapvida", grupo: "Saúde" },
  { ticker: "RDOR3", nome: "Rede D'Or", grupo: "Saúde" },
  { ticker: "FLRY3", nome: "Fleury", grupo: "Saúde" },
  { ticker: "CYRE3", nome: "Cyrela", grupo: "Construção" },
  { ticker: "MRVE3", nome: "MRV", grupo: "Construção" },
];

export const FIIS: Def[] = [
  { ticker: "MXRF11", nome: "Maxi Renda", grupo: "Papel" },
  { ticker: "KNCR11", nome: "Kinea Rendimentos", grupo: "Papel" },
  { ticker: "KNIP11", nome: "Kinea Índices de Preços", grupo: "Papel" },
  { ticker: "IRDM11", nome: "Iridium Recebíveis", grupo: "Papel" },
  { ticker: "RECR11", nome: "REC Recebíveis", grupo: "Papel" },
  { ticker: "CPTS11", nome: "Capitânia Securities", grupo: "Papel" },
  { ticker: "HGLG11", nome: "CSHG Logística", grupo: "Tijolo" },
  { ticker: "XPLG11", nome: "XP Log", grupo: "Tijolo" },
  { ticker: "BTLG11", nome: "BTG Logística", grupo: "Tijolo" },
  { ticker: "VISC11", nome: "Vinci Shopping Centers", grupo: "Tijolo" },
  { ticker: "XPML11", nome: "XP Malls", grupo: "Tijolo" },
  { ticker: "HGRE11", nome: "CSHG Real Estate", grupo: "Tijolo" },
  { ticker: "KNRI11", nome: "Kinea Renda Imobiliária", grupo: "Híbrido" },
  { ticker: "HSML11", nome: "HSI Malls", grupo: "Tijolo" },
  { ticker: "VILG11", nome: "Vinci Logística", grupo: "Tijolo" },
  { ticker: "BCFF11", nome: "BTG Fundo de Fundos", grupo: "Fundo de Fundos" },
  { ticker: "HFOF11", nome: "Hedge TOP FOFII", grupo: "Fundo de Fundos" },
  { ticker: "RBRF11", nome: "RBR Alpha", grupo: "Fundo de Fundos" },
  { ticker: "MALL11", nome: "Malls Brasil Plural", grupo: "Tijolo" },
  { ticker: "ALZR11", nome: "Alianza Trust Renda", grupo: "Híbrido" },
  { ticker: "TRXF11", nome: "TRX Real Estate", grupo: "Híbrido" },
  { ticker: "VGHF11", nome: "Valora Hedge Fund", grupo: "Papel" },
];

export const ETFS: Def[] = [
  { ticker: "BOVA11", nome: "iShares Ibovespa", grupo: "Brasil" },
  { ticker: "SMAL11", nome: "iShares Small Cap", grupo: "Brasil" },
  { ticker: "DIVO11", nome: "It Now Dividendos", grupo: "Brasil" },
  { ticker: "IVVB11", nome: "iShares S&P 500 BRL", grupo: "Brasil" },
  { ticker: "HASH11", nome: "Hashdex Crypto", grupo: "Brasil" },
  { ticker: "NASD11", nome: "Nasdaq-100 BDR", grupo: "Brasil" },
  { ticker: "GOLD11", nome: "Ouro Trust", grupo: "Brasil" },
  { ticker: "XFIX11", nome: "Trend IFIX", grupo: "Brasil" },
];

export const ETFS_GLOBAIS: Def[] = [
  { ticker: "SPY", nome: "SPDR S&P 500", grupo: "Exterior", simbolo: "SPY" },
  { ticker: "QQQ", nome: "Invesco Nasdaq-100", grupo: "Exterior", simbolo: "QQQ" },
  { ticker: "VT", nome: "Vanguard Total World", grupo: "Exterior", simbolo: "VT" },
  { ticker: "VNQ", nome: "Vanguard Real Estate", grupo: "Exterior", simbolo: "VNQ" },
  { ticker: "IEF", nome: "iShares 7-10Y Treasury", grupo: "Exterior", simbolo: "IEF" },
  { ticker: "EEM", nome: "iShares Emerging Markets", grupo: "Exterior", simbolo: "EEM" },
];

export const FUTUROS: Def[] = [
  { ticker: "WIN", nome: "Mini Índice Bovespa", simbolo: "^BVSP", grupo: "Índice" },
  { ticker: "WDO", nome: "Mini Dólar", simbolo: "BRL=X", grupo: "Moeda" },
  { ticker: "DI1", nome: "DI Futuro (proxy Selic)", simbolo: "^BVSP", grupo: "Juros" },
  { ticker: "BGI", nome: "Boi Gordo", simbolo: "LE=F", grupo: "Agro" },
  { ticker: "CCM", nome: "Milho", simbolo: "ZC=F", grupo: "Agro" },
  { ticker: "ICF", nome: "Café Arábica", simbolo: "KC=F", grupo: "Agro" },
];

export const COMMODITIES: Def[] = [
  { ticker: "BRENT", nome: "Petróleo Brent", simbolo: "BZ=F", grupo: "Energia" },
  { ticker: "WTI", nome: "Petróleo WTI", simbolo: "CL=F", grupo: "Energia" },
  { ticker: "OURO", nome: "Ouro", simbolo: "GC=F", grupo: "Metais" },
  { ticker: "PRATA", nome: "Prata", simbolo: "SI=F", grupo: "Metais" },
  { ticker: "COBRE", nome: "Cobre", simbolo: "HG=F", grupo: "Metais" },
  { ticker: "SOJA", nome: "Soja", simbolo: "ZS=F", grupo: "Agro" },
  { ticker: "MILHO", nome: "Milho", simbolo: "ZC=F", grupo: "Agro" },
  { ticker: "CAFE", nome: "Café", simbolo: "KC=F", grupo: "Agro" },
];

export const CAMBIO: Def[] = [
  { ticker: "USD/BRL", nome: "Dólar comercial", simbolo: "BRL=X" },
  { ticker: "EUR/BRL", nome: "Euro", simbolo: "EURBRL=X" },
  { ticker: "GBP/BRL", nome: "Libra esterlina", simbolo: "GBPBRL=X" },
  { ticker: "JPY/BRL", nome: "Iene japonês", simbolo: "JPYBRL=X" },
  { ticker: "ARS/BRL", nome: "Peso argentino", simbolo: "ARSBRL=X" },
  { ticker: "EUR/USD", nome: "Euro x Dólar", simbolo: "EURUSD=X" },
];

export const INDICES_GRADE: Def[] = [
  { ticker: "IBOV", nome: "Ibovespa", simbolo: "^BVSP" },
  { ticker: "IFIX", nome: "Índice de FIIs", simbolo: "IFIX.SA" },
  { ticker: "S&P 500", nome: "S&P 500", simbolo: "^GSPC" },
  { ticker: "NASDAQ", nome: "Nasdaq Composite", simbolo: "^IXIC" },
  { ticker: "USD/BRL", nome: "Dólar comercial", simbolo: "BRL=X" },
  { ticker: "BTC", nome: "Bitcoin", simbolo: "BTC-USD" },
];

const CRIPTO_IDS = [
  ["bitcoin", "BTC", "Bitcoin"],
  ["ethereum", "ETH", "Ethereum"],
  ["solana", "SOL", "Solana"],
  ["binancecoin", "BNB", "BNB"],
  ["ripple", "XRP", "XRP"],
  ["cardano", "ADA", "Cardano"],
  ["dogecoin", "DOGE", "Dogecoin"],
  ["avalanche-2", "AVAX", "Avalanche"],
  ["chainlink", "LINK", "Chainlink"],
  ["polkadot", "DOT", "Polkadot"],
  ["litecoin", "LTC", "Litecoin"],
  ["tether", "USDT", "Tether"],
] as const;

/* ------------------------------------------------------------------ *
 * Infra de rede
 * ------------------------------------------------------------------ */

const memoria = new Map<string, { expira: number; valor: unknown }>();
const TTL = 30_000;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function json<T>(url: string, ttl = TTL, timeoutMs = 12_000): Promise<T | null> {
  const cache = memoria.get(url);
  if (cache && cache.expira > Date.now()) return cache.valor as T;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!res.ok) return (cache?.valor as T) ?? null;
    const valor = (await res.json()) as T;
    memoria.set(url, { valor, expira: Date.now() + ttl });
    return valor;
  } catch {
    return (cache?.valor as T) ?? null;
  } finally {
    clearTimeout(timer);
  }
}

async function emLotes<T, R>(itens: T[], tamanho: number, fn: (i: T) => Promise<R>): Promise<R[]> {
  const saida: R[] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    const parte = await Promise.all(itens.slice(i, i + tamanho).map(fn));
    saida.push(...parte);
    if (i + tamanho < itens.length) await dormir(120);
  }
  return saida;
}

const vazio = (d: Def, categoria: CategoriaMercado, moeda = "BRL"): LinhaCotacao => ({
  ticker: d.ticker,
  simbolo: d.simbolo ?? `${d.ticker}.SA`,
  nome: d.nome,
  categoria,
  grupo: d.grupo ?? null,
  preco: null,
  fechamentoAnterior: null,
  variacao: null,
  variacaoPercent: null,
  minimo: null,
  maximo: null,
  volume: null,
  moeda,
  spark: [],
  extra: [],
});

/* ------------------------------------------------------------------ *
 * brapi — B3 em lote
 * ------------------------------------------------------------------ */

type BrapiQuote = {
  symbol?: string;
  currency?: string;
  regularMarketPrice?: number | null;
  regularMarketPreviousClose?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
  regularMarketDayLow?: number | null;
  regularMarketDayHigh?: number | null;
  regularMarketVolume?: number | null;
  historicalDataPrice?: Array<{ close?: number | null }>;
};

/** Limite de tickers por requisição aprendido com a resposta da brapi. */
let limiteBrapi = 0;
/** Faixa/intervalo de histórico aceitos pelo plano da brapi (aprendido). */
let historicoBrapi: { range: string; interval: string } = { range: "1d", interval: "30m" };

async function brapiPagina(
  tickers: string[],
  token: string | undefined,
  mapa: Map<string, BrapiQuote>,
): Promise<"ok" | "limite" | "intervalo"> {
  const params = new URLSearchParams(historicoBrapi);
  if (token) params.set("token", token);
  const url = `https://brapi.dev/api/quote/${tickers.join(",")}?${params}`;
  // A brapi devolve 4xx com corpo JSON descrevendo o limite do plano;
  // por isso lemos o corpo mesmo em respostas de erro.
  type Resposta = { results?: BrapiQuote[]; error?: boolean; code?: string; message?: string };
  let data: Resposta | null = null;
  const cache = memoria.get(url);
  if (cache && cache.expira > Date.now()) {
    data = cache.valor as Resposta;
  } else {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      data = (await res.json()) as Resposta;
      if (res.ok) memoria.set(url, { valor: data, expira: Date.now() + 120_000 });
    } catch {
      data = null;
    }
  }

  if (data?.error) {
    if (data.code === "QUOTES_PER_REQUEST_EXCEEDED") {
      const permitido = Number(data.message?.match(/máximo\s+(\d+)/i)?.[1] ?? 1);
      limiteBrapi = Math.max(1, permitido);
      return "limite";
    }
    if (data.code === "INVALID_INTERVAL" || data.code === "INVALID_RANGE") {
      historicoBrapi = { range: "1mo", interval: "1d" };
      return "intervalo";
    }
    return "ok";
  }
  for (const r of data?.results ?? []) if (r.symbol) mapa.set(r.symbol.toUpperCase(), r);
  // Tickers renomeados pela B3 voltam com outro símbolo: associa ao pedido.
  if (tickers.length === 1 && data?.results?.length === 1) {
    mapa.set(tickers[0].toUpperCase(), data.results[0]);
  }

}


async function brapiLote(defs: Def[], categoria: CategoriaMercado): Promise<LinhaCotacao[]> {
  const token = process.env.BRAPI_TOKEN;
  if (!limiteBrapi) limiteBrapi = token ? 20 : 2;
  const mapa = new Map<string, BrapiQuote>();

  const buscar = async (tamanho: number) => {
    const grupos: string[][] = [];
    const alvo = defs.filter((d) => !mapa.has(d.ticker.toUpperCase())).map((d) => d.ticker);
    for (let i = 0; i < alvo.length; i += tamanho) grupos.push(alvo.slice(i, i + tamanho));
    let refazer = false;
    await emLotes(grupos, tamanho === 1 ? 8 : 4, async (lote) => {
      if (refazer) return;
      const r = await brapiPagina(lote, token, mapa);
      if (r !== "ok") refazer = true;
    });
    return refazer;
  };

  // Reaprende limite de tickers / faixa de histórico do plano e refaz.
  if (await buscar(limiteBrapi)) {
    if (await buscar(limiteBrapi)) await buscar(limiteBrapi);
  }




  const linhas = defs.map((d) => {
    const r = mapa.get(d.ticker.toUpperCase());
    if (!r || typeof r.regularMarketPrice !== "number") return vazio(d, categoria);
    const preco = r.regularMarketPrice;
    const anterior = r.regularMarketPreviousClose ?? null;
    return {
      ...vazio(d, categoria, r.currency ?? "BRL"),
      preco,
      fechamentoAnterior: anterior,
      variacao: r.regularMarketChange ?? (anterior !== null ? preco - anterior : null),
      variacaoPercent:
        r.regularMarketChangePercent ??
        (anterior && anterior > 0 ? ((preco - anterior) / anterior) * 100 : null),
      minimo: r.regularMarketDayLow ?? null,
      maximo: r.regularMarketDayHigh ?? null,
      volume: r.regularMarketVolume ?? null,
      spark: (r.historicalDataPrice ?? [])
        .map((p) => p.close)
        .filter((v): v is number => typeof v === "number")
        .slice(-40),
    };
  });

  // Fallback: ativos sem retorno da brapi são buscados no Yahoo (TICKER.SA).
  const faltantes = linhas
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.preco === null);
  if (faltantes.length) {
    const resolvidos = await emLotes(faltantes, 4, async ({ l, i }) => ({
      i,
      linha: await yahooLinha(
        { ticker: l.ticker, nome: l.nome, grupo: l.grupo ?? undefined, simbolo: `${l.ticker}.SA` },
        categoria,
      ),
    }));
    for (const { i, linha } of resolvidos) if (linha.preco !== null) linhas[i] = linha;
  }

  return linhas;
}


/* ------------------------------------------------------------------ *
 * Yahoo — índices, câmbio, commodities e futuros
 * ------------------------------------------------------------------ */

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketDayLow?: number;
        regularMarketDayHigh?: number;
        regularMarketVolume?: number;
      };
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }>;
  };
};

async function yahooLinha(d: Def, categoria: CategoriaMercado): Promise<LinhaCotacao> {
  const simbolo = d.simbolo ?? d.ticker;
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  for (const host of hosts) {
    const data = await json<YahooChart>(
      `https://${host}/v8/finance/chart/${encodeURIComponent(simbolo)}?range=1d&interval=15m`,
    );
    const r = data?.chart?.result?.[0];
    const preco = r?.meta?.regularMarketPrice;
    if (typeof preco !== "number") continue;
    const anterior = r?.meta?.chartPreviousClose ?? r?.meta?.previousClose ?? null;
    const serie = (r?.indicators?.quote?.[0]?.close ?? []).filter(
      (v): v is number => typeof v === "number",
    );
    return {
      ...vazio(d, categoria, r?.meta?.currency ?? "USD"),
      simbolo,
      preco,
      fechamentoAnterior: anterior,
      variacao: anterior !== null ? preco - anterior : null,
      variacaoPercent: anterior && anterior > 0 ? ((preco - anterior) / anterior) * 100 : null,
      minimo: r?.meta?.regularMarketDayLow ?? (serie.length ? Math.min(...serie) : null),
      maximo: r?.meta?.regularMarketDayHigh ?? (serie.length ? Math.max(...serie) : null),
      volume: r?.meta?.regularMarketVolume ?? null,
      spark: serie.slice(-40),
    };
  }
  return { ...vazio(d, categoria, "USD"), simbolo };
}

async function yahooGrade(defs: Def[], categoria: CategoriaMercado): Promise<LinhaCotacao[]> {
  return emLotes(defs, 4, (d) => yahooLinha(d, categoria));
}

/** Cotação do dólar usada para converter preços internacionais em reais. */
export async function dolarBRL(): Promise<number | null> {
  const linha = await yahooLinha({ ticker: "USD/BRL", nome: "Dólar", simbolo: "BRL=X" }, "cambio");
  return linha.preco;
}

/* ------------------------------------------------------------------ *
 * CoinGecko — criptomoedas
 * ------------------------------------------------------------------ */

type Moeda = {
  id: string;
  current_price?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  high_24h?: number;
  low_24h?: number;
  total_volume?: number;
  sparkline_in_7d?: { price?: number[] };
};

async function cripto(): Promise<LinhaCotacao[]> {
  const ids = CRIPTO_IDS.map(([id]) => id).join(",");
  const data = await json<Moeda[]>(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`,
  );
  const mapa = new Map((data ?? []).map((m) => [m.id, m]));

  return CRIPTO_IDS.map(([id, ticker, nome]) => {
    const d: Def = { ticker, nome, grupo: "Cripto", simbolo: `${ticker}-USD` };
    const m = mapa.get(id);
    if (!m || typeof m.current_price !== "number") return { ...vazio(d, "cripto", "USD") };
    const spark = (m.sparkline_in_7d?.price ?? []).slice(-48);
    return {
      ...vazio(d, "cripto", "USD"),
      preco: m.current_price,
      fechamentoAnterior:
        typeof m.price_change_24h === "number" ? m.current_price - m.price_change_24h : null,
      variacao: m.price_change_24h ?? null,
      variacaoPercent: m.price_change_percentage_24h ?? null,
      minimo: m.low_24h ?? null,
      maximo: m.high_24h ?? null,
      volume: m.total_volume ?? null,
      spark,
    };
  });
}

/* ------------------------------------------------------------------ *
 * API pública do módulo
 * ------------------------------------------------------------------ */

const VENCIMENTO: Record<string, string> = {
  WIN: "Vencimento par (abr/jun/ago/out/dez)",
  WDO: "Vencimento mensal",
  DI1: "Jan/2027",
  BGI: "Mensal",
  CCM: "Mar/Mai/Jul/Set/Nov",
  ICF: "Mar/Mai/Jul/Set/Dez",
};

const UNIDADE: Record<string, string> = {
  BRENT: "US$ / barril",
  WTI: "US$ / barril",
  OURO: "US$ / onça troy",
  PRATA: "US$ / onça troy",
  COBRE: "US$ / libra",
  SOJA: "US¢ / bushel",
  MILHO: "US¢ / bushel",
  CAFE: "US¢ / libra",
};

export async function buscarGrade(categoria: CategoriaMercado): Promise<RespostaGrade> {
  let linhas: LinhaCotacao[] = [];
  let fonte = "";

  switch (categoria) {
    case "acoes":
      linhas = await brapiLote(ACOES, "acoes");
      fonte = "brapi.dev · B3";
      break;
    case "fiis":
      linhas = await brapiLote(FIIS, "fiis");
      fonte = "brapi.dev · B3";
      break;
    case "etfs": {
      const [br, ex] = await Promise.all([
        brapiLote(ETFS, "etfs"),
        yahooGrade(ETFS_GLOBAIS, "etfs"),
      ]);
      linhas = [...br, ...ex];
      fonte = "brapi.dev + Yahoo Finance";
      break;
    }
    case "futuros":
      linhas = (await yahooGrade(FUTUROS, "futuros")).map((l) => ({
        ...l,
        extra: VENCIMENTO[l.ticker] ? [{ rotulo: "Vencimento", valor: VENCIMENTO[l.ticker] }] : [],
      }));
      fonte = "Yahoo Finance (referência internacional)";
      break;
    case "commodities": {
      const [dados, usd] = await Promise.all([yahooGrade(COMMODITIES, "commodities"), dolarBRL()]);
      linhas = dados.map((l) => ({
        ...l,
        extra: [
          ...(UNIDADE[l.ticker] ? [{ rotulo: "Unidade", valor: UNIDADE[l.ticker] }] : []),
          ...(usd && l.preco !== null
            ? [
                {
                  rotulo: "Em reais",
                  valor: (l.preco * usd).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }),
                },
              ]
            : []),
        ],
      }));
      fonte = "Yahoo Finance";
      break;
    }
    case "cripto": {
      const [dados, usd] = await Promise.all([cripto(), dolarBRL()]);
      linhas = dados.map((l) => ({
        ...l,
        extra:
          usd && l.preco !== null
            ? [
                {
                  rotulo: "Em reais",
                  valor: (l.preco * usd).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 2,
                  }),
                },
              ]
            : [],
      }));
      fonte = "CoinGecko";
      break;
    }
    case "cambio":
      linhas = await yahooGrade(CAMBIO, "cambio");
      fonte = "Yahoo Finance";
      break;
    case "indices":
      linhas = await yahooGrade(INDICES_GRADE, "indices");
      fonte = "Yahoo Finance";
      break;
  }

  return {
    categoria,
    linhas,
    atualizadoEm: new Date().toISOString(),
    fonte,
    parcial: linhas.some((l) => l.preco === null),
  };
}

/** Painel resumido da Visão Geral: índices + destaques de cada classe. */
export async function buscarVisaoGeral() {
  const [indices, acoes, fiis, criptos] = await Promise.all([
    buscarGrade("indices"),
    buscarGrade("acoes"),
    buscarGrade("fiis"),
    buscarGrade("cripto"),
  ]);

  const todos = [...acoes.linhas, ...fiis.linhas, ...criptos.linhas].filter(
    (l) => l.variacaoPercent !== null,
  );
  const ordenado = [...todos].sort(
    (a, b) => (b.variacaoPercent ?? 0) - (a.variacaoPercent ?? 0),
  );

  return {
    indices: indices.linhas,
    altas: ordenado.slice(0, 8),
    baixas: ordenado.slice(-8).reverse(),
    atualizadoEm: new Date().toISOString(),
  };
}
