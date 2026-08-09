/**
 * Radar: agregador server-side das grades B3 com posição histórica de cada
 * ativo (mínimo/máximo desde o início da série, mínima/máxima de 52 semanas,
 * drawdown do máximo, volatilidade), série semanal downsampled para gráficos
 * e sinais de triagem.
 *
 * Cache:
 *  - `cotacoes_cache` chave `radar:posicao` -> mapa ticker -> PosicaoHistorica
 *  - `cotacoes_cache` chave `radar:serie:<TICKER>` -> série downsampled
 *  - `cotacoes_cache` chave `radar:ia:<TICKER>` -> análise do Técnico IA (72h)
 *  - memória com TTL de 24h (posições e séries) e 15min (contexto macro)
 */

import { buscarHistorico, type Historico } from "@/lib/market.server";
import {
  backtestSinal,
  posicaoPercentil,
  type ResultadoBacktest,
  type SinalRadar,
} from "@/lib/radar-base";
import type { Json } from "@/integrations/supabase/types";

export type PosicaoHistorica = {
  ticker: string;
  minimo: number | null;
  maximo: number | null;
  primeiro: number | null;
  ultimo: number | null;
  percentil: number | null;
  inicioSerie: string | null;
  minimo52s: number | null;
  maximo52s: number | null;
  /** Distância do preço atual até a mínima de 52 semanas (0 = na mínima). */
  distMinima52sPct: number | null;
  /** Queda máxima de um pico ao ponto seguinte, negativa, em %. */
  drawdownMaximoPct: number | null;
  volatilidadeAnualPct: number | null;
  atualizadoEm: string;
};

export type LinhaRadarBase = {
  ticker: string;
  nome: string;
  categoria: "acao" | "fii";
  tipo: string | null;
  setor: string | null;
  logo: string | null;
  preco: number | null;
  variacaoDia: number | null;
  dy12: number | null;
  pvp: number | null;
  pl: number | null;
  posicao: PosicaoHistorica | null;
  sinal: SinalRadar;
  /** Score de oportunidade 0–100 (null sem histórico). */
  score: number | null;
};

/** Ponto da série semanal para o gráfico (compacto). */
export type PontoSerie = { d: string; f: number };

export type PosicaoSerie = {
  pontos: PontoSerie[];
  inicioSerie: string | null;
};

const TTL_POSICAO_MS = 24 * 60 * 60 * 1000;
const TTL_SERIE_MS = 24 * 60 * 60 * 1000;
const MAX_EM_VOO = 2;
const ESPERA_ENTRE_LOADS_MS = 450;
const MAX_PONTOS_GRAFICO = 240;
const MAX_PONTOS_SPARKLINE = 40;

/**
 * O Yahoo limita silenciosamente com 404/429 quando o volume de requisições
 * sobe (observado em campo). Este fetcher é o único caminho de histórico do
 * radar: alterna query1/query2, troca o User-Agent e recua o intervalo
 * (1wk → 1mo) até conseguir a série — com folgas entre as tentativas.
 */
const HOSTS_YAHOO = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const UA_YAHOO =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type PontoPreco = { data: string; fechamento: number };

/**
 * Ticker da B3 no formato que o Yahoo reconhece: SEMPRE com o sufixo `.SA`
 * (PETR4 -> PETR4.SA, HGLG11 -> HGLG11.SA, B3SA3 -> B3SA3.SA). O universo do
 * radar é 100% B3, então qualquer código sem sufixo especial ganha `.SA`.
 */
function simboloYahooB3(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  if (!t) return t;
  if (t.includes(".") || t.startsWith("^") || t.includes("=") || t.includes("-")) return t;
  return `${t}.SA`;
}

async function buscarSerieResiliente(ticker: string): Promise<PontoPreco[] | null> {
  // B3 só existe no Yahoo com o sufixo .SA (PETR4 -> PETR4.SA). Sem ele o
  // Yahoo responde "no data found" e o radar fica sem histórico.
  const simbolo = simboloYahooB3(ticker);
  const intervalos: Array<"1wk" | "1mo"> = ["1wk", "1mo"];
  for (const intervalo of intervalos) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      for (const host of HOSTS_YAHOO) {
        const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
          simbolo,
        )}?range=max&interval=${intervalo}&events=div%2Csplit`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        try {
          const headers: Record<string, string> =
            tentativa > 0
              ? {
                  Accept: "application/json",
                  "User-Agent": UA_YAHOO,
                  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
                }
              : { Accept: "application/json" };
          const res = await fetch(url, { headers, signal: controller.signal });
          if (!res.ok) continue;
          const payload = (await res.json()) as {
            chart?: {
              result?: Array<{
                timestamp?: number[];
                indicators?: {
                  adjclose?: Array<{ adjclose?: (number | null)[] }>;
                  quote?: Array<{ close?: (number | null)[] }>;
                };
              }>;
            };
          };
          const r = payload.chart?.result?.[0];
          if (!r?.timestamp?.length) continue;
          const closes =
            r.indicators?.adjclose?.[0]?.adjclose ?? r.indicators?.quote?.[0]?.close ?? [];
          const pontos: PontoPreco[] = [];
          for (let i = 0; i < r.timestamp.length; i++) {
            const fechamento = closes[i];
            if (typeof fechamento === "number" && Number.isFinite(fechamento) && fechamento > 0) {
              pontos.push({
                data: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
                fechamento,
              });
            }
          }
          if (pontos.length >= 2) return pontos;
        } catch {
          /* tenta a próxima combinação */
        } finally {
          clearTimeout(timer);
        }
      }
      await dormir(350 + 350 * tentativa);
    }
  }

  /* Última chance: espera maior e um único pedido mais curto (10y/1d). */
  await dormir(1200);
  for (const host of HOSTS_YAHOO) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
      simbolo,
    )}?range=10y&interval=1d`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) continue;
      const payload = (await res.json()) as {
        chart?: {
          result?: Array<{
            timestamp?: number[];
            indicators?: {
              adjclose?: Array<{ adjclose?: (number | null)[] }>;
              quote?: Array<{ close?: (number | null)[] }>;
            };
          }>;
        };
      };
      const r = payload.chart?.result?.[0];
      if (!r?.timestamp?.length) continue;
      const closes = r.indicators?.adjclose?.[0]?.adjclose ?? r.indicators?.quote?.[0]?.close ?? [];
      const pontos: PontoPreco[] = [];
      for (let i = 0; i < r.timestamp.length; i++) {
        const fechamento = closes[i];
        if (typeof fechamento === "number" && Number.isFinite(fechamento) && fechamento > 0) {
          pontos.push({
            data: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
            fechamento,
          });
        }
      }
      if (pontos.length >= 2) return pontos;
    } catch {
      /* sem série disponível mesmo na última tentativa */
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function posicaoDeSerie(ticker: string, pontos: PontoPreco[]): PosicaoHistorica {
  return posicaoDeHistorico(ticker, {
    simbolo: ticker,
    nome: ticker,
    moeda: "BRL",
    periodo: "max",
    intervalo: "1wk",
    serie: pontos,
    resumo: {
      primeiroPreco: pontos[0]?.fechamento ?? null,
      ultimoPreco: pontos[pontos.length - 1]?.fechamento ?? null,
      minimo: Math.min(...pontos.map((p) => p.fechamento)),
      maximo: Math.max(...pontos.map((p) => p.fechamento)),
    },
  } as unknown as Historico);
}

function serieDePontos(pontos: PontoPreco[]): PosicaoSerie {
  const serie = pontos.filter((p) => p.fechamento > 0).map((p) => ({ d: p.data, f: p.fechamento }));
  return { pontos: amostrarSerie(serie), inicioSerie: serie[0]?.d ?? null };
}

let posicaoMemoria = new Map<string, { posicao: PosicaoHistorica; em: number }>();
const serieMemoria = new Map<string, { serie: PosicaoSerie; em: number }>();

/** Amostra uma série preservando o primeiro e o último ponto (preço atual). */
export function amostrarSerie(pontos: PontoSerie[], maxPontos = MAX_PONTOS_GRAFICO): PontoSerie[] {
  if (pontos.length <= maxPontos) return pontos;
  const saida: PontoSerie[] = [pontos[0]];
  const passos = (pontos.length - 2) / (maxPontos - 2);
  for (let i = 1; i < maxPontos - 1; i++) {
    saida.push(pontos[Math.min(pontos.length - 2, Math.round(1 + i * passos))]);
  }
  saida.push(pontos[pontos.length - 1]);
  return saida;
}

function posicaoDeHistorico(ticker: string, h: Historico): PosicaoHistorica {
  const { resumo, serie } = h;
  const pct = posicaoPercentil(resumo.ultimoPreco, resumo.minimo, resumo.maximo);
  const janela52 = serie.slice(-52);
  const atual = resumo.ultimoPreco;
  const minimo52s = janela52.length ? Math.min(...janela52.map((p) => p.fechamento)) : null;
  const maximo52s = janela52.length ? Math.max(...janela52.map((p) => p.fechamento)) : null;
  const distMinima52sPct =
    atual !== null && atual > 0 && minimo52s !== null && minimo52s > 0
      ? ((atual - minimo52s) / minimo52s) * 100
      : null;

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

  return {
    ticker,
    minimo: resumo.minimo,
    maximo: resumo.maximo,
    primeiro: resumo.primeiroPreco,
    ultimo: resumo.ultimoPreco,
    percentil: pct,
    inicioSerie: serie.length ? serie[0].data : null,
    minimo52s,
    maximo52s,
    distMinima52sPct,
    drawdownMaximoPct: serie.length ? drawdown * 100 : null,
    volatilidadeAnualPct: variancia > 0 ? Math.sqrt(variancia * 52) * 100 : null,
    atualizadoEm: new Date().toISOString(),
  };
}

/** Posições históricas salvas no banco (payload completo da chave `radar:posicao`). */
export async function lerPosicoesBanco(): Promise<{
  posicoes: Record<string, PosicaoHistorica>;
  atualizadoEm: string | null;
}> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("cotacoes_cache")
      .select("payload, atualizado_em")
      .eq("categoria", "radar:posicao")
      .maybeSingle();
    if (!data?.payload) return { posicoes: {}, atualizadoEm: null };
    const posicoes = data.payload as unknown as Record<string, PosicaoHistorica>;
    posicaoMemoria = new Map(
      Object.values(posicoes).map((p) => [p.ticker, { posicao: p, em: Date.now() }]),
    );
    return { posicoes, atualizadoEm: data.atualizado_em };
  } catch {
    return { posicoes: {}, atualizadoEm: null };
  }
}

async function gravarPosicoesBanco(
  adicionadas: Map<string, PosicaoHistorica>,
  series: Map<string, PosicaoSerie>,
) {
  if (!adicionadas.size && !series.size) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const agora = new Date().toISOString();
    const linhas: Array<{
      categoria: string;
      payload: Json;
      parcial: boolean;
      atualizado_em: string;
    }> = [];

    if (adicionadas.size) {
      const { posicoes } = await lerPosicoesBanco();
      for (const [ticker, posicao] of adicionadas) posicoes[ticker] = posicao;
      linhas.push({
        categoria: "radar:posicao",
        payload: JSON.parse(JSON.stringify(posicoes)) as Json,
        parcial: false,
        atualizado_em: agora,
      });
    }
    for (const [ticker, serie] of series) {
      linhas.push({
        categoria: `radar:serie:${ticker}`,
        payload: JSON.parse(JSON.stringify(serie)) as Json,
        parcial: false,
        atualizado_em: agora,
      });
    }
    await supabaseAdmin.from("cotacoes_cache").upsert(linhas, { onConflict: "categoria" });
  } catch {
    /* best-effort: memória cobre a sessão */
  }
}

function dormir(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Posição de cada ticker na própria história (série semanal desde o início).
 * Só busca no Yahoo o que ainda não está em cache; a fila limita a 2 chamadas
 * simultâneas com 130ms de folga, então lotes grandes avançam sem trombadas.
 */
export async function posicoesParaTickers(
  tickers: string[],
  mapaBanco?: Record<string, PosicaoHistorica> | null,
): Promise<Record<string, PosicaoHistorica>> {
  const unicos = [...new Set(tickers.map((t) => t.toUpperCase()))];
  if (!unicos.length) return {};

  const resultado: Record<string, PosicaoHistorica> = {};
  const falta: string[] = [];

  for (const t of unicos) {
    const m = posicaoMemoria.get(t);
    if (m && Date.now() - m.em < TTL_POSICAO_MS) {
      resultado[t] = m.posicao;
    } else if (mapaBanco?.[t]) {
      resultado[t] = mapaBanco[t];
      posicaoMemoria.set(t, { posicao: mapaBanco[t], em: Date.now() });
    } else {
      falta.push(t);
    }
  }

  if (!falta.length) return resultado;

  const novidades = new Map<string, PosicaoHistorica>();
  const seriesNovas = new Map<string, PosicaoSerie>();
  let emVoo = 0;
  const corridas: Promise<void>[] = [];

  for (const ticker of falta) {
    if (emVoo >= MAX_EM_VOO) await dormir(ESPERA_ENTRE_LOADS_MS);
    emVoo++;
    corridas.push(
      (async () => {
        try {
          const pontos = await buscarSerieResiliente(ticker);
          if (!pontos) return;
          const p = posicaoDeSerie(ticker, pontos);
          const serie = serieDePontos(pontos);
          novidades.set(ticker, p);
          seriesNovas.set(ticker, serie);
          serieMemoria.set(ticker, { serie, em: Date.now() });
          resultado[ticker] = p;
          posicaoMemoria.set(ticker, { posicao: p, em: Date.now() });
        } catch {
          /* sem série disponível: segue sem posição */
        } finally {
          emVoo--;
        }
      })(),
    );
  }
  await Promise.allSettled(corridas);

  if (novidades.size || seriesNovas.size)
    await gravarPosicoesBanco(novidades, seriesNovas).catch(() => undefined);
  return resultado;
}

/**
 * Preenche o histórico que falta no universo inteiro da categoria, em lotes.
 * Idempotente: só busca o que ainda não está em cache (memória/banco) e grava
 * cada lote antes de retornar, então o chamador pode repetir até `faltam` = 0.
 */
export async function completarFaltasRadar(
  categoria: "acao" | "fii",
  limite = 120,
): Promise<{ buscados: number; obtidos: number; faltam: number }> {
  const grade =
    categoria === "acao"
      ? await (await import("@/lib/acoes.server")).gradeAcoesComCache().catch(() => null)
      : await (await import("@/lib/fiis.server")).gradeFiisComCache().catch(() => null);
  const tickers = (grade?.linhas ?? []).map((l: { ticker: string }) => l.ticker.toUpperCase());
  const { posicoes } = await lerPosicoesBanco();
  const faltantes = tickers.filter((t) => {
    const m = posicaoMemoria.get(t);
    if (m && Date.now() - m.em < TTL_POSICAO_MS) return false;
    const salva = posicoes[t];
    if (salva && Date.now() - Date.parse(salva.atualizadoEm ?? "0") < TTL_POSICAO_MS) return false;
    return true;
  });
  const lote = faltantes.slice(0, limite);
  if (!lote.length) return { buscados: 0, obtidos: 0, faltam: 0 };
  const resultado = await posicoesParaTickers(lote, posicoes);
  return {
    buscados: lote.length,
    obtidos: Object.keys(resultado).length,
    faltam: Math.max(0, faltantes.length - Math.min(limite, lote.length)),
  };
}

/* ------------------------------------------------------------------ *
 * Série para gráfico (downsampled)
 * ------------------------------------------------------------------ */

async function lerSerieBanco(ticker: string): Promise<(PosicaoSerie & { em: string }) | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("cotacoes_cache")
      .select("payload, atualizado_em")
      .eq("categoria", `radar:serie:${ticker}`)
      .maybeSingle();
    if (!data?.payload) return null;
    const p = data.payload as unknown as PosicaoSerie;
    if (!Array.isArray(p?.pontos) || !p.pontos.length) return null;
    return {
      pontos: p.pontos,
      inicioSerie: p.inicioSerie ?? null,
      em: data.atualizado_em,
    };
  } catch {
    return null;
  }
}

/** Série semanal (desde o início) para o gráfico, com cache de 24h. */
export async function serieParaGrafico(ticker: string): Promise<PosicaoSerie | null> {
  const t = ticker.trim().toUpperCase();
  if (!t) return null;
  const mem = serieMemoria.get(t);
  if (mem && Date.now() - mem.em < TTL_SERIE_MS) return mem.serie;

  const salvo = await lerSerieBanco(t);
  if (salvo && Date.now() - Date.parse(salvo.em) < TTL_SERIE_MS) {
    serieMemoria.set(t, {
      serie: { pontos: salvo.pontos, inicioSerie: salvo.inicioSerie },
      em: Date.now(),
    });
    return { pontos: salvo.pontos, inicioSerie: salvo.inicioSerie };
  }

  // A carga de posições busca o histórico no Yahoo e já grava a série no cache.
  await posicoesParaTickers([t]);
  const depois = serieMemoria.get(t);
  return depois ? depois.serie : null;
}

/* ------------------------------------------------------------------ *
 * Sparklines (mini-séries da tabela do radar)
 * ------------------------------------------------------------------ */

function ultimosSpark(serie: PosicaoSerie): number[] | null {
  const valores = serie.pontos.map((p) => p.f).filter(Number.isFinite);
  return valores.length >= 2 ? valores.slice(-MAX_PONTOS_SPARKLINE) : null;
}

/**
 * Últimos ~40 fechamentos semanais por ticker para sparklines da tabela.
 * Usa memória → cache do banco (uma consulta só) → Yahoo apenas para o que
 * faltar (reaproveitando a carga de posições, que já grava as séries).
 */
export async function sparklinesParaTickers(tickers: string[]): Promise<Record<string, number[]>> {
  const unicos = [...new Set(tickers.map((t) => t.toUpperCase()).filter(Boolean))];
  const resultado: Record<string, number[]> = {};
  if (!unicos.length) return resultado;

  const falta: string[] = [];
  for (const t of unicos) {
    const mem = serieMemoria.get(t);
    const spark = mem?.serie ? ultimosSpark(mem.serie) : null;
    if (spark) {
      resultado[t] = spark;
    } else {
      falta.push(t);
    }
  }

  if (falta.length) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("cotacoes_cache")
        .select("categoria, payload")
        .in(
          "categoria",
          falta.map((t) => `radar:serie:${t}`),
        );
      for (const linha of data ?? []) {
        const t = String(linha.categoria).replace(/^radar:serie:/, "");
        const p = linha.payload as unknown as PosicaoSerie | null;
        if (!p || !Array.isArray(p?.pontos) || !p.pontos.length) continue;
        const serie = { pontos: p.pontos, inicioSerie: p.inicioSerie ?? null };
        serieMemoria.set(t, { serie, em: Date.now() });
        const spark = ultimosSpark(serie);
        if (spark) resultado[t] = spark;
      }
    } catch {
      /* sem banco: a carga de posições cobre */
    }
  }

  const restantes = unicos.filter((t) => !resultado[t]);
  if (restantes.length) {
    await posicoesParaTickers(restantes);
    for (const t of restantes) {
      const mem = serieMemoria.get(t);
      const spark = mem ? ultimosSpark(mem.serie) : null;
      if (spark) resultado[t] = spark;
    }
  }
  return resultado;
}

/* ------------------------------------------------------------------ *
 * Contexto macro (Banco Central) — cache de 15min em memória
 * ------------------------------------------------------------------ */

let macroMemoria: { valor: { selic: number | null; ipca: number | null }; em: number } | null =
  null;

export async function contextoMacro(): Promise<{
  selic: number | null;
  ipca: number | null;
}> {
  if (macroMemoria && Date.now() - macroMemoria.em < 15 * 60_000) return macroMemoria.valor;
  const resultado = { selic: null as number | null, ipca: null as number | null };
  try {
    const { buscarIndicador } = await import("@/lib/market.server");
    const [selic, ipca] = await Promise.all([
      buscarIndicador("selic", 2).catch(() => null),
      buscarIndicador("ipca", 2).catch(() => null),
    ]);
    const ultimo = (arr: { valor: number }[] | undefined): number | null => {
      if (!arr?.length) return null;
      const v = Number(arr[arr.length - 1]?.valor);
      return Number.isFinite(v) ? v : null;
    };
    resultado.selic = ultimo(selic?.serie);
    resultado.ipca = ultimo(ipca?.serie);
    macroMemoria = { valor: resultado, em: Date.now() };
  } catch {
    /* sem macro: a IA segue com o que tiver disponível */
  }
  return resultado;
}

/* ------------------------------------------------------------------ *
 * Busca de fatos externos em tempo real (Google News RSS por ativo)
 * ------------------------------------------------------------------ */

export interface FatoExterno {
  titulo: string;
  fonte: string;
  url: string | null;
  publicadoEm: string;
}

function decodificarXml(texto: string): string {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(
      /&(amp|quot|apos|lt|gt|nbsp);/gi,
      (_, e: string) =>
        ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " })[e.toLowerCase()] ?? "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** Notícias recentes (até 3 dias) que citam o ticker ou a razão social da empresa. */
export async function buscarFatosExternos(ticker: string, nome: string): Promise<FatoExterno[]> {
  const termos = [`"${ticker}"`, nome && nome !== ticker ? `"${nome}"` : ""]
    .filter(Boolean)
    .join(" OR ");
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    `quando:3d ${termos}`,
  )}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; ViverDeRenda/1.0; +https://viverderendaem15anos.lovable.app)",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    const blocos = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi)?.slice(0, 10) ?? [];
    const fatos: FatoExterno[] = [];
    for (const bloco of blocos) {
      const tituloBruto = bloco.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1];
      if (!tituloBruto) continue;
      const titulo = decodificarXml(tituloBruto);
      if (!titulo) continue;
      const link =
        bloco.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i)?.[1] ??
        bloco.match(/<link[^>]*\shref=["']([^"']+)["']/i)?.[1] ??
        null;
      const fonte = decodificarXml(
        bloco.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/i)?.[1] ?? "",
      );
      const data = bloco.match(/<pubDate(?:\s[^>]*)?>([\s\S]*?)<\/pubDate>/i)?.[1];
      fatos.push({
        titulo,
        fonte: fonte || "Google News",
        url: link && /^https?:\/\//.test(link) ? link : null,
        publicadoEm: data ? new Date(data).toISOString() : new Date().toISOString(),
      });
    }
    return fatos;
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ *
 * Análise pelo Técnico IA (cache compartilhado, 72h)
 * ------------------------------------------------------------------ */

export interface AnaliseIA {
  ticker: string;
  veredito: "comprar" | "manter" | "vender" | "observar";
  tese: string;
  riscos: string;
  gatilhos: string;
  /** Fatos externos citados na análise (manchetes / contexto macro). */
  fatoresExternos: string[];
  geradaEm: string;
}

const TTL_ANALISE_MS = 72 * 60 * 60 * 1000;

export async function lerAnaliseIA(ticker: string): Promise<AnaliseIA | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("cotacoes_cache")
      .select("payload, atualizado_em")
      .eq("categoria", `radar:ia:${ticker}`)
      .maybeSingle();
    if (!data?.payload) return null;
    const vencida = Date.now() - new Date(data.atualizado_em ?? 0).getTime() > TTL_ANALISE_MS;
    if (vencida) return null;
    return (data.payload as unknown as AnaliseIA) ?? null;
  } catch {
    return null;
  }
}

async function gravarAnaliseIA(ticker: string, analise: AnaliseIA) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("cotacoes_cache").upsert(
      {
        categoria: `radar:ia:${ticker}`,
        payload: JSON.parse(JSON.stringify(analise)),
        parcial: false,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "categoria" },
    );
  } catch {
    /* best-effort */
  }
}

/** Histórico do Técnico IA: cada análise gerada vira uma linha em `radar_analises`. */
async function gravarHistoricoIA(ticker: string, analise: AnaliseIA) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("radar_analises").insert({
      ticker,
      veredito: analise.veredito,
      tese: analise.tese,
      riscos: analise.riscos,
      gatilhos: analise.gatilhos,
      fatores_externos: analise.fatoresExternos,
      gerada_em: analise.geradaEm,
    });
  } catch {
    /* best-effort */
  }
}

/** Últimas análises do Técnico IA para um ativo, da mais recente para a mais antiga. */
export async function lerHistoricoIA(ticker: string, qtd = 10): Promise<AnaliseIA[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("radar_analises")
      .select("ticker, veredito, tese, riscos, gatilhos, fatores_externos, gerada_em")
      .eq("ticker", ticker)
      .order("gerada_em", { ascending: false })
      .limit(qtd);
    if (!Array.isArray(data)) return [];
    return data.map((linha) => ({
      ticker: linha.ticker,
      veredito: linha.veredito as AnaliseIA["veredito"],
      tese: linha.tese ?? "",
      riscos: linha.riscos ?? "",
      gatilhos: linha.gatilhos ?? "",
      fatoresExternos: Array.isArray(linha.fatores_externos)
        ? (linha.fatores_externos as unknown[]).map((f) => String(f)).slice(0, 3)
        : [],
      geradaEm: linha.gerada_em ?? "",
    }));
  } catch {
    return [];
  }
}

const TTL_BACKTEST_MS = 7 * 24 * 60 * 60 * 1000;
const COLUNA_IBOV = "BOVA11";

export type RespostaBacktest = {
  ticker: string;
  inicioSerie: string | null;
  fimSerie: string | null;
  resultado: ResultadoBacktest | null;
  ibov: { inicioSerie: string | null; fimSerie: string | null; buyHoldPct: number | null } | null;
  geradoEm: string;
};

function buyHoldDeSerie(serie: { data: string; fechamento: number }[]) {
  const precos = serie.filter((p) => Number.isFinite(p.fechamento) && p.fechamento > 0);
  const primeiro = precos[0]?.fechamento ?? null;
  const ultimo = precos[precos.length - 1]?.fechamento ?? null;
  return {
    inicioSerie: precos[0]?.data ?? null,
    fimSerie: precos[precos.length - 1]?.data ?? null,
    buyHoldPct:
      primeiro !== null && ultimo !== null && primeiro > 0 ? (ultimo / primeiro - 1) * 100 : null,
  };
}

/**
 * Backtest do sinal do radar para um ativo (série semanal completa do Yahoo),
 * comparado ao buy-and-hold do ativo e do Ibovespa via BOVA11 no mesmo período.
 * Resultado fica em cache por 7 dias.
 */
export async function backtestRadarAtivo(ticker: string): Promise<RespostaBacktest | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cache } = await supabaseAdmin
      .from("cotacoes_cache")
      .select("payload, atualizado_em")
      .eq("categoria", `radar:backtest:${ticker}`)
      .maybeSingle();
    if (cache?.payload) {
      const vencido = Date.now() - new Date(cache.atualizado_em ?? 0).getTime() > TTL_BACKTEST_MS;
      if (!vencido) return cache.payload as unknown as RespostaBacktest;
    }

    const [histAtivo, histIbov] = await Promise.all([
      buscarHistorico(ticker, "max", "1wk").catch(() => null),
      buscarHistorico(COLUNA_IBOV, "max", "1wk").catch(() => null),
    ]);
    const serieAtivo = histAtivo?.serie ?? [];
    const resultado = backtestSinal(serieAtivo.map((p) => ({ f: p.fechamento })));
    const ibov = histIbov ? buyHoldDeSerie(histIbov.serie) : null;

    const resposta: RespostaBacktest = {
      ticker,
      inicioSerie: serieAtivo[0]?.data ?? null,
      fimSerie: serieAtivo[serieAtivo.length - 1]?.data ?? null,
      resultado,
      ibov,
      geradoEm: new Date().toISOString(),
    };
    await supabaseAdmin.from("cotacoes_cache").upsert(
      {
        categoria: `radar:backtest:${ticker}`,
        payload: JSON.parse(JSON.stringify(resposta)),
        parcial: false,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "categoria" },
    );
    return resposta;
  } catch (e) {
    console.error(`Radar backtest falhou para ${ticker}:`, e);
    return null;
  }
}

function textoDeBase(
  l: {
    nome: string;
    preco: number | null;
    variacaoPercent: number | null;
    dy12: number | null;
    pvp: number | null;
  } | null,
): string {
  return l
    ? `- Preço: ${l.preco ?? "—"} | Var. dia: ${l.variacaoPercent ?? "—"}%` +
        ` | DY 12m: ${l.dy12 ?? "—"}% | P/VPA: ${l.pvp ?? "—"}`
    : "- Sem dados fundamentalistas na grade.";
}

/** Gera (e persiste) a análise completa de um ativo com o Técnico IA. */
export async function gerarAnaliseIA(
  ticker: string,
  lovableApiKey: string,
): Promise<AnaliseIA | null> {
  try {
    const [acoesMod, fiisMod] = await Promise.all([
      import("@/lib/acoes.server").catch(() => null),
      import("@/lib/fiis.server").catch(() => null),
    ]);
    const [acao, fii] = await Promise.all([
      acoesMod?.gradeAcoesComCache().catch(() => null) ?? null,
      fiisMod?.gradeFiisComCache().catch(() => null) ?? null,
    ]);

    const base =
      fii?.linhas?.find((l) => l.ticker.toUpperCase() === ticker) ??
      acao?.linhas?.find((l) => l.ticker.toUpperCase() === ticker) ??
      null;
    const nome = base?.nome || ticker;

    const posicoes = await posicoesParaTickers([ticker]);
    const posicao = posicoes[ticker] ?? null;

    const noticiasMod = await import("@/lib/noticias.server").catch(() => null);
    const feed = noticiasMod ? await noticiasMod.agregarNoticias().catch(() => []) : [];
    const doAtivo = feed
      .filter((n) => n.tickers.some((t) => t.toUpperCase() === ticker))
      .sort((a, b) => new Date(b.publicadoEm).getTime() - new Date(a.publicadoEm).getTime())
      .slice(0, 6);

    // Busca automática em tempo real (Google News) + macro do Banco Central.
    const [fatos, macro] = await Promise.all([buscarFatosExternos(ticker, nome), contextoMacro()]);

    const prompt = [
      `Ativo: ${ticker} — ${nome}`,
      textoDeBase(base),
      "",
      "Posição histórica (série semanal Yahoo desde o início):",
      `- Mínimo: ${posicao?.minimo ?? "—"}`,
      `- Máximo: ${posicao?.maximo ?? "—"}`,
      `- Preço na série: ${posicao?.ultimo ?? "—"}`,
      `- Percentil: ${posicao?.percentil?.toFixed(0) ?? "—"}% (0 = mínima, 100 = máxima)`,
      `- Mínima 52 semanas: ${posicao?.minimo52s ?? "—"} | Máxima 52 semanas: ${posicao?.maximo52s ?? "—"}`,
      `- Distância da mínima de 52 semanas: ${posicao?.distMinima52sPct?.toFixed(1) ?? "—"}%`,
      `- Drawdown máximo histórico: ${posicao?.drawdownMaximoPct?.toFixed(1) ?? "—"}%`,
      `- Volatilidade anual (série semanal): ${posicao?.volatilidadeAnualPct?.toFixed(1) ?? "—"}%`,
      `- Série começa em ${posicao?.inicioSerie ?? "—"}`,
      "",
      "Contexto macro (Banco Central):",
      `- Meta Selic: ${macro.selic !== null ? `${macro.selic}%` : "—"}`,
      `- IPCA mensal: ${macro.ipca !== null ? `${macro.ipca}%` : "—"}`,
      "",
      "Notícias recentes do ativo (feed próprio):",
      ...(doAtivo.length
        ? doAtivo.map((n) => `- (${n.fonte}) ${n.titulo}`)
        : ["- Nenhuma notícia direta no feed."]),
      "",
      "Busca automática em tempo real (Google News, últimas 72h):",
      ...(fatos.length
        ? fatos.map((f) => `- (${f.fonte}) ${f.titulo}`)
        : ["- Nenhum fato novo encontrado na busca automática."]),
    ].join("\n");

    const system =
      "Você é o Técnico IA da mesa de tesouraria, analista de mercado brasileiro" +
      " rigoroso e objetivo. Traduz dados, notícias e contexto macro em decisões" +
      " claras para investidores de dividendos de longo prazo. Considere: preço" +
      " nas mínimas históricas com DY atrativo sugere COMPRAR; choque externo," +
      " notícia de alto impacto ou deterioração fundamental sugere VENDER;" +
      " zona intermediária sugere OBSERVAR; topo do histórico sugere MANTER evita." +
      " Responda SEMPRE apenas com JSON válido, sem markdown, com exatamente estas" +
      ' chaves: {"veredito":"comprar|manter|vender|observar",' +
      '"tese":"2 a 3 frases com a visão geral",' +
      '"riscos":"principais riscos em 1 frase",' +
      '"gatilhos":"o que faria mudar de ideia (1-2 frases)",' +
      '"fatoresExternos":["lista curta de manchetes/fatores que pesaram na decisão, máx 4 itens"]}.';

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(lovableApiKey);
    const resultadoIA = await generateText({
      model: gateway("openai/gpt-5.5"),
      providerOptions: {
        lovable: { max_completion_tokens: 640 },
      },
      system,
      prompt,
    });

    const texto = resultadoIA.text.trim();
    const ini = texto.indexOf("{");
    const fim = texto.lastIndexOf("}");
    if (ini < 0 || fim <= ini) return null;
    const parsed = JSON.parse(texto.slice(ini, fim + 1)) as Partial<AnaliseIA>;
    const veredito = ["comprar", "manter", "vender", "observar"].includes(String(parsed.veredito))
      ? (parsed.veredito as AnaliseIA["veredito"])
      : "observar";

    const analise: AnaliseIA = {
      ticker,
      veredito,
      tese: String(parsed.tese ?? "").slice(0, 600),
      riscos: String(parsed.riscos ?? "").slice(0, 400),
      gatilhos: String(parsed.gatilhos ?? "").slice(0, 400),
      fatoresExternos: Array.isArray(parsed.fatoresExternos)
        ? parsed.fatoresExternos
            .map((f) => String(f).slice(0, 160))
            .filter(Boolean)
            .slice(0, 3)
        : [],
      geradaEm: new Date().toISOString(),
    };
    await gravarAnaliseIA(ticker, analise);
    await gravarHistoricoIA(ticker, analise);
    return analise;
  } catch (e) {
    console.error(`Radar IA falhou para ${ticker}:`, e);
    throw e instanceof Error ? e : new Error("Falha desconhecida do Técnico IA.");
  }
}
