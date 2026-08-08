/**
 * Grade de índices e taxas de referência.
 *
 * Fontes:
 * - Yahoo Finance -> índices de bolsa (B3 e internacionais), com série diária
 *   de 1 ano usada para variação em 12 meses e sparkline de 30 dias.
 * - Banco Central (SGS) -> CDI (4389), Meta Selic (432) e IPCA (433), que são
 *   divulgados em frequência própria e não têm comportamento intradiário.
 */

import {
  INDICES,
  type DefIndice,
  type LinhaIndice,
  type RespostaIndices,
} from "@/lib/indices-base";

const PADRAO = { Accept: "application/json" } as const;
const CABECALHOS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
} as const;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const memoria = new Map<string, { expira: number; valor: unknown }>();

async function json<T>(
  url: string,
  ttlMs: number,
  headers: Record<string, string>,
): Promise<T | null> {
  const cache = memoria.get(url);
  if (cache && cache.expira > Date.now()) return cache.valor as T;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;
    const valor = (await res.json()) as T;
    memoria.set(url, { valor, expira: Date.now() + ttlMs });
    return valor;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * Índices de bolsa (Yahoo)
 * ------------------------------------------------------------------ */

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number };
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }>;
  };
};

/** Fila global: a fonte pública derruba rajadas simultâneas (HTTP 429). */
let ativos = 0;
let fila: Promise<unknown> = Promise.resolve();

async function yahoo(url: string, headers: Record<string, string>) {
  while (ativos >= 2) await fila.catch(() => undefined);
  ativos++;
  const p = (async () => {
    try {
      return await json<YahooChart>(url, 60_000, headers);
    } finally {
      await dormir(120);
      ativos--;
    }
  })();
  fila = p.catch(() => undefined);
  return p;
}

async function indiceBolsa(def: DefIndice): Promise<LinhaIndice> {
  const base: LinhaIndice = {
    codigo: def.codigo,
    nome: def.nome,
    categoria: def.categoria,
    tipo: "bolsa",
    descricao: def.descricao,
    valor: null,
    unidade: "pontos",
    variacaoDiaPercent: null,
    variacao12m: null,
    spark: [],
    divulgadoEm: null,
    extras: [],
    fonte: "Yahoo Finance",
  };

  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  for (const simbolo of def.simbolos ?? []) {
    for (let t = 0; t < 4; t++) {
      const host = hosts[t % hosts.length];
      const headers = t < 2 ? PADRAO : CABECALHOS;
      if (t > 0) await dormir(200 * t);
      const data = await yahoo(
        `https://${host}/v8/finance/chart/${encodeURIComponent(simbolo)}?range=1y&interval=1d`,
        headers,
      );
      const r = data?.chart?.result?.[0];
      const serie = (r?.indicators?.quote?.[0]?.close ?? []).filter(
        (v): v is number => typeof v === "number" && Number.isFinite(v),
      );
      const atual = r?.meta?.regularMarketPrice || serie.at(-1) || null;
      if (typeof atual !== "number" || atual === 0) continue;

      // Com faixa de 1 ano, o "chartPreviousClose" é o fechamento anterior à
      // janela inteira: o pregão anterior real é o penúltimo ponto da série.
      const anterior = serie.length > 1 ? serie.at(-2)! : (r?.meta?.previousClose ?? null);
      const primeiro = serie[0] ?? null;
      return {
        ...base,
        valor: atual,
        variacaoDiaPercent: anterior && anterior > 0 ? ((atual - anterior) / anterior) * 100 : null,
        variacao12m: primeiro && primeiro > 0 ? ((atual - primeiro) / primeiro) * 100 : null,
        spark: serie.slice(-30),

        extras: [
          { rotulo: "Fechamento anterior", valor: anterior ? formatarPontos(anterior) : "—" },
          { rotulo: "Mínima 12m", valor: serie.length ? formatarPontos(Math.min(...serie)) : "—" },
          { rotulo: "Máxima 12m", valor: serie.length ? formatarPontos(Math.max(...serie)) : "—" },
        ],
      };
    }
  }
  return base;
}

const formatarPontos = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ *
 * Taxas de referência (Banco Central / SGS)
 * ------------------------------------------------------------------ */

type PontoSgs = { data: string; valor: string };

/**
 * Série histórica do SGS por período: o endpoint "ultimos/N" aceita no máximo
 * 20 pontos, então consultamos por intervalo de datas (dd/mm/aaaa).
 */
async function serieSgs(codigo: number, mesesAtras: number): Promise<PontoSgs[]> {
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setMonth(inicio.getMonth() - mesesAtras);
  const br = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const dados = await json<PontoSgs[]>(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${br(inicio)}&dataFinal=${br(fim)}`,
    3 * 60 * 60_000,
    PADRAO,
  );
  return Array.isArray(dados) ? dados : [];
}

const num = (p?: PontoSgs) => (p ? Number(p.valor.replace(",", ".")) : null);

async function taxaReferencia(def: DefIndice): Promise<LinhaIndice> {
  const base: LinhaIndice = {
    codigo: def.codigo,
    nome: def.nome,
    categoria: def.categoria,
    tipo: "taxa",
    descricao: def.descricao,
    valor: null,
    unidade: "%",
    variacaoDiaPercent: null,
    variacao12m: null,
    spark: [],
    divulgadoEm: null,
    extras: [],
    fonte:
      def.codigo === "IPCA" ? "IBGE via Banco Central (SGS 433)" : `Banco Central (SGS ${def.sgs})`,
  };
  if (!def.sgs) return base;

  if (def.codigo === "IPCA") {
    const pontos = await serieSgs(433, 26);
    if (!pontos.length) return base;
    const valores = pontos.map((p) => num(p) ?? 0);
    const mes = valores.at(-1) ?? null;
    const acum = (janela: number[]) => (janela.reduce((a, v) => a * (1 + v / 100), 1) - 1) * 100;
    const acum12 = acum(valores.slice(-12));
    const acum12Anterior = valores.length >= 24 ? acum(valores.slice(-24, -12)) : null;
    return {
      ...base,
      valor: acum12,
      variacao12m: acum12Anterior !== null ? acum12 - acum12Anterior : null,
      spark: valores.slice(-12),
      divulgadoEm: pontos.at(-1)?.data ?? null,
      extras: [
        { rotulo: "IPCA do mês", valor: mes !== null ? `${formatarPontos(mes)}%` : "—" },
        { rotulo: "Acumulado 12m", valor: `${formatarPontos(acum12)}%` },
        { rotulo: "Referência", valor: pontos.at(-1)?.data ?? "—" },
      ],
    };
  }

  const pontos = await serieSgs(def.sgs, 13);
  if (!pontos.length) return base;
  const valores = pontos.map((p) => num(p) ?? 0);
  const atual = valores.at(-1) ?? null;
  const anoAtras = valores[0] ?? null;

  const rotulo = def.codigo === "SELIC" ? "Selic hoje" : "CDI hoje";
  return {
    ...base,
    valor: atual,
    variacao12m: atual !== null && anoAtras ? atual - anoAtras : null,
    spark: valores.slice(-60),
    divulgadoEm: pontos.at(-1)?.data ?? null,
    extras: [
      { rotulo, valor: atual !== null ? `${formatarPontos(atual)}% a.a.` : "—" },
      { rotulo: "Há 12 meses", valor: anoAtras ? `${formatarPontos(anoAtras)}% a.a.` : "—" },
      { rotulo: "Última divulgação", valor: pontos.at(-1)?.data ?? "—" },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * API do módulo
 * ------------------------------------------------------------------ */

let emVoo: Promise<RespostaIndices> | null = null;
let ultima: { valor: RespostaIndices; expira: number } | null = null;

async function coletar(): Promise<RespostaIndices> {
  const bolsa = INDICES.filter((i) => i.tipo === "bolsa");
  const taxas = INDICES.filter((i) => i.tipo === "taxa");

  const resultadosTaxas = await Promise.all(taxas.map(taxaReferencia));

  const resultadosBolsa: LinhaIndice[] = [];
  for (let i = 0; i < bolsa.length; i += 4) {
    resultadosBolsa.push(...(await Promise.all(bolsa.slice(i, i + 4).map(indiceBolsa))));
  }

  const mapa = new Map<string, LinhaIndice>();
  for (const l of [...resultadosTaxas, ...resultadosBolsa]) mapa.set(l.codigo, l);
  const linhas = INDICES.map((d) => mapa.get(d.codigo)!).filter(Boolean);

  return {
    linhas,
    atualizadoEm: new Date().toISOString(),
    parcial: linhas.some((l) => l.valor === null),
  };
}

/** Grade completa com cache curto compartilhado entre requisições. */
export async function buscarIndices(forcar = false): Promise<RespostaIndices> {
  if (!forcar && ultima && ultima.expira > Date.now()) return ultima.valor;
  if (emVoo) return emVoo;
  emVoo = (async () => {
    try {
      const valor = await coletar();
      // Mantém a última resposta boa se a coleta vier majoritariamente vazia.
      const validas = valor.linhas.filter((l) => l.valor !== null).length;
      if (validas === 0 && ultima) return ultima.valor;
      ultima = { valor, expira: Date.now() + 20_000 };
      return valor;
    } finally {
      emVoo = null;
    }
  })();
  return emVoo;
}
