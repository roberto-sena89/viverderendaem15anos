/**
 * Radar — fundamentos reais da CVM (F0 + F1).
 *
 * Baixa os ZIPs oficiais do Portal de Dados Abertos da CVM (DFP/ITR),
 * mapeia cada ticker da B3 para o CNPJ da companhia via nome público do
 * Yahoo, e deriva a série trimestral de P/L (TTM) com posição de preços
 * brutos ajustados por splits. O percentil do P/L atual na própria história
 * alimenta o score do gestor como valuation real (não mais derivado do
 * preço, que fazia P/L projetado == percentil do preço).
 *
 * Cache:
 *  - `cotacoes_cache` chave `cvm:fundamentos` -> mapa ticker -> FundamentoCvm
 *  - memória com TTL de 24h para o mapa e para os arquivos CVM já baixados
 *    (um download por ano de arquivo, compartilhado entre os tickers)
 */

import { unzipSync } from "fflate";
import {
  lucroTtmPorTrimestre,
  mapearEmpresaPorNome,
  montarSeriePlReal,
  parseCsvLinhas,
  serieDaConta,
  type LinhaCsv,
  type PontoPlReal,
} from "@/lib/cvm-base";
import { percentilDistribucional } from "@/lib/radar-base";
import { sanitizarPontos, simboloYahooB3 } from "@/lib/radar.server";

/** Sempre presente nos DREs da CVM: lucro líquido do período. */
const CONTA_LUCRO = "3.11";
const CONTA_LUCRO_FALLBACK = "3.13";

/** Linhas dos DREs consolidadas por trimestre mas só as contas de lucro. */
const CONTAS_UTEIS = new Set([CONTA_LUCRO, CONTA_LUCRO_FALLBACK]);

/** Quantos anos de arquivos DFP/ITR baixar para montar a série de P/L. */
const ANOS_HISTORIA = 8;

/** Mínimo de trimestres com P/L positivo para o percentil existir. */
const MINIMO_PONTOS_PL = 15;

const TTL_MAPA_MEMORIA_MS = 24 * 60 * 60 * 1000;
const TTL_ARQUIVOS_MEMORIA_MS = 24 * 60 * 60 * 1000;
const TTL_BANCO_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EM_VOO = 3;
const ESPERA_ENTRE_LOADS_MS = 350;

const BASE_CVM = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC";
const HOSTS_YAHOO = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const UA_YAHOO =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type FundamentoCvm = {
  ticker: string;
  /** CNPJ da companhia nos arquivos da CVM (8 dígitos cheios, sem pontuação). */
  cnpj: string | null;
  denominacao: string | null;
  /** Percentil do P/L atual na própria história trimestral (0–100). */
  percentilPl: number | null;
  /** P/L atual (TTM do último trimestre reportado), em vezes. */
  plAtual: number | null;
  /** Série de P/L trimestral que sustenta o percentil. */
  pontosPl: PontoPlReal[];
  atualizadoEm: string;
};

type FundosCache = {
  mapa: Record<string, FundamentoCvm>;
  atualizadoEm: string | null;
};

let mapaMemoria: { valor: FundosCache; em: number } | null = null;
let mapaEmVoo: Promise<FundosCache> | null = null;

/** Cache em memória dos arquivos CVM já baixados (um por ano). */
const arquivosMemoria = new Map<string, { valor: Uint8Array; em: number }>();

/** Carregamentos Yahoo em andamento por ticker (deduplicação). */
const yahooEmVoo = new Map<string, Promise<DadosYahoo | null>>();

async function baixarZip(url: string): Promise<Uint8Array | null> {
  const memoria = arquivosMemoria.get(url);
  if (memoria && Date.now() - memoria.em < TTL_ARQUIVOS_MEMORIA_MS) return memoria.valor;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(url, {
      headers: { Accept: "application/zip", "User-Agent": UA_YAHOO },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    arquivosMemoria.set(url, { valor: bytes, em: Date.now() });
    return bytes;
  } catch {
    return null;
  }
}

/** Leituras de um arquivo CSV (ISO-8859-1) dentro de um ZIP da CVM — tenta
 *  os nomes na ordem até achar um presente no ZIP. */
function lerCsvDoZip(zip: Uint8Array, nomes: string[]): LinhaCsv[] {
  try {
    const arquivos = unzipSync(zip);
    for (const nome of nomes) {
      const bytes = arquivos[nome];
      if (!bytes) continue;
      const texto = new TextDecoder("latin1").decode(bytes);
      return parseCsvLinhas(texto);
    }
  } catch {
    /* zip corrompido ou arquivos ausentes */
  }
  return [];
}

/** CNPJs e denominações do último ano com arquivo completo. O ZIP do ano em
 *  curso só começa a listar companhias conforme elas entregam relatórios —
 *  usamos o último ano com volume representativo do mercado (>= 50), com
 *  fallback para os anteriores. */
async function empresasDeAno(): Promise<LinhaCsv[]> {
  const anoAtual = new Date().getFullYear();
  for (let ano = anoAtual; ano >= anoAtual - 2; ano--) {
    const url = `${BASE_CVM}/DFP/DADOS/dfp_cia_aberta_${ano}.zip`;
    const zip = await baixarZip(url);
    if (!zip) continue;
    const linhas = lerCsvDoZip(zip, [`dfp_cia_aberta_${ano}.csv`]);
    const unicas = new Map<string, LinhaCsv>();
    for (const l of linhas) {
      const cnpj = (l["CNPJ_CIA"] ?? "").trim();
      if (!cnpj || unicas.has(cnpj)) continue;
      unicas.set(cnpj, l);
    }
    if (unicas.size >= 50) return [...unicas.values()];
  }
  return [];
}

/** Linhas DRE (consolidadas, contas de lucro) de um ano de ITR + DFP (Q4). */
async function dreDeAno(ano: number): Promise<LinhaCsv[]> {
  const urlItr = `${BASE_CVM}/ITR/DADOS/itr_cia_aberta_${ano}.zip`;
  const urlDfp = `${BASE_CVM}/DFP/DADOS/dfp_cia_aberta_${ano}.zip`;
  const [zipItr, zipDfp] = await Promise.all([baixarZip(urlItr), baixarZip(urlDfp)]);
  const linhas: LinhaCsv[] = [];
  if (zipItr) {
    linhas.push(
      ...lerCsvDoZip(zipItr, [
        `itr_cia_aberta_DRE_con_${ano}.csv`,
        `itr_cia_aberta_DRE_${ano}.csv`,
      ]),
    );
  }
  if (zipDfp) {
    linhas.push(...lerCsvDoZip(zipDfp, [`dfp_cia_aberta_DRE_con_${ano}.csv`]));
  }
  const filtradas = linhas.filter((l) => {
    if (!CONTAS_UTEIS.has((l["CD_CONTA"] ?? "").trim())) return false;
    if ((l["MOEDA"] ?? "").trim() !== "REAL") return false;
    // Cada período aparece duas vezes: "ÚLTIMO" (exercício atual, acumulado
    // até a data) e "PENÚLTIMO" (mesmo trimestre do ano anterior, para
    // comparação). Só o ÚLTIMO forma o TTM — o PENÚLTIMO duplicaria valores.
    const ordem = (l["ORDEM_EXERC"] ?? "").trim().toUpperCase();
    if (ordem === "PENÚLTIMO" || ordem === "PENULTIMO" || ordem === "2") return false;
    return true;
  });
  // Reposicionamentos (VERSAO maior) devem prevalecer: a deduplicação pelo
  // primeiro período preserva a versão mais recente.
  filtradas.sort((a, b) => (Number(b["VERSAO"]) || 0) - (Number(a["VERSAO"]) || 0));
  const porCnpj = new Map<string, LinhaCsv[]>();
  for (const l of filtradas) {
    const cnpj = (l["CNPJ_CIA"] ?? "").trim();
    if (!cnpj) continue;
    const lista = porCnpj.get(cnpj) ?? [];
    lista.push(l);
    porCnpj.set(cnpj, lista);
  }
  return [...porCnpj.entries()].flatMap(([, lista]) => lista);
}

const drePorAno = new Map<string, LinhaCsv[]>();

/** Série de lucro TTM de um CNPJ juntando os arquivos dos últimos anos. */
async function lucroTtmDoCnpj(cnpj: string): Promise<LinhaCsv[]> {
  try {
    const anoAtual = new Date().getFullYear();
    const anos = Array.from(
      { length: ANOS_HISTORIA },
      (_, i) => anoAtual - (ANOS_HISTORIA - 1 - i),
    );
    const series = await Promise.all(
      anos.map(async (ano) => {
        const chave = `${cnpj}:${ano}`;
        let linhas = drePorAno.get(chave) ?? [];
        if (!linhas.length) {
          linhas = (await dreDeAno(ano)).filter((l) => l["CNPJ_CIA"] === cnpj);
          if (linhas.length) drePorAno.set(chave, linhas);
        }
        return linhas;
      }),
    );
    return series.flat();
  } catch {
    return [];
  }
}

/** Dados Yahoo de um ticker: nome, preços brutos mensais e splits. */
type DadosYahoo = {
  nome: string;
  precos: { data: string; fechamento: number }[];
  splits: { data: number; fator: number }[];
};

function parsearSplits(eventos: {
  splits?: Record<string, { numerator: number; denominator: number }>;
}): { data: number; fator: number }[] {
  const saida: { data: number; fator: number }[] = [];
  for (const [chave, s] of Object.entries(eventos.splits ?? {})) {
    const epoch = Number(chave);
    if (!Number.isFinite(epoch) || !(s.denominator > 0)) continue;
    saida.push({ data: epoch * 1000, fator: s.numerator / s.denominator });
  }
  return saida.sort((a, b) => a.data - b.data);
}

/** Resposta do v8/finance/chart do Yahoo (o que o radar consome). */
type ResultadoChart = {
  chart?: {
    result?: Array<{
      meta?: { longName?: string };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      events?: { splits?: Record<string, { numerator: number; denominator: number }> };
    }>;
  };
};

async function buscarDadosYahoo(ticker: string): Promise<DadosYahoo | null> {
  const simbolo = simboloYahooB3(ticker);
  let chartPayload: ResultadoChart | null = null;

  for (const host of HOSTS_YAHOO) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
      simbolo,
    )}?range=8y&interval=1mo&events=div%2Csplit`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA_YAHOO },
        signal: controller.signal,
      });
      if (!res.ok) continue;
      chartPayload = (await res.json()) as ResultadoChart;
      break;
    } catch {
      /* próximo host */
    } finally {
      clearTimeout(timer);
    }
  }
  const r = chartPayload?.chart?.result?.[0];
  const precos: { data: string; fechamento: number }[] = [];
  if (r?.timestamp?.length) {
    const closes = r.indicators?.quote?.[0]?.close ?? [];
    for (let i = 0; i < r.timestamp.length; i++) {
      const fechamento = closes[i];
      if (typeof fechamento === "number" && Number.isFinite(fechamento) && fechamento > 0) {
        precos.push({
          data: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
          fechamento,
        });
      }
    }
  }
  const validos = precos.length >= 8 ? sanitizarPontos(precos).filter((p) => p.fechamento > 0) : [];
  if (validos.length < 12) return null;

  // Nome público do ticker vem no meta do próprio chart (o endpoint v7 de
  // quotes exige autenticação/401); as ações em circulação da classe vêm da
  // grade de ações cacheada, fora desta função.
  return {
    nome: r?.meta?.longName ?? ticker,
    precos: validos,
    splits: parsearSplits(r?.events ?? {}),
  };
}

function pontosDeFundamento(
  ticker: string,
  dados: DadosYahoo,
  cnpj: string | null,
  denominacao: string | null,
  lucro: LinhaCsv[],
  acoesClasse: number | null,
  plGrade: number | null,
): FundamentoCvm | null {
  if (acoesClasse === null || !(acoesClasse > 0)) return null;
  const serieLucro = serieDaConta(lucro, CONTA_LUCRO, CONTA_LUCRO_FALLBACK);
  const ttm = lucroTtmPorTrimestre(serieLucro);
  const { pontos, plAtual } = montarSeriePlReal({
    lucroTtm: ttm,
    precos: dados.precos,
    splits: dados.splits,
    acoesHoje: acoesClasse,
  });
  if (plAtual === null) return null;

  // Calibração da escala: ações da classe × lucro consolidado dão o nível
  // certo de P/L apenas até o fator de participação da classe (estável no
  // tempo). O percentil é rank-based (invariante à escala); o P/L exibido é
  // calibrado pelo P/L atual da grade (Brapi), que conhece a participação.
  let pontosPl = pontos.map((p) => p.pl);
  let plExibido = plAtual;
  if (plGrade !== null && Number.isFinite(plGrade) && plGrade > 0 && plAtual > 0) {
    const escala = plGrade / plAtual;
    pontosPl = pontosPl.map((pl) => pl * escala);
    plExibido = plGrade;
  }
  const percentilPl = percentilDistribucional(pontosPl, plExibido, MINIMO_PONTOS_PL);
  if (percentilPl === null) return null;
  return {
    ticker,
    cnpj,
    denominacao,
    percentilPl,
    plAtual: plExibido,
    pontosPl: pontos.map((p, i) => ({ periodo: p.periodo, pl: pontosPl[i] })),
    atualizadoEm: new Date().toISOString(),
  };
}

/** Mapa de fundamentos CVM (percentil de P/L real) com cache de 24h. */
export async function lerFundamentosCvm(): Promise<FundosCache> {
  if (mapaMemoria && Date.now() - mapaMemoria.em < TTL_MAPA_MEMORIA_MS) {
    return mapaMemoria.valor;
  }
  if (!mapaEmVoo) {
    mapaEmVoo = (async () => {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("cotacoes_cache")
          .select("payload, atualizado_em")
          .eq("categoria", "cvm:fundamentos")
          .maybeSingle();
        const cache: FundosCache = data?.payload
          ? (data.payload as unknown as FundosCache)
          : { mapa: {}, atualizadoEm: null };
        mapaMemoria = { valor: cache, em: Date.now() };
        return cache;
      } catch {
        const vazio: FundosCache = { mapa: {}, atualizadoEm: null };
        mapaMemoria = { valor: vazio, em: Date.now() };
        return vazio;
      }
    })().finally(() => {
      mapaEmVoo = null;
    });
  }
  return mapaEmVoo;
}

async function gravarFundamentosCvm(
  mapa: Record<string, FundamentoCvm>,
  adicionados: FundamentoCvm[],
) {
  if (!adicionados.length) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const f of adicionados) mapa[f.ticker] = f;
    const atualizado = new Date().toISOString();
    await supabaseAdmin.from("cotacoes_cache").upsert(
      {
        categoria: "cvm:fundamentos",
        payload: JSON.parse(JSON.stringify({ mapa, atualizadoEm: atualizado })),
        parcial: false,
        atualizado_em: atualizado,
      },
      { onConflict: "categoria" },
    );
    mapaMemoria = { valor: { mapa, atualizadoEm: atualizado }, em: Date.now() };
  } catch {
    /* best-effort: memória cobre a sessão */
  }
}

/**
 * Preenche os fundamentos CVM que faltam (ou estão vencidos há 7 dias) dos
 * tickers pedidos. Idempotente e autocontido: um download de arquivo por ano
 * (compartilhado), duas chamadas Yahoo por ticker. Retorna o que foi buscado.
 */
export async function atualizarFundamentosCvm(
  tickers: string[],
  limite = 30,
): Promise<{ buscados: number; obtidos: number }> {
  const unicos = [...new Set(tickers.map((t) => t.toUpperCase()).filter(Boolean))];
  if (!unicos.length) return { buscados: 0, obtidos: 0 };
  const { mapa } = await lerFundamentosCvm();
  const agora = Date.now();
  const faltantes = unicos.filter((t) => {
    const f = mapa[t];
    if (!f) return true;
    const frescor = Date.parse(f.atualizadoEm ?? "0");
    return !Number.isFinite(frescor) || agora - frescor > TTL_BANCO_MS;
  });
  const lote = faltantes.slice(0, limite);
  if (!lote.length) return { buscados: 0, obtidos: 0 };

  // Ações da classe e P/L de referência vêm da grade de ações (cacheada).
  const gradeMapa = new Map<
    string,
    { pl: number | null; valorMercado: number | null; preco: number | null }
  >();
  try {
    const grade = await (await import("@/lib/acoes.server")).gradeAcoesComCache().catch(() => null);
    for (const l of grade?.linhas ?? []) {
      gradeMapa.set(String(l.ticker).toUpperCase(), {
        pl: l.pl ?? null,
        valorMercado: l.valorMercado ?? null,
        preco: l.preco ?? null,
      });
    }
  } catch {
    /* sem grade: tickers ficam sem série (acoesClasse desconhecida) */
  }

  const fundamentos: Array<FundamentoCvm | null> = [];
  let emVoo = 0;
  const corridas: Promise<void>[] = [];
  for (const ticker of lote) {
    const g = gradeMapa.get(ticker);
    const preco = g?.preco ?? null;
    const acoesClasse =
      g !== undefined &&
      preco !== null &&
      preco > 0 &&
      g.valorMercado !== null &&
      g.valorMercado > 0
        ? g.valorMercado / preco
        : null;
    const plGrade = g?.pl ?? null;
    if (emVoo >= MAX_EM_VOO) await dormir(ESPERA_ENTRE_LOADS_MS);
    emVoo++;
    corridas.push(
      (async () => {
        try {
          if (!yahooEmVoo.has(ticker)) {
            const promessa = buscarDadosYahoo(ticker).finally(() => yahooEmVoo.delete(ticker));
            yahooEmVoo.set(ticker, promessa);
          }
          const dados = await yahooEmVoo.get(ticker);
          if (!dados) {
            fundamentos.push(null);
            return;
          }
          const empresas = await empresasDeAno();
          const emp = mapearEmpresaPorNome(dados.nome, empresas);
          const lucro = emp ? await lucroTtmDoCnpj(emp.cnpj) : [];
          const f = pontosDeFundamento(
            ticker,
            dados,
            emp?.cnpj ?? null,
            emp?.denominacao ?? null,
            lucro,
            acoesClasse,
            plGrade,
          );
          fundamentos.push(f);
        } catch {
          fundamentos.push(null);
        } finally {
          emVoo--;
        }
      })(),
    );
  }
  await Promise.allSettled(corridas);
  const obtidos = fundamentos.filter((f): f is FundamentoCvm => f !== null);
  await gravarFundamentosCvm(mapa, obtidos);
  return { buscados: lote.length, obtidos: obtidos.length };
}

function dormir(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Limite de taxa do backfill de fundamentos CVM (operação pesada): no
 *  máximo 3 chamadas por usuário a cada 10 minutos. Reusa o isolamento por
 *  usuário do radar. */
export async function limitePorUsuarioCvm(userId: string): Promise<boolean> {
  const { limitePorUsuario } = await import("@/lib/radar.server");
  return limitePorUsuario("cvm:fundamentos", userId, 3, 10 * 60_000);
}
