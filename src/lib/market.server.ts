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
      headers: comUA
        ? { "User-Agent": UA, Accept: "application/json" }
        : { Accept: "application/json" },
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
  DÓLAR: "BRL=X",
  EURO: "EURBRL=X",
  BITCOIN: "BTC-USD",
  OURO: "GC=F",
  PETROLEO: "BZ=F",
  PETRÓLEO: "BZ=F",
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
      indicators: {
        quote?: Array<{ close?: (number | null)[] }>;
        adjclose?: Array<{ adjclose?: (number | null)[] }>;
      };
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

/**
 * brapi.dev — cotações da B3 (ações, FIIs, ETFs e índices). Usada como fonte
 * alternativa quando o Yahoo limita as consultas. O token é opcional
 * (plano gratuito); quando configurado em BRAPI_TOKEN é enviado na chamada.
 */
export async function cotacaoBrapi(simboloEntrada: string): Promise<Cotacao | null> {
  const simbolo = simboloEntrada.trim().toUpperCase().replace(/\.SA$/, "");
  if (!/^[A-Z0-9]{4,8}$/.test(simbolo)) return null;
  const token = process.env.BRAPI_TOKEN;
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(simbolo)}${token ? `?token=${token}` : ""}`;
  try {
    const json = await getJson<{
      results?: Array<{
        symbol?: string;
        longName?: string;
        shortName?: string;
        currency?: string;
        regularMarketPrice?: number;
        regularMarketPreviousClose?: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        regularMarketTime?: string;
      }>;
    }>(url, 15000);
    const r = json.results?.[0];
    if (!r?.regularMarketPrice) return null;
    return {
      simbolo: r.symbol ?? simbolo,
      nome: r.longName ?? r.shortName ?? simbolo,
      moeda: r.currency ?? "BRL",
      preco: r.regularMarketPrice,
      fechamentoAnterior: r.regularMarketPreviousClose ?? null,
      variacaoDia: r.regularMarketChange ?? null,
      variacaoDiaPercent: r.regularMarketChangePercent ?? null,
      maxima52s: r.fiftyTwoWeekHigh ?? null,
      minima52s: r.fiftyTwoWeekLow ?? null,
      bolsa: "B3",
      atualizadoEm: r.regularMarketTime ?? null,
    };
  } catch {
    return null;
  }
}

export async function buscarCotacao(simboloEntrada: string): Promise<Cotacao> {
  // Títulos públicos: preço oficial do Tesouro Transparente (CSV diário),
  // nunca Yahoo/brapi — evita cotação errada ou corrompida para Tesouro.
  const { ehTituloTesouro, casarTitulo, listarTesouroDireto } =
    await import("@/lib/tesouro.server");
  if (ehTituloTesouro(simboloEntrada)) {
    const titulo = casarTitulo(simboloEntrada, await listarTesouroDireto());
    const preco = titulo?.precoCompra ?? titulo?.precoVenda ?? null;
    if (preco && preco > 0) {
      return {
        simbolo: simboloEntrada.trim().toUpperCase(),
        nome: titulo?.nome ?? "Tesouro Direto",
        moeda: "BRL",
        preco,
        fechamentoAnterior: null,
        variacaoDia: null,
        variacaoDiaPercent: null,
        maxima52s: null,
        minima52s: null,
        bolsa: "Tesouro Direto",
        atualizadoEm: null,
      };
    }
    throw new Error(`Não encontrei o título "${simboloEntrada}" na fonte oficial do Tesouro.`);
  }

  const simbolo = normalizarSimbolo(INDICES[simboloEntrada.trim().toUpperCase()] ?? simboloEntrada);
  let data: ChartResponse;
  try {
    data = await getJson<ChartResponse>(
      `${YAHOO}/v8/finance/chart/${encodeURIComponent(simbolo)}?range=5d&interval=1d`,
    );
  } catch (err) {
    const alternativa = await cotacaoBrapi(simbolo);
    if (alternativa) return alternativa;
    throw err;
  }

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
  // Títulos públicos: série oficial do Tesouro Transparente (diária, ~18 meses).
  const { ehTituloTesouro, casarTitulo, listarTesouroDireto } =
    await import("@/lib/tesouro.server");
  if (ehTituloTesouro(simboloEntrada)) {
    const titulo = casarTitulo(simboloEntrada, await listarTesouroDireto());
    const serie = (titulo?.serie ?? []).map((p) => ({ data: p.data, fechamento: p.preco }));
    if (serie.length === 0) throw new Error(`Sem histórico disponível para "${simboloEntrada}".`);
    return {
      simbolo: simboloEntrada.trim().toUpperCase(),
      nome: titulo?.nome ?? "Tesouro Direto",
      moeda: "BRL",
      periodo,
      intervalo,
      serie,
      resumo: resumoDaSerie(serie, intervalo),
    };
  }

  const simbolo = normalizarSimbolo(INDICES[simboloEntrada.trim().toUpperCase()] ?? simboloEntrada);
  const data = await getJson<ChartResponse>(
    `${YAHOO}/v8/finance/chart/${encodeURIComponent(simbolo)}?range=${periodo}&interval=${intervalo}&events=div%2Csplit`,
    20000,
  );
  const r = data.chart.result?.[0];
  if (!r?.timestamp) throw new Error(`Sem histórico disponível para "${simboloEntrada}".`);

  const closes = r.indicators.adjclose?.[0]?.adjclose ?? r.indicators.quote?.[0]?.close ?? [];
  const serie = r.timestamp
    .map((t, i) => ({
      data: new Date(t * 1000).toISOString().slice(0, 10),
      fechamento: closes[i] ?? null,
    }))
    .filter((p): p is { data: string; fechamento: number } => typeof p.fechamento === "number");

  return {
    simbolo: r.meta.symbol,
    nome: r.meta.longName ?? r.meta.shortName ?? r.meta.symbol,
    moeda: r.meta.currency ?? "BRL",
    periodo,
    intervalo,
    serie,
    resumo: resumoDaSerie(serie, intervalo),
  };
}

/** Métricas de uma série de fechamentos (retornos, drawdown, volatilidade, ano a ano). */
function resumoDaSerie(
  serie: { data: string; fechamento: number }[],
  intervalo: "1d" | "1wk" | "1mo",
): Historico["resumo"] {
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
  const variancia =
    retornos.length > 1
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
    primeiroPreco: primeiro,
    ultimoPreco: ultimo,
    retornoTotalPercent: primeiro && ultimo ? ((ultimo - primeiro) / primeiro) * 100 : null,
    retornoAnualizadoPercent:
      primeiro && ultimo && anosDecorridos > 0.5
        ? ((ultimo / primeiro) ** (1 / anosDecorridos) - 1) * 100
        : null,
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
  };
}

type SearchResponse = {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    quoteType?: string;
  }>;
};

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

export async function buscarIndicador(indicador: keyof typeof SGS, ultimos = 12) {
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

type PontoSgs = { data: string; valor: string };

/** Séries do SGS por intervalo de datas (o endpoint "ultimos/N" limita em 240 pontos). */
async function serieSgs(codigo: number, mesesAtras: number): Promise<PontoSgs[]> {
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setMonth(inicio.getMonth() - mesesAtras);
  const br = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const dados = await getJson<PontoSgs[]>(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${br(inicio)}&dataFinal=${br(fim)}`,
  );
  return Array.isArray(dados) ? dados : [];
}

/**
 * Retorno acumulado do CDI nos últimos 12 meses (%). Compõe as taxas diárias
 * (SGS 12) dos últimos ~252 dias úteis — o benchmark natural da renda fixa.
 */
export async function cdiAcumulado12m(): Promise<number | null> {
  const pontos = await serieSgs(12, 14);
  const diarias = pontos.map((p) => Number(p.valor)).filter((v) => Number.isFinite(v) && v > 0);
  if (diarias.length < 200) return null;
  const janela = diarias.slice(-252);
  return (janela.reduce((acc, v) => acc * (1 + v / 100), 1) - 1) * 100;
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
    inflação: "IPCA",
    pib: "PIB Total",
    cambio: "Câmbio",
    câmbio: "Câmbio",
    dolar: "Câmbio",
    dólar: "Câmbio",
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
    dividendsData?: {
      cashDividends?: Array<{ rate?: number | null; paymentDate?: string | null }>;
    } | null;
  }>;
};

type Fundamento = {
  nome: string | null;
  preco: number | null;
  variacaoPercent: number | null;
  dy: number | null;
  valorMercado: number | null;
  receita: number | null;
};

const fundamentos = new Map<string, { expira: number; valor: Fundamento }>();
const TTL_FUNDAMENTOS_MS = 24 * 60 * 60 * 1000;
const LOTES_POR_CHAMADA = 10;

const TIPO_BRAPI: Record<TipoRanking, string> = { acoes: "stock", fiis: "fund", bdrs: "bdr" };

/** Soma dos proventos pagos nos últimos 12 meses. */
function proventos12m(
  dividendos: Array<{ rate?: number | null; paymentDate?: string | null }>,
): number {
  const limite = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const agora = Date.now();
  return dividendos.reduce((soma, d) => {
    const t = d.paymentDate ? Date.parse(d.paymentDate) : NaN;
    if (!Number.isFinite(t) || t < limite || t > agora) return soma;
    return soma + (Number(d.rate) || 0);
  }, 0);
}

/* ------------------------------------------------------------------
 * Indicadores agregados (Fundamentus): uma única consulta devolve DY,
 * PSR/FFO e liquidez de praticamente todos os papéis da B3, o que permite
 * montar rankings completos sem esbarrar no limite das APIs de cotação.
 * ------------------------------------------------------------------ */

const cacheTexto = new Map<string, { expira: number; valor: string }>();
const TTL_TABELA_MS = 6 * 60 * 60 * 1000;

async function getTexto(url: string, timeoutMs = 20000): Promise<string> {
  const emCache = cacheTexto.get(url);
  if (emCache && emCache.expira > Date.now()) return emCache.valor;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Fonte respondeu ${res.status} em ${new URL(url).host}`);
    const texto = new TextDecoder("iso-8859-1").decode(await res.arrayBuffer());
    cacheTexto.set(url, { valor: texto, expira: Date.now() + TTL_TABELA_MS });
    return texto;
  } finally {
    clearTimeout(timer);
  }
}

/** Converte números no formato pt-BR ("1.234,56" ou "7,33%") em number. */
function numeroBR(texto: string): number | null {
  const limpo = texto.replace(/[.%\s]/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

function linhasTabela(html: string): string[][] {
  const corpo = html.split("<tbody>")[1];
  if (!corpo) return [];
  return corpo
    .split(/<tr[^>]*>/)
    .slice(1)
    .map((linha) =>
      [...linha.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
        m[1].replace(/<[^>]+>/g, "").trim(),
      ),
    )
    .filter((c) => c.length > 3);
}

type IndicadorPapel = {
  dy: number | null;
  psr?: number | null;
  receita: number | null;
  liquidez: number;
};

/** Ações: DY e receita 12m (valor de mercado ÷ PSR) de toda a bolsa. */
async function indicadoresAcoes(): Promise<Map<string, IndicadorPapel>> {
  const html = await getTexto("https://www.fundamentus.com.br/resultado.php");
  const mapa = new Map<string, IndicadorPapel>();
  for (const c of linhasTabela(html)) {
    const ticker = c[0]?.toUpperCase();
    if (!ticker) continue;
    const psr = numeroBR(c[4] ?? "");
    const dy = numeroBR(c[5] ?? "");
    const liquidez = numeroBR(c[18] ?? "") ?? 0;
    // PSR = valor de mercado / receita 12m → receita = valor de mercado / PSR
    mapa.set(ticker, {
      dy: dy && dy > 0 ? dy : null,
      psr: psr && psr > 0 ? psr : null,
      receita: null,
      liquidez,
    });
  }
  return mapa;
}

/** FIIs: DY, valor de mercado e receita operacional aproximada (FFO). */
async function indicadoresFiis(): Promise<
  Map<string, IndicadorPapel & { valorMercado: number | null }>
> {
  const html = await getTexto("https://www.fundamentus.com.br/fii_resultado.php");
  const mapa = new Map<string, IndicadorPapel & { valorMercado: number | null }>();
  for (const c of linhasTabela(html)) {
    const ticker = c[0]?.toUpperCase();
    if (!ticker) continue;
    const ffoYield = numeroBR(c[3] ?? "");
    const dy = numeroBR(c[4] ?? "");
    const valorMercado = numeroBR(c[6] ?? "");
    const liquidez = numeroBR(c[7] ?? "") ?? 0;
    mapa.set(ticker, {
      dy: dy && dy > 0 ? dy : null,
      valorMercado: valorMercado && valorMercado > 0 ? valorMercado : null,
      receita: ffoYield && valorMercado ? (ffoYield / 100) * valorMercado : null,
      liquidez,
    });
  }
  return mapa;
}

const TOPO = 50;

export async function buscarRankingsB3(tipo: TipoRanking = "acoes"): Promise<RankingsB3> {
  const lista = await getJson<BrapiLista>(
    `https://brapi.dev/api/quote/list?type=${TIPO_BRAPI[tipo]}&sortBy=market_cap_basic&sortOrder=desc&limit=500`,
    20000,
  );

  // remove fracionários (final F) e mantém apenas o papel mais líquido por empresa
  const porEmpresa = new Map<string, ItemRanking>();
  for (const s of lista.stocks ?? []) {
    const ticker = s.stock.toUpperCase();
    if (ticker.endsWith("F") && tipo !== "fiis") continue;
    const empresa = tipo === "fiis" ? ticker : ticker.replace(/\d+$/, "");
    const cap = Number(s.market_cap) || 0;
    const atual = porEmpresa.get(empresa);
    if (atual && (atual.valorMercado ?? 0) >= cap) continue;
    porEmpresa.set(empresa, {
      ticker,
      nome: s.name || ticker,
      logo: s.logo ?? null,
      preco: s.close ?? null,
      variacaoPercent: s.change ?? null,
      dy: null,
      valorMercado: cap || null,
      receita: null,
    });
  }

  let itens = [...porEmpresa.values()];

  if (tipo === "acoes") {
    try {
      const ind = await indicadoresAcoes();
      itens = itens.map((a) => {
        const f = ind.get(a.ticker);
        if (!f) return a;
        return {
          ...a,
          dy: f.dy,
          receita: a.valorMercado && f.psr ? a.valorMercado / f.psr : null,
        };
      });
    } catch {
      // fonte de indicadores indisponível: mantém apenas valor de mercado
    }
  } else if (tipo === "fiis") {
    try {
      const ind = await indicadoresFiis();
      itens = itens.map((a) => {
        const f = ind.get(a.ticker);
        if (!f) return a;
        return {
          ...a,
          dy: f.dy,
          valorMercado: a.valorMercado ?? f.valorMercado,
          receita: f.receita,
        };
      });
      // completa com FIIs que não vieram na lista de cotações
      const conhecidos = new Set(itens.map((a) => a.ticker));
      for (const [ticker, f] of ind) {
        if (conhecidos.has(ticker)) continue;
        itens.push({
          ticker,
          nome: ticker,
          logo: null,
          preco: null,
          variacaoPercent: null,
          dy: f.dy,
          valorMercado: f.valorMercado,
          receita: f.receita,
        });
      }
    } catch {
      // fonte de indicadores indisponível
    }
  } else {
    // BDRs não têm tabela agregada: preenche fundamentos aos poucos (cache 24h)
    const base = itens.sort((a, b) => (b.valorMercado ?? 0) - (a.valorMercado ?? 0)).slice(0, 80);
    const pendentes = base.filter(
      (a) => !fundamentos.has(a.ticker) || fundamentos.get(a.ticker)!.expira < Date.now(),
    );
    for (let i = 0; i < pendentes.length && i < LOTES_POR_CHAMADA * 3; i += 3) {
      const lote = pendentes.slice(i, i + 3);
      try {
        const det = await getJson<BrapiDetalhe>(
          `https://brapi.dev/api/quote/${lote.map((a) => a.ticker).join(",")}?modules=financialData&dividends=true`,
          15000,
        );
        if (!det.results?.length) break;
        for (const r of det.results) {
          const preco = r.regularMarketPrice ?? null;
          const proventos = proventos12m(r.dividendsData?.cashDividends ?? []);
          fundamentos.set(r.symbol.toUpperCase(), {
            expira: Date.now() + TTL_FUNDAMENTOS_MS,
            valor: {
              nome: r.longName || r.shortName || null,
              preco,
              variacaoPercent: r.regularMarketChangePercent ?? null,
              dy: preco && preco > 0 && proventos > 0 ? (proventos / preco) * 100 : null,
              valorMercado: r.marketCap ?? null,
              receita: r.financialData?.totalRevenue ?? null,
            },
          });
        }
      } catch {
        break; // provável limite da fonte: usa o que já está em cache
      }
      await dormir(200);
    }
    itens = base.map((a) => {
      const f = fundamentos.get(a.ticker)?.valor;
      if (!f) return a;
      return {
        ...a,
        nome: f.nome ?? a.nome,
        preco: f.preco ?? a.preco,
        variacaoPercent: f.variacaoPercent ?? a.variacaoPercent,
        dy: f.dy,
        valorMercado: f.valorMercado ?? a.valorMercado,
        receita: f.receita,
      };
    });
  }

  const topo = (chave: "dy" | "valorMercado" | "receita") =>
    itens
      .filter((a) => typeof a[chave] === "number" && a[chave] > 0)
      .sort((a, b) => (b[chave] as number) - (a[chave] as number))
      .slice(0, TOPO);

  return {
    tipo,
    dividendYield: topo("dy"),
    valorMercado: topo("valorMercado"),
    receitas: topo("receita"),
    atualizadoEm: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------
 * Panorama do mercado: índice Ibovespa com série por período e as
 * maiores altas / maiores baixas do pregão.
 * ------------------------------------------------------------------ */

export type PeriodoPanorama = "1D" | "7D" | "30D" | "6M" | "1A" | "5A";

export type ItemVariacao = {
  ticker: string;
  nome: string;
  logo: string | null;
  preco: number | null;
  variacaoPercent: number;
};

export type PanoramaMercado = {
  periodo: PeriodoPanorama;
  indice: {
    nome: string;
    pontos: number | null;
    variacaoPercent: number | null;
    fechamentoAnterior: number | null;
    abertura: number | null;
  };
  serie: { rotulo: string; valor: number }[];
  altas: ItemVariacao[];
  baixas: ItemVariacao[];
  atualizadoEm: string;
};

const FAIXAS: Record<PeriodoPanorama, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "7D": { range: "7d", interval: "30m" },
  "30D": { range: "1mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  "1A": { range: "1y", interval: "1wk" },
  "5A": { range: "5y", interval: "1mo" },
};

/** Cache em memória do panorama: evita repetir chamadas quando vários
 *  clientes atualizam a cada 30s. Janela curta no pregão, longa fora dele. */
const cachePanorama = new Map<string, { em: number; dados: PanoramaMercado }>();
const emPregaoBR = () => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  const dia = String(p.weekday ?? "").toLowerCase();
  const hora = Number(p.hour ?? 0);
  return (
    !(dia.startsWith("sáb") || dia.startsWith("sab") || dia.startsWith("dom")) &&
    hora >= 9 &&
    hora < 18
  );
};

export async function buscarPanoramaMercado(
  periodo: PeriodoPanorama = "1D",
): Promise<PanoramaMercado> {
  const ttl = emPregaoBR() ? 25_000 : 10 * 60_000;
  const cacheado = cachePanorama.get(periodo);
  if (cacheado && Date.now() - cacheado.em < ttl) return cacheado.dados;

  const faixa = FAIXAS[periodo] ?? FAIXAS["1D"];

  const indicePromise = getJson<ChartResponse>(
    `${YAHOO}/v8/finance/chart/%5EBVSP?range=${faixa.range}&interval=${faixa.interval}`,
    20000,
  ).catch(() => null);

  const listaPromise = getJson<BrapiLista>(
    "https://brapi.dev/api/quote/list?type=stock&sortBy=volume&sortOrder=desc&limit=150",
    20000,
  ).catch(() => null);

  const [dadosIndice, lista] = await Promise.all([indicePromise, listaPromise]);

  const r = dadosIndice?.chart.result?.[0];
  const closes = r?.indicators.quote?.[0]?.close ?? r?.indicators.adjclose?.[0]?.adjclose ?? [];
  const pontos: { rotulo: string; valor: number }[] = [];
  (r?.timestamp ?? []).forEach((t, i) => {
    const v = closes[i];
    if (typeof v !== "number") return;
    const d = new Date(t * 1000);
    const rotulo =
      periodo === "1D"
        ? d.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          })
        : d.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            timeZone: "America/Sao_Paulo",
          });
    pontos.push({ rotulo, valor: v });
  });

  const preco = r?.meta.regularMarketPrice ?? pontos[pontos.length - 1]?.valor ?? null;
  const anterior = r?.meta.previousClose ?? r?.meta.chartPreviousClose ?? null;
  const abertura = pontos[0]?.valor ?? null;

  const candidatos = (lista?.stocks ?? [])
    .filter((s) => {
      const t = s.stock?.toUpperCase() ?? "";
      return (
        /^[A-Z]{4}(3|4|5|6|11)$/.test(t) &&
        typeof s.change === "number" &&
        typeof s.close === "number"
      );
    })
    .map<ItemVariacao>((s) => ({
      ticker: s.stock.toUpperCase(),
      nome: s.name || s.stock,
      logo: s.logo ?? null,
      preco: s.close ?? null,
      variacaoPercent: Number(s.change),
    }));

  const ordenados = [...candidatos].sort((a, b) => b.variacaoPercent - a.variacaoPercent);

  const resultado: PanoramaMercado = {
    periodo,
    indice: {
      nome: "Ibovespa",
      pontos: preco,
      variacaoPercent: preco !== null && anterior ? ((preco - anterior) / anterior) * 100 : null,
      fechamentoAnterior: anterior,
      abertura,
    },
    serie: pontos,
    altas: ordenados.filter((a) => a.variacaoPercent > 0).slice(0, 6),
    baixas: ordenados
      .filter((a) => a.variacaoPercent < 0)
      .sort((a, b) => a.variacaoPercent - b.variacaoPercent)
      .slice(0, 6),
    atualizadoEm: new Date().toISOString(),
  };

  // Só guarda respostas úteis: falha total das fontes não deve virar cache.
  if (preco !== null || ordenados.length > 0)
    cachePanorama.set(periodo, { em: Date.now(), dados: resultado });
  return resultado;
}
