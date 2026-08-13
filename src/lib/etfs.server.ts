/**
 * Agregador da grade completa de ETFs (B3 + internacionais).
 *
 * Fontes:
 * - brapi.dev `quote/list` -> preço, variação do dia e volume ao vivo de todos
 *   os ETFs da B3 em UMA requisição.
 * - Base diária pública (tabela de ETFs) -> nome do fundo, capitalização,
 *   dividend yield 12m e médio de 5 anos, número de cotistas e variações
 *   30d / 12m / 24m / 5 anos.
 * - Yahoo Finance -> preço dos ETFs internacionais, sob demanda e em lote,
 *   somente para as linhas visíveis.
 *
 * Tudo passa por cache compartilhado (memória + `public.cotacoes_cache`).
 */

import {
  classificarEtf,
  gestoraDoNome,
  type LinhaEtf,
  type MercadoEtf,
  type RespostaEtfs,
  type ResumoIbovEtf,
} from "@/lib/etfs-base";

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
 * Base diária (indicadores)
 * ------------------------------------------------------------------ */

type BaseEtf = {
  ticker: string;
  nome: string;
  mercado: MercadoEtf;
  pais: string | null;
  cotacao: number | null;
  capitalizacao: number | null;
  dy12: number | null;
  dy5a: number | null;
  cotistas: number | null;
  var30d: number | null;
  var12m: number | null;
  var24m: number | null;
  var60m: number | null;
};

const semTags = (t: string) =>
  t
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** "R$ 425,13" / "6,90%" -> número. */
function numeroBr(texto: string): number | null {
  const limpo = texto
    .replace(/R\$|US\$|%|\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!limpo || limpo === "-") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** "6,34 B" / "980,30 M" / "1,2 T" -> valor absoluto. */
function magnitude(texto: string): number | null {
  const m = texto.trim().match(/^(-?[\d.,]+)\s*([KMBT])?$/i);
  if (!m) return null;
  const base = numeroBr(m[1]);
  if (base === null) return null;
  const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
  return base * (m[2] ? (mult[m[2].toUpperCase()] ?? 1) : 1);
}

function inteiro(texto: string): number | null {
  const limpo = texto.replace(/[^\d]/g, "");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const FONTE_NACIONAL = "https://investidor10.com.br/etfs";
const FONTE_GLOBAL = "https://investidor10.com.br/etfs-global";

async function baixarPagina(url: string, mercado: MercadoEtf): Promise<BaseEtf[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, { headers: NAVEGADOR, signal: controller.signal });
    if (!res.ok) return [];
    const html = await res.text();
    const ini = html.indexOf("<tbody");
    const fim = html.indexOf("</tbody>");
    if (ini < 0 || fim < 0) return [];
    const corpo = html.slice(ini, fim);

    const linhas: BaseEtf[] = [];
    for (const tr of corpo.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const bruto = tr[1];
      const ticker = (bruto.match(/etfs(?:-global)?\/([a-z0-9.-]+)\//i)?.[1] ?? "").toUpperCase();
      if (!ticker) continue;
      const nome = semTags(bruto.match(/title="([^"]+)"/)?.[1] ?? "") || ticker;
      const pais = bruto.match(/flags\/([A-Z]{2,3})\.svg/)?.[1] ?? null;

      const celulas = new Map<string, string>();
      for (const td of bruto.matchAll(/<td[^>]*data-name="([a-z0-9_]+)"[^>]*>([\s\S]*?)<\/td>/g)) {
        celulas.set(td[1], semTags(td[2]));
      }
      const ler = (k: string) => celulas.get(k) ?? "";

      linhas.push({
        ticker,
        nome,
        mercado,
        pais,
        cotacao: numeroBr(ler("current_price")),
        capitalizacao: magnitude(ler("capitalization")),
        dy12: numeroBr(ler("dividend_yield_last_12_months")),
        dy5a: numeroBr(ler("dividend_yield_last_5_years")),
        cotistas: inteiro(ler("qty_holders")),
        var30d: numeroBr(ler("variation_30_days")),
        var12m: numeroBr(ler("variation_12_months")),
        var24m: numeroBr(ler("two_years_variation")),
        var60m: numeroBr(ler("variation_5_years")),
      });
    }
    return linhas;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function baixarBase(): Promise<BaseEtf[]> {
  const saida: BaseEtf[] = [];
  const vistos = new Set<string>();

  const paginas: Array<[string, MercadoEtf]> = [
    [`${FONTE_NACIONAL}/`, "nacional"],
    [`${FONTE_NACIONAL}?page=2`, "nacional"],
    [`${FONTE_NACIONAL}?page=3`, "nacional"],
    [`${FONTE_NACIONAL}?page=4`, "nacional"],
    [`${FONTE_GLOBAL}/`, "internacional"],
    [`${FONTE_GLOBAL}?page=2`, "internacional"],
    [`${FONTE_GLOBAL}?page=3`, "internacional"],
  ];

  // Sequencial de propósito: evita rajada na fonte pública.
  for (const [url, mercado] of paginas) {
    const linhas = await baixarPagina(url, mercado);
    for (const l of linhas) {
      if (vistos.has(l.ticker)) continue;
      vistos.add(l.ticker);
      saida.push(l);
    }
    await dormir(250);
  }
  return saida;
}

let baseMemoria: { valor: BaseEtf[]; em: number } | null = null;
const BASE_TTL = 12 * 60 * 60_000;

async function base(): Promise<{ lista: BaseEtf[]; em: string | null }> {
  if (baseMemoria && Date.now() - baseMemoria.em < BASE_TTL) {
    return { lista: baseMemoria.valor, em: new Date(baseMemoria.em).toISOString() };
  }
  const salvo = await lerBanco<BaseEtf[]>("etfs:base");
  const idade = salvo ? Date.now() - Date.parse(salvo.em) : Number.POSITIVE_INFINITY;
  if (salvo && Array.isArray(salvo.valor) && salvo.valor.length && idade < BASE_TTL) {
    baseMemoria = { valor: salvo.valor, em: Date.parse(salvo.em) };
    return { lista: salvo.valor, em: salvo.em };
  }
  const nova = await baixarBase();
  if (nova.length) {
    baseMemoria = { valor: nova, em: Date.now() };
    await gravarBanco("etfs:base", nova);
    return { lista: nova, em: new Date().toISOString() };
  }
  if (salvo?.valor?.length) {
    baseMemoria = { valor: salvo.valor, em: Date.parse(salvo.em) };
    return { lista: salvo.valor, em: salvo.em };
  }
  return { lista: [], em: null };
}

/* ------------------------------------------------------------------ *
 * Preços ao vivo da B3 (lote único na brapi)
 * ------------------------------------------------------------------ */

type PrecoVivo = {
  preco: number;
  variacaoPercent: number | null;
  volume: number | null;
  nome: string | null;
};

async function precosAoVivo(): Promise<Map<string, PrecoVivo>> {
  const mapa = new Map<string, PrecoVivo>();
  const token = process.env.BRAPI_TOKEN;
  const params = new URLSearchParams({ limit: "2000", sortBy: "volume", sortOrder: "desc" });
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
        type?: string | null;
        subType?: string | null;
      }>;
    };
    for (const s of data?.stocks ?? []) {
      if (!s.stock || typeof s.close !== "number") continue;
      const ticker = s.stock.toUpperCase();
      const ehEtf = s.subType === "etf" || (s.type === "fund" && /^[A-Z]{4}11$/.test(ticker));
      if (!ehEtf) continue;
      mapa.set(ticker, {
        preco: s.close,
        variacaoPercent: typeof s.change === "number" ? s.change : null,
        volume: typeof s.volume === "number" ? s.volume : null,
        nome: s.name && s.name !== ticker ? s.name : null,
      });
    }
  } catch {
    /* sem preços ao vivo: cai para a cotação da base diária */
  }
  return mapa;
}

/* ------------------------------------------------------------------ *
 * Ibovespa (referência do cabeçalho)
 * ------------------------------------------------------------------ */

async function buscarIbovespa(): Promise<ResumoIbovEtf | null> {
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

let gradeMemoria: { valor: RespostaEtfs; em: number } | null = null;
let emAndamento: Promise<RespostaEtfs> | null = null;

function montarLinha(b: BaseEtf | null, ticker: string, vivo: PrecoVivo | undefined): LinhaEtf {
  const nome = b?.nome ?? vivo?.nome ?? ticker;
  const preco = vivo?.preco ?? b?.cotacao ?? null;
  const variacaoPercent = vivo?.variacaoPercent ?? null;
  const fechamentoAnterior =
    preco !== null && variacaoPercent !== null && variacaoPercent !== -100
      ? preco / (1 + variacaoPercent / 100)
      : null;

  return {
    ticker,
    nome,
    gestora: gestoraDoNome(nome),
    classe: classificarEtf(ticker, nome),
    mercado: b?.mercado ?? "nacional",
    pais: b?.pais ?? (b?.mercado === "internacional" ? null : "BRA"),

    preco,
    fechamentoAnterior,
    variacao: preco !== null && fechamentoAnterior !== null ? preco - fechamentoAnterior : null,
    variacaoPercent,
    volume: vivo?.volume ?? null,

    capitalizacao: b?.capitalizacao ?? null,
    dy12: b?.dy12 ?? null,
    dy5a: b?.dy5a ?? null,
    cotistas: b?.cotistas ?? null,

    var30d: b?.var30d ?? null,
    var12m: b?.var12m ?? null,
    var24m: b?.var24m ?? null,
    var60m: b?.var60m ?? null,

    precoDefasado: vivo === undefined,
  };
}

async function montarGrade(): Promise<RespostaEtfs> {
  const [{ lista, em }, precos, ibovespa] = await Promise.all([
    base(),
    precosAoVivo(),
    buscarIbovespa(),
  ]);

  const vistos = new Set<string>();
  const linhas: LinhaEtf[] = [];

  for (const b of lista) {
    if (vistos.has(b.ticker)) continue;
    vistos.add(b.ticker);
    linhas.push(montarLinha(b, b.ticker, precos.get(b.ticker)));
  }
  // ETFs que a base diária ainda não cobre, mas que já negociam na B3.
  for (const [ticker, vivo] of precos) {
    if (vistos.has(ticker)) continue;
    vistos.add(ticker);
    linhas.push(montarLinha(null, ticker, vivo));
  }

  linhas.sort(
    (a, b) => (b.capitalizacao ?? 0) - (a.capitalizacao ?? 0) || (b.volume ?? 0) - (a.volume ?? 0),
  );

  return {
    linhas,
    ibovespa,
    atualizadoEm: new Date().toISOString(),
    baseEm: em,
    parcial: precos.size === 0 || lista.length === 0,
  };
}

/** Grade de ETFs com stale-while-revalidate (memória + cache compartilhado). */
export async function gradeEtfsComCache(forcar = false): Promise<RespostaEtfs> {
  const frescor = emPregao() ? FRESCOR_PREGAO : FRESCOR_FECHADO;
  if (!forcar && gradeMemoria && Date.now() - gradeMemoria.em < frescor) return gradeMemoria.valor;

  if (!emAndamento) {
    emAndamento = montarGrade()
      .then(async (g) => {
        gradeMemoria = { valor: g, em: Date.now() };
        await gravarBanco("etfs:grade", g, g.parcial);
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
    const salvo = await lerBanco<RespostaEtfs>("etfs:grade");
    if (salvo?.valor?.linhas?.length) {
      gradeMemoria = { valor: salvo.valor, em: Date.parse(salvo.em) };
      void emAndamento.catch(() => undefined);
      if (!forcar) return salvo.valor;
    }
  }
  return emAndamento;
}

/* ------------------------------------------------------------------ *
 * Preços internacionais (sob demanda, apenas linhas visíveis)
 * ------------------------------------------------------------------ */

export type PrecoInternacional = {
  ticker: string;
  preco: number | null;
  variacaoPercent: number | null;
  moeda: string | null;
};

const INTL_TTL = 5 * 60_000;
const intlMemoria = new Map<string, { valor: PrecoInternacional; em: number }>();
let fila = 0;

async function precoYahoo(ticker: string): Promise<PrecoInternacional> {
  const vazio: PrecoInternacional = { ticker, preco: null, variacaoPercent: null, moeda: null };
  const posicao = fila++;
  await dormir(Math.min(posicao * 120, 4_000));
  try {
    for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
      const res = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d`,
        { headers: NAVEGADOR },
      );
      if (res.status === 429) {
        await dormir(1_500);
        continue;
      }
      if (!res.ok) continue;
      const data = (await res.json()) as {
        chart?: {
          result?: Array<{
            meta?: {
              regularMarketPrice?: number;
              chartPreviousClose?: number;
              previousClose?: number;
              currency?: string;
            };
          }>;
        };
      };
      const meta = data?.chart?.result?.[0]?.meta;
      const preco = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
      if (preco === null) continue;
      const anterior = meta?.chartPreviousClose ?? meta?.previousClose ?? null;
      return {
        ticker,
        preco,
        variacaoPercent: anterior && anterior > 0 ? ((preco - anterior) / anterior) * 100 : null,
        moeda: meta?.currency ?? null,
      };
    }
    return vazio;
  } catch {
    return vazio;
  } finally {
    fila = Math.max(0, fila - 1);
  }
}

/** Cotação dos ETFs internacionais visíveis (cache curto por ticker). */
export async function precosInternacionais(tickers: string[]): Promise<PrecoInternacional[]> {
  const agora = Date.now();
  const pendentes: string[] = [];
  const prontos: PrecoInternacional[] = [];

  for (const t of tickers) {
    const memo = intlMemoria.get(t);
    if (memo && agora - memo.em < INTL_TTL) prontos.push(memo.valor);
    else pendentes.push(t);
  }

  const novos = await Promise.all(pendentes.map((t) => precoYahoo(t)));
  for (const n of novos) intlMemoria.set(n.ticker, { valor: n, em: Date.now() });

  return [...prontos, ...novos];
}
