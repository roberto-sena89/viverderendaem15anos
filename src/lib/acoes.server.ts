/**
 * Agregador da grade completa de ações listadas na B3.
 *
 * Fontes:
 * - brapi.dev `quote/list?type=stock` -> preço, variação do dia, volume, logo,
 *   setor e subsetor de todos os papéis em UMA requisição.
 * - Fundamentus (`resultado.php`) -> base fundamentalista diária: P/L, P/VP,
 *   PSR, dividend yield, margens, ROE, ROIC, patrimônio líquido, liquidez,
 *   endividamento e crescimento de receita.
 * - Yahoo Finance -> histórico mensal de 5 anos por ativo (variações 30d/12m/5a
 *   e DY médio de 5 anos), buscado sob demanda apenas para a página visível.
 *
 * Tudo passa por cache compartilhado (memória + `public.cotacoes_cache`) para
 * não multiplicar chamadas às fontes públicas.
 */

import {
  normalizarSetor,
  pontuacaoBuyAndHold,
  precoJustoGraham,
  precoTetoBazin,
  traduzirSegmento,
  upside,
  type HistoricoAcao,
  type LinhaAcao,
  type RespostaAcoes,
  type ResumoIbov,
} from "@/lib/acoes-base";

const NAVEGADOR = {
  Accept: "text/html,application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function lerBanco<T>(chave: string): Promise<{ valor: T; em: string } | null> {
  try {
    const db = await admin();
    const { data } = await db
      .from("cotacoes_cache")
      .select("payload, atualizado_em")
      .eq("categoria", chave)
      .maybeSingle();
    if (!data?.payload) return null;
    return { valor: data.payload as unknown as T, em: data.atualizado_em };
  } catch {
    return null;
  }
}

async function gravarBanco(chave: string, valor: unknown, parcial = false) {
  try {
    const db = await admin();
    await db.from("cotacoes_cache").upsert(
      {
        categoria: chave,
        payload: JSON.parse(JSON.stringify(valor)),
        parcial,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "categoria" },
    );
  } catch {
    /* cache é best-effort */
  }
}

/* ------------------------------------------------------------------ *
 * Base fundamentalista (diária)
 * ------------------------------------------------------------------ */

type BaseAcao = {
  ticker: string;
  cotacao: number | null;
  pl: number | null;
  pvp: number | null;
  psr: number | null;
  dy: number | null;
  evEbit: number | null;
  margemEbit: number | null;
  margemLiquida: number | null;
  roic: number | null;
  roe: number | null;
  liquidez: number | null;
  patrimonio: number | null;
  dividaPatrimonio: number | null;
  crescReceita5a: number | null;
};

const numeroBr = (t: string): number | null => {
  const limpo = t.replace(/[%\s.]/g, "").replace(",", ".");
  if (!limpo || limpo === "-") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
};

const semTags = (t: string) =>
  t
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

async function baixarBase(): Promise<BaseAcao[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch("https://www.fundamentus.com.br/resultado.php", {
      headers: NAVEGADOR,
      signal: controller.signal,
    });
    if (!res.ok) return [];
    // A página é servida em ISO-8859-1.
    const html = new TextDecoder("latin1").decode(new Uint8Array(await res.arrayBuffer()));
    const linhas: BaseAcao[] = [];
    for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const bruto = tr[1];
      const ticker = bruto.match(/detalhes\.php\?papel=([A-Z0-9]+)/)?.[1];
      if (!ticker) continue;
      const c = [...bruto.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => semTags(x[1]));
      if (c.length < 20) continue;
      linhas.push({
        ticker,
        cotacao: numeroBr(c[1] ?? ""),
        pl: numeroBr(c[2] ?? ""),
        pvp: numeroBr(c[3] ?? ""),
        psr: numeroBr(c[4] ?? ""),
        dy: numeroBr(c[5] ?? ""),
        evEbit: numeroBr(c[10] ?? ""),
        margemEbit: numeroBr(c[13] ?? ""),
        margemLiquida: numeroBr(c[14] ?? ""),
        roic: numeroBr(c[16] ?? ""),
        roe: numeroBr(c[17] ?? ""),
        liquidez: numeroBr(c[18] ?? ""),
        patrimonio: numeroBr(c[19] ?? ""),
        dividaPatrimonio: numeroBr(c[20] ?? ""),
        crescReceita5a: numeroBr(c[21] ?? ""),
      });
    }
    return linhas;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

let baseMemoria: { valor: BaseAcao[]; em: number } | null = null;
const BASE_TTL = 6 * 60 * 60_000;

async function base(): Promise<{ lista: BaseAcao[]; em: string | null }> {
  if (baseMemoria && Date.now() - baseMemoria.em < BASE_TTL) {
    return { lista: baseMemoria.valor, em: new Date(baseMemoria.em).toISOString() };
  }
  const salvo = await lerBanco<BaseAcao[]>("acoes:base");
  const idade = salvo ? Date.now() - Date.parse(salvo.em) : Number.POSITIVE_INFINITY;
  if (salvo && Array.isArray(salvo.valor) && salvo.valor.length && idade < BASE_TTL) {
    baseMemoria = { valor: salvo.valor, em: Date.parse(salvo.em) };
    return { lista: salvo.valor, em: salvo.em };
  }
  const nova = await baixarBase();
  if (nova.length) {
    baseMemoria = { valor: nova, em: Date.now() };
    await gravarBanco("acoes:base", nova);
    return { lista: nova, em: new Date().toISOString() };
  }
  if (salvo?.valor?.length) {
    baseMemoria = { valor: salvo.valor, em: Date.parse(salvo.em) };
    return { lista: salvo.valor, em: salvo.em };
  }
  return { lista: [], em: null };
}

/* ------------------------------------------------------------------ *
 * Preços ao vivo (lote único na brapi)
 * ------------------------------------------------------------------ */

type PrecoVivo = {
  preco: number;
  variacaoPercent: number | null;
  volume: number | null;
  logo: string | null;
  nome: string | null;
  setor: string | null;
  subsetor: string | null;
  valorMercado: number | null;
};

/** Só papéis de renda variável negociados na B3 (exclui units de fundos). */
const TICKER_ACAO = /^[A-Z]{4}(3|4|5|6|7|8|11|31|32|33|34|35|39)$/;

async function precosAoVivo(): Promise<Map<string, PrecoVivo>> {
  const mapa = new Map<string, PrecoVivo>();
  const token = process.env.BRAPI_TOKEN;
  const params = new URLSearchParams({
    type: "stock",
    limit: "2000",
    sortBy: "volume",
    sortOrder: "desc",
  });
  if (token) params.set("token", token);
  try {
    const res = await fetch(`https://brapi.dev/api/quote/list?${params}`, { headers: NAVEGADOR });
    const data = (await res.json()) as {
      stocks?: Array<{
        stock?: string;
        name?: string | null;
        close?: number | null;
        change?: number | null;
        volume?: number | null;
        market_cap?: number | null;
        logo?: string | null;
        sector?: string | null;
        subsector?: string | null;
      }>;
    };
    for (const s of data?.stocks ?? []) {
      if (!s.stock || typeof s.close !== "number") continue;
      const ticker = s.stock.toUpperCase();
      if (!TICKER_ACAO.test(ticker)) continue;
      mapa.set(ticker, {
        preco: s.close,
        variacaoPercent: typeof s.change === "number" ? s.change : null,
        volume: typeof s.volume === "number" ? s.volume : null,
        logo: s.logo && !s.logo.includes("BRAPI.svg") ? s.logo : null,
        nome: s.name && s.name !== ticker ? s.name : null,
        setor: s.sector ?? null,
        subsetor: s.subsector ?? null,
        valorMercado: typeof s.market_cap === "number" ? s.market_cap : null,
      });
    }
  } catch {
    /* sem preços ao vivo: a grade cai para a cotação da base diária */
  }
  return mapa;
}

/* ------------------------------------------------------------------ *
 * Ibovespa
 * ------------------------------------------------------------------ */

async function buscarIbovespa(): Promise<ResumoIbov | null> {
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const res = await fetch(`https://${host}/v8/finance/chart/%5EBVSP?range=1y&interval=1d`, {
        headers: NAVEGADOR,
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        chart?: {
          result?: Array<{
            meta?: {
              regularMarketPrice?: number;
              chartPreviousClose?: number;
              previousClose?: number;
            };
            indicators?: { quote?: Array<{ close?: (number | null)[] }> };
          }>;
        };
      };
      const r = data?.chart?.result?.[0];
      const valor = r?.meta?.regularMarketPrice ?? null;
      if (typeof valor !== "number") continue;
      const serie = (r?.indicators?.quote?.[0]?.close ?? []).filter(
        (v): v is number => typeof v === "number",
      );
      const anterior = r?.meta?.chartPreviousClose ?? r?.meta?.previousClose ?? null;
      const inicio = serie[0] ?? null;
      return {
        valor,
        variacaoPercent: anterior && anterior > 0 ? ((valor - anterior) / anterior) * 100 : null,
        variacao12m: inicio && inicio > 0 ? ((valor - inicio) / inicio) * 100 : null,
        spark: serie.slice(-60),
      };
    } catch {
      /* tenta o próximo host */
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Grade completa
 * ------------------------------------------------------------------ */

const FRESCOR_PREGAO = 20_000;
const FRESCOR_FECHADO = 10 * 60_000;

function emPregao(agora = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(agora).map((x) => [x.type, x.value]));
  const dia = String(p.weekday ?? "");
  const hora = Number(p.hour ?? "0");
  if (dia === "Sat" || dia === "Sun") return false;
  return hora >= 10 && hora < 18;
}

let gradeMemoria: { valor: RespostaAcoes; em: number } | null = null;
let emAndamento: Promise<RespostaAcoes> | null = null;

function montarLinha(b: BaseAcao | null, ticker: string, vivo: PrecoVivo | undefined): LinhaAcao {
  const preco = vivo?.preco ?? b?.cotacao ?? null;
  const variacaoPercent = vivo?.variacaoPercent ?? null;
  const fechamentoAnterior =
    preco !== null && variacaoPercent !== null && variacaoPercent !== -100
      ? preco / (1 + variacaoPercent / 100)
      : null;

  const pl = b?.pl && b.pl !== 0 ? b.pl : null;
  const pvp = b?.pvp && b.pvp > 0 ? b.pvp : null;
  const psr = b?.psr && b.psr > 0 ? b.psr : null;

  // Indicadores da base são calculados sobre a cotação daquele dia; ajustamos
  // ao preço ao vivo para que P/L, P/VP e DY acompanhem o pregão.
  const ajuste = preco && b?.cotacao && b.cotacao > 0 ? preco / b.cotacao : 1;
  const plVivo = pl ? pl * ajuste : null;
  const pvpVivo = pvp ? pvp * ajuste : null;
  const psrVivo = psr ? psr * ajuste : null;
  const dyVivo = b?.dy && ajuste > 0 ? b.dy / ajuste : null;

  const lpa = preco && plVivo && plVivo > 0 ? preco / plVivo : null;
  const vpa = preco && pvpVivo && pvpVivo > 0 ? preco / pvpVivo : null;

  const valorMercado =
    vivo?.valorMercado ?? (b?.patrimonio && pvpVivo ? b.patrimonio * pvpVivo : null);
  const lucro = valorMercado && plVivo && plVivo !== 0 ? valorMercado / plVivo : null;
  const receita = valorMercado && psrVivo && psrVivo > 0 ? valorMercado / psrVivo : null;

  const teto = precoTetoBazin(preco, dyVivo);
  const justo = precoJustoGraham(lpa, vpa);

  return {
    ticker,
    nome: vivo?.nome ?? ticker,
    logo: vivo?.logo ?? null,
    setor: normalizarSetor(vivo?.setor),
    subsetor: vivo?.subsetor ?? null,
    segmento: traduzirSegmento(vivo?.setor),

    preco,
    fechamentoAnterior,
    variacao: preco !== null && fechamentoAnterior !== null ? preco - fechamentoAnterior : null,
    variacaoPercent,
    volume: vivo?.volume ?? null,

    valorMercado,
    pl: plVivo,
    pvp: pvpVivo,
    psr: psrVivo,
    evEbit: b?.evEbit ?? null,

    dy12: dyVivo,
    roe: b?.roe ?? null,
    roic: b?.roic ?? null,
    margemLiquida: b?.margemLiquida ?? null,
    margemEbit: b?.margemEbit ?? null,

    patrimonio: b?.patrimonio ?? null,
    lucro,
    receita,
    liquidez: b?.liquidez ?? null,
    dividaPatrimonio: b?.dividaPatrimonio ?? null,
    crescReceita5a: b?.crescReceita5a ?? null,

    lpa,
    vpa,
    precoTetoBazin: teto,
    upsideBazin: upside(preco, teto),
    precoJustoGraham: justo,
    upsideGraham: upside(preco, justo),
    pontuacao: pontuacaoBuyAndHold({
      dy: dyVivo,
      roe: b?.roe ?? null,
      margemLiquida: b?.margemLiquida ?? null,
      dividaPatrimonio: b?.dividaPatrimonio ?? null,
      crescReceita5a: b?.crescReceita5a ?? null,
      pl: plVivo,
      pvp: pvpVivo,
      liquidez: b?.liquidez ?? null,
    }),
    precoDefasado: !vivo,
  };
}

async function montarGrade(): Promise<RespostaAcoes> {
  const [{ lista, em }, precos, ibovespa] = await Promise.all([
    base(),
    precosAoVivo(),
    buscarIbovespa(),
  ]);

  const vistos = new Set<string>();
  const linhas: LinhaAcao[] = [];

  for (const b of lista) {
    if (!TICKER_ACAO.test(b.ticker) || vistos.has(b.ticker)) continue;
    vistos.add(b.ticker);
    linhas.push(montarLinha(b, b.ticker, precos.get(b.ticker)));
  }
  // Papéis que a base diária ainda não cobre, mas que negociam na B3.
  for (const [ticker, vivo] of precos) {
    if (vistos.has(ticker)) continue;
    vistos.add(ticker);
    linhas.push(montarLinha(null, ticker, vivo));
  }

  linhas.sort((a, b) => (b.valorMercado ?? 0) - (a.valorMercado ?? 0));

  return {
    linhas,
    ibovespa,
    atualizadoEm: new Date().toISOString(),
    baseEm: em,
    parcial: precos.size === 0,
  };
}

/** Grade de ações com stale-while-revalidate (memória + cache compartilhado). */
export async function gradeAcoesComCache(forcar = false): Promise<RespostaAcoes> {
  const frescor = emPregao() ? FRESCOR_PREGAO : FRESCOR_FECHADO;
  if (!forcar && gradeMemoria && Date.now() - gradeMemoria.em < frescor) return gradeMemoria.valor;

  if (!emAndamento) {
    emAndamento = montarGrade()
      .then(async (g) => {
        gradeMemoria = { valor: g, em: Date.now() };
        await gravarBanco("acoes:grade", g, g.parcial);
        return g;
      })
      .finally(() => {
        emAndamento = null;
      });
  }

  // SWR real: responde com o último valor conhecido — mesmo desatualizado —
  // e atualiza em segundo plano. Só espera a montagem quando não há nada salvo.
  if (gradeMemoria?.valor?.linhas?.length) {
    void emAndamento.catch(() => undefined);
    if (!forcar) return gradeMemoria.valor;
  } else {
    const salvo = await lerBanco<RespostaAcoes>("acoes:grade");
    if (salvo?.valor?.linhas?.length) {
      gradeMemoria = { valor: salvo.valor, em: Date.parse(salvo.em) };
      void emAndamento.catch(() => undefined);
      if (!forcar) return salvo.valor;
    }
  }
  return emAndamento;
}

/* ------------------------------------------------------------------ *
 * Histórico por ativo (sob demanda, apenas da página visível)
 * ------------------------------------------------------------------ */

const HIST_TTL = 12 * 60 * 60_000;
const historicoMemoria = new Map<string, { valor: HistoricoAcao; em: number }>();
let filaYahoo = 0;

async function historicoYahoo(ticker: string): Promise<HistoricoAcao> {
  const vazio: HistoricoAcao = {
    ticker,
    dy5a: null,
    var30d: null,
    var12m: null,
    var60m: null,
    crescLucro5a: null,
  };
  while (filaYahoo >= 2) await dormir(120);
  filaYahoo++;
  try {
    for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
      try {
        const res = await fetch(
          `https://${host}/v8/finance/chart/${ticker}.SA?range=5y&interval=1mo&events=div`,
          { headers: NAVEGADOR },
        );
        if (!res.ok) continue;
        const data = (await res.json()) as {
          chart?: {
            result?: Array<{
              meta?: { regularMarketPrice?: number; chartPreviousClose?: number };
              timestamp?: number[];
              events?: { dividends?: Record<string, { amount?: number; date?: number }> };
              indicators?: { quote?: Array<{ close?: (number | null)[] }> };
            }>;
          };
        };
        const r = data?.chart?.result?.[0];
        const atual = r?.meta?.regularMarketPrice ?? null;
        const fechamentos = r?.indicators?.quote?.[0]?.close ?? [];
        const tempos = r?.timestamp ?? [];
        if (typeof atual !== "number" || !fechamentos.length) continue;

        const varDesde = (meses: number) => {
          const idx = fechamentos.length - 1 - meses;
          const anterior = idx >= 0 ? fechamentos[idx] : fechamentos[0];
          return typeof anterior === "number" && anterior > 0
            ? ((atual - anterior) / anterior) * 100
            : null;
        };

        const divs = Object.values(r?.events?.dividends ?? {})
          .map((d) => ({ valor: Number(d.amount ?? 0), data: Number(d.date ?? 0) * 1000 }))
          .filter((d) => d.valor > 0 && d.data > 0);

        const agora = Date.now();
        const ano = 365.25 * 24 * 3600_000;
        const yields: number[] = [];
        for (let i = 0; i < 5; i++) {
          const fim = agora - i * ano;
          const inicio = fim - ano;
          const soma = divs
            .filter((d) => d.data > inicio && d.data <= fim)
            .reduce((s, d) => s + d.valor, 0);
          if (soma <= 0) continue;
          let referencia: number | null = null;
          for (let k = tempos.length - 1; k >= 0; k--) {
            if (tempos[k] * 1000 <= inicio && typeof fechamentos[k] === "number") {
              referencia = fechamentos[k];
              break;
            }
          }
          const preco = referencia ?? atual;
          if (preco > 0) yields.push((soma / preco) * 100);
        }

        // Variação de 30 dias: usa o último ponto mensal disponível.
        const penultimo = fechamentos[fechamentos.length - 2];
        const var30d =
          typeof penultimo === "number" && penultimo > 0
            ? ((atual - penultimo) / penultimo) * 100
            : null;

        return {
          ticker,
          dy5a: yields.length ? yields.reduce((s, v) => s + v, 0) / yields.length : null,
          var30d,
          var12m: varDesde(12),
          var60m: varDesde(60),
          crescLucro5a: null,
        };
      } catch {
        /* tenta o próximo host */
      }
    }
    return vazio;
  } finally {
    await dormir(120);
    filaYahoo--;
  }
}

/** Indicadores históricos dos tickers pedidos, com cache de 12h. */
export async function historicoAcoes(tickers: string[]): Promise<HistoricoAcao[]> {
  const unicos = [...new Set(tickers.map((t) => t.toUpperCase()))].slice(0, 100);
  const faltantes: string[] = [];
  const saida: HistoricoAcao[] = [];

  for (const t of unicos) {
    const cache = historicoMemoria.get(t);
    if (cache && Date.now() - cache.em < HIST_TTL) saida.push(cache.valor);
    else faltantes.push(t);
  }

  if (faltantes.length) {
    const salvo = await lerBanco<Record<string, HistoricoAcao>>("acoes:historico");
    const mapaSalvo = salvo?.valor ?? {};
    const idade = salvo ? Date.now() - Date.parse(salvo.em) : Number.POSITIVE_INFINITY;
    const pendentes: string[] = [];
    for (const t of faltantes) {
      if (idade < HIST_TTL && mapaSalvo[t]) {
        historicoMemoria.set(t, { valor: mapaSalvo[t], em: Date.now() });
        saida.push(mapaSalvo[t]);
      } else {
        pendentes.push(t);
      }
    }
    if (pendentes.length) {
      const novos = await Promise.all(pendentes.map((t) => historicoYahoo(t)));
      for (const h of novos) {
        historicoMemoria.set(h.ticker, { valor: h, em: Date.now() });
        mapaSalvo[h.ticker] = h;
        saida.push(h);
      }
      await gravarBanco("acoes:historico", mapaSalvo);
    }
  }

  return saida;
}
