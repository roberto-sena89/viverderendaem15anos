/**
 * Dados de mercado a partir de fontes públicas gratuitas:
 * - Yahoo Finance (cotações e histórico de até 10 anos de ações, FIIs, ETFs e índices)
 * - Banco Central do Brasil: SGS (Selic, CDI, IPCA, dólar) e Expectativas Focus (projeções)
 */

const YAHOO = "https://query1.finance.yahoo.com";
const YAHOO_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cache curto em memória para aliviar o rate limit das fontes públicas. */
const cache = new Map<string, { expira: number; valor: unknown }>();
const TTL_MS = 5 * 60 * 1000;

async function buscar(url: string, timeoutMs: number, comUA = false): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      // O Yahoo rejeita (429) requisições com User-Agent de navegador vindas de
      // servidores; por padrão enviamos apenas Accept e só usamos o UA no retry.
      headers: comUA ? { "User-Agent": UA, Accept: "application/json" } : { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}


async function getJson<T>(url: string, timeoutMs = 15000): Promise<T> {
  const emCache = cache.get(url);
  if (emCache && emCache.expira > Date.now()) return emCache.valor as T;

  const host = new URL(url).host;
  const hosts = YAHOO_HOSTS.includes(host) ? YAHOO_HOSTS : [host];
  let ultimoStatus = 0;

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    for (const h of hosts) {
      const alvo = url.replace(host, h);
      let res: Response;
      try {
        res = await buscar(alvo, timeoutMs, tentativa === 2);
      } catch {
        continue;
      }
      if (res.ok) {
        const valor = (await res.json()) as T;
        cache.set(url, { valor, expira: Date.now() + TTL_MS });
        return valor;
      }
      ultimoStatus = res.status;
      if (res.status !== 429 && res.status < 500) {
        throw new Error(`Fonte respondeu ${res.status} em ${h}`);
      }
    }
    await dormir(500 * 2 ** tentativa);
  }

  // fallback: devolve o último resultado em cache, mesmo expirado
  if (emCache) return emCache.valor as T;
  throw new Error(
    ultimoStatus === 429
      ? "A fonte de dados de mercado está limitando as consultas no momento. Tente novamente em alguns instantes."
      : `Não foi possível consultar a fonte de dados (${ultimoStatus || "sem resposta"}).`,
  );
}


/** Normaliza tickers da B3: PETR4 -> PETR4.SA. Mantém índices (^BVSP) e símbolos estrangeiros. */
export function normalizarSimbolo(entrada: string): string {
  const t = entrada.trim().toUpperCase();
  if (!t) return t;
  if (t.startsWith("^") || t.includes(".") || t.includes("=") || t.includes("-")) return t;
  if (/^[A-Z]{4}(3|4|5|6|11|11B|31|32|33|34|35|39)$/.test(t)) return `${t}.SA`;
  return t;
}

export const INDICES: Record<string, string> = {
  IBOVESPA: "^BVSP",
  IBOV: "^BVSP",
  IFIX: "IFIX.SA",
  "S&P500": "^GSPC",
  SP500: "^GSPC",
  NASDAQ: "^IXIC",
  DOLAR: "BRL=X",
  "DÓLAR": "BRL=X",
  EURO: "EURBRL=X",
  BITCOIN: "BTC-USD",
  OURO: "GC=F",
  PETROLEO: "BZ=F",
  "PETRÓLEO": "BZ=F",
};

type ChartResponse = {
  chart: {
    error?: { description?: string } | null;
    result?: Array<{
      meta: {
        symbol: string;
        currency?: string;
        longName?: string;
        shortName?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        regularMarketTime?: number;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators: { quote?: Array<{ close?: (number | null)[] }>; adjclose?: Array<{ adjclose?: (number | null)[] }> };
    }>;
  };
};

export type Cotacao = {
  simbolo: string;
  nome: string;
  moeda: string;
  preco: number | null;
  fechamentoAnterior: number | null;
  variacaoDia: number | null;
  variacaoDiaPercent: number | null;
  maxima52s: number | null;
  minima52s: number | null;
  bolsa: string | null;
  atualizadoEm: string | null;
};

export async function buscarCotacao(simboloEntrada: string): Promise<Cotacao> {
  const simbolo = normalizarSimbolo(INDICES[simboloEntrada.trim().toUpperCase()] ?? simboloEntrada);
  const data = await getJson<ChartResponse>(
    `${YAHOO}/v8/finance/chart/${encodeURIComponent(simbolo)}?range=5d&interval=1d`,
  );
  const r = data.chart.result?.[0];
  if (!r) throw new Error(`Não encontrei o ativo "${simboloEntrada}" nas fontes de mercado.`);
  const m = r.meta;
  const preco = m.regularMarketPrice ?? null;
  const anterior = m.previousClose ?? m.chartPreviousClose ?? null;
  const variacao = preco !== null && anterior ? preco - anterior : null;
  return {
    simbolo: m.symbol,
    nome: m.longName ?? m.shortName ?? m.symbol,
    moeda: m.currency ?? "BRL",
    preco,
    fechamentoAnterior: anterior,
    variacaoDia: variacao,
    variacaoDiaPercent: variacao !== null && anterior ? (variacao / anterior) * 100 : null,
    maxima52s: m.fiftyTwoWeekHigh ?? null,
    minima52s: m.fiftyTwoWeekLow ?? null,
    bolsa: m.exchangeName ?? null,
    atualizadoEm: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null,
  };
}

export type Historico = {
  simbolo: string;
  nome: string;
  moeda: string;
  periodo: string;
  intervalo: string;
  serie: { data: string; fechamento: number }[];
  resumo: {
    primeiroPreco: number | null;
    ultimoPreco: number | null;
    retornoTotalPercent: number | null;
    retornoAnualizadoPercent: number | null;
    maximo: number | null;
    minimo: number | null;
    drawdownMaximoPercent: number | null;
    volatilidadeAnualPercent: number | null;
    anos: { ano: number; primeiro: number; ultimo: number; variacaoPercent: number }[];
  };
};

export async function buscarHistorico(
  simboloEntrada: string,
  periodo: "1mo" | "6mo" | "1y" | "2y" | "5y" | "10y" | "max" = "10y",
  intervalo: "1d" | "1wk" | "1mo" = "1mo",
): Promise<Historico> {
  const simbolo = normalizarSimbolo(INDICES[simboloEntrada.trim().toUpperCase()] ?? simboloEntrada);
  const data = await getJson<ChartResponse>(
    `${YAHOO}/v8/finance/chart/${encodeURIComponent(simbolo)}?range=${periodo}&interval=${intervalo}&events=div%2Csplit`,
    20000,
  );
  const r = data.chart.result?.[0];
  if (!r?.timestamp) throw new Error(`Sem histórico disponível para "${simboloEntrada}".`);

  const closes = r.indicators.adjclose?.[0]?.adjclose ?? r.indicators.quote?.[0]?.close ?? [];
  const serie = r.timestamp
    .map((t, i) => ({ data: new Date(t * 1000).toISOString().slice(0, 10), fechamento: closes[i] ?? null }))
    .filter((p): p is { data: string; fechamento: number } => typeof p.fechamento === "number");

  const primeiro = serie[0]?.fechamento ?? null;
  const ultimo = serie[serie.length - 1]?.fechamento ?? null;
  const anosDecorridos =
    serie.length > 1
      ? (new Date(serie[serie.length - 1].data).getTime() - new Date(serie[0].data).getTime()) /
        (365.25 * 24 * 3600 * 1000)
      : 0;

  let pico = -Infinity;
  let drawdown = 0;
  for (const p of serie) {
    pico = Math.max(pico, p.fechamento);
    drawdown = Math.min(drawdown, (p.fechamento - pico) / pico);
  }

  const retornos: number[] = [];
  for (let i = 1; i < serie.length; i++) {
    const anterior = serie[i - 1].fechamento;
    if (anterior > 0) retornos.push(serie[i].fechamento / anterior - 1);
  }
  const media = retornos.length ? retornos.reduce((s, v) => s + v, 0) / retornos.length : 0;
  const variancia = retornos.length > 1
    ? retornos.reduce((s, v) => s + (v - media) ** 2, 0) / (retornos.length - 1)
    : 0;
  const periodosPorAno = intervalo === "1d" ? 252 : intervalo === "1wk" ? 52 : 12;

  const porAno = new Map<number, { primeiro: number; ultimo: number }>();
  for (const p of serie) {
    const ano = Number(p.data.slice(0, 4));
    const atual = porAno.get(ano);
    if (!atual) porAno.set(ano, { primeiro: p.fechamento, ultimo: p.fechamento });
    else atual.ultimo = p.fechamento;
  }

  return {
    simbolo: r.meta.symbol,
    nome: r.meta.longName ?? r.meta.shortName ?? r.meta.symbol,
    moeda: r.meta.currency ?? "BRL",
    periodo,
    intervalo,
    serie,
    resumo: {
      primeiroPreco: primeiro,
      ultimoPreco: ultimo,
      retornoTotalPercent: primeiro && ultimo ? ((ultimo - primeiro) / primeiro) * 100 : null,
      retornoAnualizadoPercent:
        primeiro && ultimo && anosDecorridos > 0.5 ? ((ultimo / primeiro) ** (1 / anosDecorridos) - 1) * 100 : null,
      maximo: serie.length ? Math.max(...serie.map((p) => p.fechamento)) : null,
      minimo: serie.length ? Math.min(...serie.map((p) => p.fechamento)) : null,
      drawdownMaximoPercent: serie.length ? drawdown * 100 : null,
      volatilidadeAnualPercent: variancia > 0 ? Math.sqrt(variancia * periodosPorAno) * 100 : null,
      anos: [...porAno.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([ano, v]) => ({
          ano,
          primeiro: v.primeiro,
          ultimo: v.ultimo,
          variacaoPercent: v.primeiro > 0 ? ((v.ultimo - v.primeiro) / v.primeiro) * 100 : 0,
        })),
    },
  };
}

type SearchResponse = { quotes?: Array<{ symbol?: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string }> };

export async function procurarAtivo(termo: string) {
  const data = await getJson<SearchResponse>(
    `${YAHOO}/v1/finance/search?q=${encodeURIComponent(termo)}&quotesCount=10&newsCount=0`,
  );
  return (data.quotes ?? [])
    .filter((q) => q.symbol)
    .map((q) => ({
      simbolo: q.symbol as string,
      nome: q.longname ?? q.shortname ?? q.symbol,
      bolsa: q.exchange ?? null,
      tipo: q.quoteType ?? null,
    }));
}

/* ---------------- Banco Central ---------------- */

const SGS: Record<string, { codigo: number; nome: string; unidade: string }> = {
  selic: { codigo: 432, nome: "Meta Selic", unidade: "% a.a." },
  cdi: { codigo: 4389, nome: "CDI", unidade: "% a.a." },
  ipca: { codigo: 433, nome: "IPCA mensal", unidade: "% a.m." },
  igpm: { codigo: 189, nome: "IGP-M mensal", unidade: "% a.m." },
  dolar: { codigo: 1, nome: "Dólar comercial (venda)", unidade: "BRL" },
  poupanca: { codigo: 195, nome: "Poupança", unidade: "% a.m." },
};

export async function buscarIndicador(indicador: keyof typeof SGS | string, ultimos = 12) {
  const chave = indicador.toLowerCase().replace("ó", "o").replace("â", "a");
  const meta = SGS[chave];
  if (!meta) throw new Error(`Indicador desconhecido. Use: ${Object.keys(SGS).join(", ")}.`);
  const dados = await getJson<{ data: string; valor: string }[]>(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${meta.codigo}/dados/ultimos/${Math.min(Math.max(ultimos, 1), 240)}?formato=json`,
  );
  return {
    indicador: meta.nome,
    unidade: meta.unidade,
    fonte: "Banco Central do Brasil (SGS)",
    serie: dados.map((d) => ({ data: d.data, valor: Number(d.valor) })),
  };
}

type FocusResponse = {
  value: Array<{
    Indicador: string;
    Data: string;
    DataReferencia: string;
    Media: number;
    Mediana: number;
    Minimo: number;
    Maximo: number;
    numeroRespondentes: number;
  }>;
};

/** Projeções do boletim Focus para os próximos anos (Selic, IPCA, PIB, Câmbio). */
export async function buscarProjecoes(indicador = "Selic") {
  const nome = indicador.trim().toLowerCase();
  const mapa: Record<string, string> = {
    selic: "Selic",
    juros: "Selic",
    ipca: "IPCA",
    inflacao: "IPCA",
    "inflação": "IPCA",
    pib: "PIB Total",
    cambio: "Câmbio",
    "câmbio": "Câmbio",
    dolar: "Câmbio",
    "dólar": "Câmbio",
    igpm: "IGP-M",
  };
  const alvo = mapa[nome] ?? "Selic";
  const url =
    "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?" +
    `$top=40&$filter=${encodeURIComponent(`Indicador eq '${alvo}' and baseCalculo eq 0`)}` +
    "&$orderby=Data%20desc&$format=json";
  const data = await getJson<FocusResponse>(url, 20000);

  const ultimaData = data.value[0]?.Data;
  const linhas = data.value
    .filter((v) => v.Data === ultimaData)
    .sort((a, b) => Number(a.DataReferencia) - Number(b.DataReferencia))
    .map((v) => ({
      ano: v.DataReferencia,
      mediana: v.Mediana,
      media: v.Media,
      minimo: v.Minimo,
      maximo: v.Maximo,
      respondentes: v.numeroRespondentes,
    }));

  return {
    indicador: alvo,
    unidade: alvo === "Câmbio" ? "BRL/USD" : "% a.a.",
    fonte: "Boletim Focus — Banco Central do Brasil",
    dataDoBoletim: ultimaData ?? null,
    projecoes: linhas,
  };
}

/* ------------------------------------------------------------------
 * Fita de cotações — busca resiliente em lote.
 * Ações/ETFs da B3 usam a brapi (até 3 por chamada, plano gratuito);
 * índices, câmbio e cripto usam o Yahoo, em série, para evitar 429.
 * ------------------------------------------------------------------ */

export type ItemFita = {
  simbolo: string;
  nome: string;
  preco: number | null;
  variacaoPercent: number | null;
  moeda: string;
};

type BrapiResposta = {
  results?: Array<{
    symbol: string;
    currency?: string;
    regularMarketPrice?: number | null;
    regularMarketChangePercent?: number | null;
  }>;
};

async function cotacoesBrapi(tickers: string[]): Promise<Map<string, ItemFita>> {
  const mapa = new Map<string, ItemFita>();
  for (let i = 0; i < tickers.length; i += 3) {
    const lote = tickers.slice(i, i + 3);
    try {
      const data = await getJson<BrapiResposta>(
        `https://brapi.dev/api/quote/${lote.join(",")}`,
        12000,
      );
      for (const r of data.results ?? []) {
        mapa.set(r.symbol.toUpperCase(), {
          simbolo: r.symbol,
          nome: r.symbol,
          preco: r.regularMarketPrice ?? null,
          variacaoPercent: r.regularMarketChangePercent ?? null,
          moeda: r.currency ?? "BRL",
        });
      }
    } catch {
      /* segue para o próximo lote */
    }
    if (i + 3 < tickers.length) await dormir(150);
  }
  return mapa;
}

/** Busca cotações para a fita, combinando brapi (B3) e Yahoo (índices/câmbio/cripto). */
export async function buscarFita(
  entradas: { simbolo: string; rotulo: string }[],
): Promise<ItemFita[]> {
  const ehB3 = (s: string) => /\.SA$/i.test(s);
  const b3 = entradas.filter((e) => ehB3(e.simbolo));
  const outros = entradas.filter((e) => !ehB3(e.simbolo));

  const mapaB3 = await cotacoesBrapi(b3.map((e) => e.simbolo.replace(/\.SA$/i, "").toUpperCase()));

  const resultados: ItemFita[] = [];

  for (const e of b3) {
    const chave = e.simbolo.replace(/\.SA$/i, "").toUpperCase();
    const achado = mapaB3.get(chave);
    if (achado) {
      resultados.push({ ...achado, simbolo: e.simbolo, nome: e.rotulo });
      continue;
    }
    try {
      const c = await buscarCotacao(e.simbolo);
      resultados.push({
        simbolo: e.simbolo,
        nome: e.rotulo,
        preco: c.preco,
        variacaoPercent: c.variacaoDiaPercent,
        moeda: c.moeda,
      });
    } catch {
      /* ignora o ativo indisponível */
    }
    await dormir(120);
  }

  for (const e of outros) {
    try {
      const c = await buscarCotacao(e.simbolo);
      resultados.push({
        simbolo: e.simbolo,
        nome: e.rotulo,
        preco: c.preco,
        variacaoPercent: c.variacaoDiaPercent,
        moeda: c.moeda,
      });
    } catch {
      /* ignora o ativo indisponível */
    }
    await dormir(120);
  }

  const ordem = new Map(entradas.map((e, i) => [e.simbolo, i]));
  return resultados
    .filter((r) => r.preco !== null)
    .sort((a, b) => (ordem.get(a.simbolo) ?? 0) - (ordem.get(b.simbolo) ?? 0));
}

/* ------------------------------------------------------------------
 * Rankings de ativos da B3 (brapi.dev): maiores dividend yield,
 * maiores valor de mercado e maiores receitas.
 * ------------------------------------------------------------------ */

export type TipoRanking = "acoes" | "fiis" | "bdrs";

export type ItemRanking = {
  ticker: string;
  nome: string;
  logo: string | null;
  preco: number | null;
  variacaoPercent: number | null;
  dy: number | null;
  valorMercado: number | null;
  receita: number | null;
};

export type RankingsB3 = {
  tipo: TipoRanking;
  dividendYield: ItemRanking[];
  valorMercado: ItemRanking[];
  receitas: ItemRanking[];
  atualizadoEm: string;
};

type BrapiLista = {
  stocks?: Array<{
    stock: string;
    name?: string;
    close?: number | null;
    change?: number | null;
    market_cap?: number | null;
    logo?: string | null;
  }>;
};

type BrapiDetalhe = {
  results?: Array<{
    symbol: string;
    longName?: string | null;
    shortName?: string | null;
    logourl?: string | null;
    regularMarketPrice?: number | null;
    regularMarketChangePercent?: number | null;
    marketCap?: number | null;
    financialData?: { totalRevenue?: number | null } | null;
    dividendsData?: { cashDividends?: Array<{ rate?: number | null; paymentDate?: string | null }> } | null;
  }>;
};

const rankingCache = new Map<string, { expira: number; valor: RankingsB3 }>();
const TTL_RANKING_MS = 30 * 60 * 1000;

const TIPO_BRAPI: Record<TipoRanking, string> = { acoes: "stock", fiis: "fund", bdrs: "bdr" };

/** Soma dos proventos pagos nos últimos 12 meses. */
function proventos12m(dividendos: Array<{ rate?: number | null; paymentDate?: string | null }>): number {
  const limite = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const agora = Date.now();
  return dividendos.reduce((soma, d) => {
    const t = d.paymentDate ? Date.parse(d.paymentDate) : NaN;
    if (!Number.isFinite(t) || t < limite || t > agora) return soma;
    return soma + (Number(d.rate) || 0);
  }, 0);
}

export async function buscarRankingsB3(tipo: TipoRanking = "acoes"): Promise<RankingsB3> {
  const emCache = rankingCache.get(tipo);
  if (emCache && emCache.expira > Date.now()) return emCache.valor;

  try {
    const lista = await getJson<BrapiLista>(
      `https://brapi.dev/api/quote/list?type=${TIPO_BRAPI[tipo]}&sortBy=market_cap_basic&sortOrder=desc&limit=80`,
      15000,
    );

    // remove fracionários (final F) e mantém apenas o papel mais líquido por empresa
    const porEmpresa = new Map<string, { ticker: string; nome: string; logo: string | null; cap: number }>();
    for (const s of lista.stocks ?? []) {
      const ticker = s.stock.toUpperCase();
      if (ticker.endsWith("F")) continue;
      const empresa = ticker.replace(/\d+$/, "");
      const cap = Number(s.market_cap) || 0;
      const atual = porEmpresa.get(empresa);
      if (!atual || cap > atual.cap) {
        porEmpresa.set(empresa, { ticker, nome: s.name || ticker, logo: s.logo ?? null, cap });
      }
    }

    const alvos = [...porEmpresa.values()].sort((a, b) => b.cap - a.cap).slice(0, 24);
    const itens: ItemRanking[] = [];

    for (let i = 0; i < alvos.length; i += 3) {
      const lote = alvos.slice(i, i + 3);
      try {
        const det = await getJson<BrapiDetalhe>(
          `https://brapi.dev/api/quote/${lote.map((a) => a.ticker).join(",")}?modules=financialData&dividends=true`,
          15000,
        );
        for (const r of det.results ?? []) {
          const base = lote.find((a) => a.ticker === r.symbol.toUpperCase());
          const preco = r.regularMarketPrice ?? null;
          const proventos = proventos12m(r.dividendsData?.cashDividends ?? []);
          itens.push({
            ticker: r.symbol.toUpperCase(),
            nome: r.longName || r.shortName || base?.nome || r.symbol,
            logo: r.logourl ?? base?.logo ?? null,
            preco,
            variacaoPercent: r.regularMarketChangePercent ?? null,
            dy: preco && preco > 0 && proventos > 0 ? (proventos / preco) * 100 : null,
            valorMercado: r.marketCap ?? base?.cap ?? null,
            receita: r.financialData?.totalRevenue ?? null,
          });
        }
      } catch {
        /* mantém o ranking com os lotes que responderam */
      }
      if (i + 3 < alvos.length) await dormir(150);
    }

    const topo = (chave: "dy" | "valorMercado" | "receita") =>
      itens
        .filter((a) => typeof a[chave] === "number" && (a[chave] as number) > 0)
        .sort((a, b) => (b[chave] as number) - (a[chave] as number))
        .slice(0, 8);

    const resultado: RankingsB3 = {
      tipo,
      dividendYield: topo("dy"),
      valorMercado: topo("valorMercado"),
      receitas: topo("receita"),
      atualizadoEm: new Date().toISOString(),
    };
    rankingCache.set(tipo, { valor: resultado, expira: Date.now() + TTL_RANKING_MS });
    return resultado;
  } catch (e) {
    if (emCache) return emCache.valor;
    throw e;
  }
}
