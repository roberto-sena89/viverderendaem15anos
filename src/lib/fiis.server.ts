/**
 * Agregador da grade completa de FIIs listados na B3.
 *
 * Fontes:
 * - brapi.dev `quote/list?type=fund` -> preço, variação do dia e volume ao vivo
 *   de todos os fundos em UMA requisição (não escala por ativo).
 * - Fundamentus (`fii_resultado.php`) -> base fundamentalista diária: razão
 *   social, segmento, P/VP, dividend yield, valor de mercado, liquidez média,
 *   vacância e cap rate.
 * - Yahoo Finance -> histórico mensal de 5 anos por ativo (variação 12m/24m/5a
 *   e DY médio de 5 anos), buscado sob demanda apenas para a página visível.
 *
 * Tudo passa por cache compartilhado (memória + `public.cotacoes_cache`) para
 * não multiplicar chamadas às fontes públicas.
 */

import {
  classificarTipo,
  normalizarSegmento,
  type HistoricoFii,
  type LinhaFii,
  type RespostaFiis,
  type ResumoIfix,
} from "@/lib/fiis-base";

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

/** Cache persistido (compartilhado entre instâncias) sobre `cotacoes_cache`. */
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

type BaseFii = {
  ticker: string;
  nome: string;
  segmentoBruto: string;
  cotacao: number | null;
  dy: number | null;
  pvp: number | null;
  valorMercado: number | null;
  liquidez: number | null;
  vacancia: number | null;
  capRate: number | null;
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

async function baixarBase(): Promise<BaseFii[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch("https://www.fundamentus.com.br/fii_resultado.php", {
      headers: NAVEGADOR,
      signal: controller.signal,
    });
    if (!res.ok) return [];
    // A página é servida em ISO-8859-1.
    const html = new TextDecoder("latin1").decode(new Uint8Array(await res.arrayBuffer()));
    const linhas: BaseFii[] = [];
    for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const bruto = tr[1];
      const ticker = bruto.match(/detalhes\.php\?papel=([A-Z0-9]+)/)?.[1];
      if (!ticker) continue;
      const nome = semTags(bruto.match(/title="([^"]*)"/)?.[1] ?? "") || ticker;
      const celulas = [...bruto.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => semTags(c[1]));
      if (celulas.length < 8) continue;
      linhas.push({
        ticker,
        nome,
        segmentoBruto: celulas[1] ?? "",
        cotacao: numeroBr(celulas[2] ?? ""),
        dy: numeroBr(celulas[4] ?? ""),
        pvp: numeroBr(celulas[5] ?? ""),
        valorMercado: numeroBr(celulas[6] ?? ""),
        liquidez: numeroBr(celulas[7] ?? ""),
        capRate: numeroBr(celulas[11] ?? ""),
        vacancia: numeroBr(celulas[12] ?? ""),
      });
    }
    return linhas;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

let baseMemoria: { valor: BaseFii[]; em: number } | null = null;
const BASE_TTL = 6 * 60 * 60_000;

async function base(): Promise<{ lista: BaseFii[]; em: string | null }> {
  if (baseMemoria && Date.now() - baseMemoria.em < BASE_TTL) {
    return { lista: baseMemoria.valor, em: new Date(baseMemoria.em).toISOString() };
  }
  const salvo = await lerBanco<BaseFii[]>("fiis:base");
  const idade = salvo ? Date.now() - Date.parse(salvo.em) : Number.POSITIVE_INFINITY;
  if (salvo && Array.isArray(salvo.valor) && salvo.valor.length && idade < BASE_TTL) {
    baseMemoria = { valor: salvo.valor, em: Date.parse(salvo.em) };
    return { lista: salvo.valor, em: salvo.em };
  }
  const nova = await baixarBase();
  if (nova.length) {
    baseMemoria = { valor: nova, em: Date.now() };
    await gravarBanco("fiis:base", nova);
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
};

async function precosAoVivo(): Promise<Map<string, PrecoVivo>> {
  const mapa = new Map<string, PrecoVivo>();
  const token = process.env.BRAPI_TOKEN;
  const params = new URLSearchParams({
    type: "fund",
    limit: "1000",
    sortBy: "volume",
    sortOrder: "desc",
  });
  if (token) params.set("token", token);
  try {
    const res = await fetch(`https://brapi.dev/api/quote/list?${params}`, { headers: NAVEGADOR });
    const data = (await res.json()) as {
      stocks?: Array<{
        stock?: string;
        close?: number | null;
        change?: number | null;
        volume?: number | null;
        logo?: string | null;
        subType?: string | null;
      }>;
    };
    for (const s of data?.stocks ?? []) {
      if (!s.stock || typeof s.close !== "number") continue;
      if (!/11B?$/.test(s.stock)) continue;
      mapa.set(s.stock.toUpperCase(), {
        preco: s.close,
        variacaoPercent: typeof s.change === "number" ? s.change : null,
        volume: typeof s.volume === "number" ? s.volume : null,
        logo: s.logo && !s.logo.includes("BRAPI.svg") ? s.logo : null,
      });
    }
  } catch {
    /* sem preços ao vivo: a grade cai para a cotação da base diária */
  }
  return mapa;
}

/* ------------------------------------------------------------------ *
 * IFIX
 * ------------------------------------------------------------------ */

async function buscarIfix(): Promise<ResumoIfix | null> {
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const res = await fetch(`https://${host}/v8/finance/chart/IFIX.SA?range=1y&interval=1d`, {
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

let gradeMemoria: { valor: RespostaFiis; em: number } | null = null;
let emAndamento: Promise<RespostaFiis> | null = null;

async function montarGrade(): Promise<RespostaFiis> {
  const [{ lista, em }, precos, ifix] = await Promise.all([base(), precosAoVivo(), buscarIfix()]);

  const vistos = new Set<string>();
  const linhas: LinhaFii[] = [];

  const adicionar = (b: BaseFii | null, ticker: string, vivo: PrecoVivo | undefined) => {
    if (vistos.has(ticker)) return;
    vistos.add(ticker);
    const nome = b?.nome ?? ticker;
    const segmento = normalizarSegmento(b?.segmentoBruto ?? "", nome);
    const tipo = classificarTipo(nome, b?.segmentoBruto ?? "");
    const preco = vivo?.preco ?? b?.cotacao ?? null;
    const pvpBase = b?.pvp && b.pvp > 0 ? b.pvp : null;
    const vpa = pvpBase && b?.cotacao ? b.cotacao / pvpBase : null;
    const patrimonio = pvpBase && b?.valorMercado ? b.valorMercado / pvpBase : null;
    const variacaoPercent = vivo?.variacaoPercent ?? null;
    const fechamentoAnterior =
      preco !== null && variacaoPercent !== null && variacaoPercent !== -100
        ? preco / (1 + variacaoPercent / 100)
        : null;
    // DY e P/VP acompanham o preço ao vivo (o provento base é o da fonte diária).
    const proventoAnual = b?.dy && b?.cotacao ? (b.dy / 100) * b.cotacao : null;
    linhas.push({
      ticker,
      nome,
      tipo,
      segmento,
      logo: vivo?.logo ?? null,
      preco,
      fechamentoAnterior,
      variacao: preco !== null && fechamentoAnterior !== null ? preco - fechamentoAnterior : null,
      variacaoPercent,
      volume: vivo?.volume ?? null,
      liquidez: b?.liquidez ?? null,
      patrimonio,
      valorMercado: b?.valorMercado ?? null,
      vpa,
      pvp: vpa && preco ? preco / vpa : pvpBase,
      dy12: proventoAnual && preco ? (proventoAnual / preco) * 100 : (b?.dy ?? null),
      vacancia: b?.vacancia ?? null,
      capRate: b?.capRate ?? null,
      precoDefasado: !vivo,
    });
  };

  for (const b of lista) adicionar(b, b.ticker, precos.get(b.ticker));
  // Fundos que a base diária ainda não cobre, mas que negociam na B3.
  for (const [ticker, vivo] of precos) adicionar(null, ticker, vivo);

  linhas.sort((a, b) => (b.liquidez ?? 0) - (a.liquidez ?? 0));

  return {
    linhas,
    ifix,
    atualizadoEm: new Date().toISOString(),
    baseEm: em,
    parcial: precos.size === 0,
  };
}

/** Grade de FIIs com stale-while-revalidate (memória + cache compartilhado). */
export async function gradeFiisComCache(forcar = false): Promise<RespostaFiis> {
  const frescor = emPregao() ? FRESCOR_PREGAO : FRESCOR_FECHADO;
  if (!forcar && gradeMemoria && Date.now() - gradeMemoria.em < frescor) return gradeMemoria.valor;

  if (!emAndamento) {
    emAndamento = montarGrade()
      .then(async (g) => {
        gradeMemoria = { valor: g, em: Date.now() };
        await gravarBanco("fiis:grade", g, g.parcial);
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
    const salvo = await lerBanco<RespostaFiis>("fiis:grade");
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
const historicoMemoria = new Map<string, { valor: HistoricoFii; em: number }>();
let filaYahoo = 0;

async function historicoYahoo(ticker: string): Promise<HistoricoFii> {
  const vazio: HistoricoFii = { ticker, dy5a: null, var12m: null, var24m: null, var60m: null };
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
              meta?: { regularMarketPrice?: number };
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

        // DY médio de 5 anos: proventos de cada ano sobre o preço no início do ano.
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

        return {
          ticker,
          dy5a: yields.length ? yields.reduce((s, v) => s + v, 0) / yields.length : null,
          var12m: varDesde(12),
          var24m: varDesde(24),
          var60m: varDesde(60),
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
export async function historicoFiis(tickers: string[]): Promise<HistoricoFii[]> {
  const unicos = [...new Set(tickers.map((t) => t.toUpperCase()))].slice(0, 100);
  const faltantes: string[] = [];
  const saida: HistoricoFii[] = [];

  for (const t of unicos) {
    const cache = historicoMemoria.get(t);
    if (cache && Date.now() - cache.em < HIST_TTL) saida.push(cache.valor);
    else faltantes.push(t);
  }

  if (faltantes.length) {
    const salvo = await lerBanco<Record<string, HistoricoFii>>("fiis:historico");
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
      await gravarBanco("fiis:historico", mapaSalvo);
    }
  }

  return saida;
}
