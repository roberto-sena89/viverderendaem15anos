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
  { ticker: "CURY3", nome: "Cury", grupo: "Construção" },
  { ticker: "COGN3", nome: "Cogna", grupo: "Educação" },
  { ticker: "USIM5", nome: "Usiminas", grupo: "Commodities" },
  { ticker: "CMIN3", nome: "CSN Mineração", grupo: "Commodities" },
  { ticker: "GOAU4", nome: "Metalúrgica Gerdau", grupo: "Commodities" },
  { ticker: "BRKM5", nome: "Braskem", grupo: "Commodities" },
  { ticker: "SLCE3", nome: "SLC Agrícola", grupo: "Commodities" },
  { ticker: "CSAN3", nome: "Cosan", grupo: "Energia" },
  { ticker: "BRAV3", nome: "Brava Energia", grupo: "Energia" },
  { ticker: "ENEV3", nome: "Eneva", grupo: "Energia" },
  { ticker: "CMIG4", nome: "Cemig", grupo: "Energia" },
  { ticker: "EQTL3", nome: "Equatorial", grupo: "Energia" },
  { ticker: "ENGI11", nome: "Energisa", grupo: "Energia" },
  { ticker: "VBBR3", nome: "Vibra Energia", grupo: "Energia" },
  { ticker: "UGPA3", nome: "Ultrapar", grupo: "Energia" },
  { ticker: "SBSP3", nome: "Sabesp", grupo: "Saneamento" },
  { ticker: "TIMS3", nome: "TIM", grupo: "Tecnologia" },
  { ticker: "CXSE3", nome: "Caixa Seguridade", grupo: "Financeiro" },
  { ticker: "BBSE3", nome: "BB Seguridade", grupo: "Financeiro" },
  { ticker: "MULT3", nome: "Multiplan", grupo: "Consumo" },
  { ticker: "ALOS3", nome: "Allos", grupo: "Consumo" },
  { ticker: "NATU3", nome: "Natura", grupo: "Consumo" },
  { ticker: "SMFT3", nome: "Smart Fit", grupo: "Consumo" },
  { ticker: "HYPE3", nome: "Hypera", grupo: "Saúde" },
];

export const FIIS: Def[] = [
  { ticker: "MXRF11", nome: "Maxi Renda", grupo: "Papel" },
  { ticker: "KNCR11", nome: "Kinea Rendimentos", grupo: "Papel" },
  { ticker: "KNIP11", nome: "Kinea Índices de Preços", grupo: "Papel" },
  { ticker: "IRDM11", nome: "Iridium Recebíveis", grupo: "Papel" },
  { ticker: "RECR11", nome: "REC Recebíveis", grupo: "Papel" },
  { ticker: "CPTS11", nome: "Capitânia Securities", grupo: "Papel" },
  { ticker: "VGIR11", nome: "Valora CRI CDI", grupo: "Papel" },
  { ticker: "KNSC11", nome: "Kinea Securities", grupo: "Papel" },
  { ticker: "VGHF11", nome: "Valora Hedge Fund", grupo: "Papel" },
  { ticker: "PORD11", nome: "Polo Recebíveis", grupo: "Papel" },
  { ticker: "RBRX11", nome: "RBR X", grupo: "Papel" },
  { ticker: "BTCI11", nome: "BTG Crédito Imobiliário", grupo: "Papel" },
  { ticker: "HGLG11", nome: "CSHG Logística", grupo: "Tijolo" },
  { ticker: "XPLG11", nome: "XP Log", grupo: "Tijolo" },
  { ticker: "BTLG11", nome: "BTG Logística", grupo: "Tijolo" },
  { ticker: "GGRC11", nome: "GGR Covepi Renda", grupo: "Tijolo" },
  { ticker: "VISC11", nome: "Vinci Shopping Centers", grupo: "Tijolo" },
  { ticker: "XPML11", nome: "XP Malls", grupo: "Tijolo" },
  { ticker: "HGBS11", nome: "CSHG Shoppings", grupo: "Tijolo" },
  { ticker: "HGRE11", nome: "CSHG Real Estate", grupo: "Tijolo" },
  { ticker: "HGRU11", nome: "CSHG Renda Urbana", grupo: "Tijolo" },
  { ticker: "HSML11", nome: "HSI Malls", grupo: "Tijolo" },
  { ticker: "VILG11", nome: "Vinci Logística", grupo: "Tijolo" },
  { ticker: "MALL11", nome: "Malls Brasil Plural", grupo: "Tijolo" },
  { ticker: "GARE11", nome: "Guardian Real Estate", grupo: "Tijolo" },
  { ticker: "KNRI11", nome: "Kinea Renda Imobiliária", grupo: "Híbrido" },
  { ticker: "ALZR11", nome: "Alianza Trust Renda", grupo: "Híbrido" },
  { ticker: "TRXF11", nome: "TRX Real Estate", grupo: "Híbrido" },
  { ticker: "JSAF11", nome: "JS Real Estate", grupo: "Híbrido" },
  { ticker: "HFOF11", nome: "Hedge TOP FOFII", grupo: "Fundo de Fundos" },
  { ticker: "RBRF11", nome: "RBR Alpha", grupo: "Fundo de Fundos" },
  { ticker: "RURA11", nome: "Itaú Asset Rural", grupo: "Fiagro" },
  { ticker: "RZAG11", nome: "Riza Agro", grupo: "Fiagro" },
  { ticker: "SNAG11", nome: "Suno Agro", grupo: "Fiagro" },
];

export const ETFS: Def[] = [
  { ticker: "BOVA11", nome: "iShares Ibovespa", grupo: "Brasil" },
  { ticker: "BOVV11", nome: "It Now Ibovespa", grupo: "Brasil" },
  { ticker: "SMAL11", nome: "iShares Small Cap", grupo: "Brasil" },
  { ticker: "DIVO11", nome: "It Now Dividendos", grupo: "Brasil" },
  { ticker: "FIND11", nome: "It Now Financeiro", grupo: "Brasil" },
  { ticker: "IVVB11", nome: "iShares S&P 500 BRL", grupo: "Brasil" },
  { ticker: "SPXI11", nome: "It Now S&P 500", grupo: "Brasil" },
  { ticker: "NASD11", nome: "Nasdaq-100 BDR", grupo: "Brasil" },
  { ticker: "TECK11", nome: "It Now Tech Global", grupo: "Brasil" },
  { ticker: "XINA11", nome: "It Now China", grupo: "Brasil" },
  { ticker: "IMAB11", nome: "It Now IMA-B (Tesouro IPCA+)", grupo: "Brasil" },
  { ticker: "HASH11", nome: "Hashdex Crypto", grupo: "Brasil" },
  { ticker: "GOLD11", nome: "Ouro Trust", grupo: "Brasil" },
  { ticker: "XFIX11", nome: "Trend IFIX", grupo: "Brasil" },
];

export const ETFS_GLOBAIS: Def[] = [
  { ticker: "SPY", nome: "SPDR S&P 500", grupo: "Exterior", simbolo: "SPY" },
  { ticker: "VOO", nome: "Vanguard S&P 500", grupo: "Exterior", simbolo: "VOO" },
  { ticker: "QQQ", nome: "Invesco Nasdaq-100", grupo: "Exterior", simbolo: "QQQ" },
  { ticker: "ARKK", nome: "ARK Innovation", grupo: "Exterior", simbolo: "ARKK" },
  { ticker: "VT", nome: "Vanguard Total World", grupo: "Exterior", simbolo: "VT" },
  { ticker: "VNQ", nome: "Vanguard Real Estate", grupo: "Exterior", simbolo: "VNQ" },
  { ticker: "IEF", nome: "iShares 7-10Y Treasury", grupo: "Exterior", simbolo: "IEF" },
  { ticker: "TLT", nome: "iShares 20+Y Treasury", grupo: "Exterior", simbolo: "TLT" },
  { ticker: "GLD", nome: "SPDR Gold Shares", grupo: "Exterior", simbolo: "GLD" },
  { ticker: "EEM", nome: "iShares Emerging Markets", grupo: "Exterior", simbolo: "EEM" },
];

export const FUTUROS: Def[] = [
  { ticker: "WIN", nome: "Mini Índice Bovespa", simbolo: "^BVSP", grupo: "Índice" },
  { ticker: "WDO", nome: "Mini Dólar", simbolo: "BRL=X", grupo: "Moeda" },
  { ticker: "DI1", nome: "DI Futuro (proxy Selic)", simbolo: "^BVSP", grupo: "Juros" },
  { ticker: "ES", nome: "S&P 500 Futuro", simbolo: "ES=F", grupo: "Índice" },
  { ticker: "NQ", nome: "Nasdaq-100 Futuro", simbolo: "NQ=F", grupo: "Índice" },
  { ticker: "BGI", nome: "Boi Gordo", simbolo: "LE=F", grupo: "Agro" },
  { ticker: "CCM", nome: "Milho", simbolo: "ZC=F", grupo: "Agro" },
  { ticker: "ICF", nome: "Café Arábica", simbolo: "KC=F", grupo: "Agro" },
];

export const COMMODITIES: Def[] = [
  { ticker: "BRENT", nome: "Petróleo Brent", simbolo: "BZ=F", grupo: "Energia" },
  { ticker: "WTI", nome: "Petróleo WTI", simbolo: "CL=F", grupo: "Energia" },
  { ticker: "GAS", nome: "Gás natural", simbolo: "NG=F", grupo: "Energia" },
  { ticker: "OURO", nome: "Ouro", simbolo: "GC=F", grupo: "Metais" },
  { ticker: "PRATA", nome: "Prata", simbolo: "SI=F", grupo: "Metais" },
  { ticker: "COBRE", nome: "Cobre", simbolo: "HG=F", grupo: "Metais" },
  { ticker: "SOJA", nome: "Soja", simbolo: "ZS=F", grupo: "Agro" },
  { ticker: "MILHO", nome: "Milho", simbolo: "ZC=F", grupo: "Agro" },
  { ticker: "TRIGO", nome: "Trigo", simbolo: "ZW=F", grupo: "Agro" },
  { ticker: "CAFE", nome: "Café", simbolo: "KC=F", grupo: "Agro" },
  { ticker: "ACUCAR", nome: "Açúcar", simbolo: "SB=F", grupo: "Agro" },
  { ticker: "ALGODAO", nome: "Algodão", simbolo: "CT=F", grupo: "Agro" },
];

export const CAMBIO: Def[] = [
  { ticker: "USD/BRL", nome: "Dólar comercial", simbolo: "BRL=X" },
  { ticker: "EUR/BRL", nome: "Euro", simbolo: "EURBRL=X" },
  { ticker: "GBP/BRL", nome: "Libra esterlina", simbolo: "GBPBRL=X" },
  { ticker: "JPY/BRL", nome: "Iene japonês", simbolo: "JPYBRL=X" },
  { ticker: "CHF/BRL", nome: "Franco suíço", simbolo: "CHFBRL=X" },
  { ticker: "CAD/BRL", nome: "Dólar canadense", simbolo: "CADBRL=X" },
  { ticker: "ARS/BRL", nome: "Peso argentino", simbolo: "ARSBRL=X" },
  { ticker: "EUR/USD", nome: "Euro x Dólar", simbolo: "EURUSD=X" },
  { ticker: "USD/JPY", nome: "Dólar x Iene", simbolo: "USDJPY=X" },
  { ticker: "AUD/USD", nome: "Dólar australiano", simbolo: "AUDUSD=X" },
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
  ["tron", "TRX", "TRON"],
  ["the-open-network", "TON", "Toncoin"],
  ["shiba-inu", "SHIB", "Shiba Inu"],
  ["near", "NEAR", "NEAR Protocol"],
  ["uniswap", "UNI", "Uniswap"],
  ["polygon-ecosystem-token", "POL", "Polygon"],
] as const;


/* ------------------------------------------------------------------ *
 * Infra de rede
 * ------------------------------------------------------------------ */

const memoria = new Map<string, { expira: number; valor: unknown }>();
const TTL = 30_000;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PADRAO = { Accept: "application/json" };
/** Alguns símbolos do Yahoo só respondem quando a chamada simula um navegador. */
const CABECALHOS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

async function json<T>(
  url: string,
  ttl = TTL,
  timeoutMs = 12_000,
  headers: Record<string, string> = PADRAO,
): Promise<T | null> {
  const cache = memoria.get(url);
  if (cache && cache.expira > Date.now()) return cache.valor as T;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });

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
      const res = await fetch(url, { headers: CABECALHOS });
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
  return "ok";
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
