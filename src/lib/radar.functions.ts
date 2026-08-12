/**
 * Radar — server functions (TanStack Start). Camada fina que combina as
 * grades vivas, posições históricas, série para gráfico, notícias de alto
 * impacto, contexto macro e a IA. Segue o padrão do app: createServerFn +
 * inputValidator + import lazy.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LinhaAcao } from "@/lib/acoes-base";
import type { LinhaFii } from "@/lib/fiis-base";
import type {
  AnaliseIA,
  LinhaRadarBase,
  PosicaoHistorica,
  PosicaoSerie,
  RespostaBacktest,
} from "@/lib/radar.server";
import { scoreOportunidade, sinalRadar } from "@/lib/radar-base";

export type { AnaliseIA, LinhaRadarBase, PosicaoHistorica, PosicaoSerie, RespostaBacktest };

/** Resposta de posições: posição histórica + mini-série para sparkline. */
export interface RadarPosicoesResposta {
  posicoes: Record<string, PosicaoHistorica>;
  sparklines: Record<string, number[]>;
}

export interface NoticiaResumo {
  id: string;
  titulo: string;
  fonte: string;
  publicadoEm: string;
  urgente: boolean;
}

export interface RadarVisao {
  categoria: "acao" | "fii";
  linhas: LinhaRadarBase[];
  noticiasImpacto: Record<string, NoticiaResumo[]>;
  noticiasUrgentes: NoticiaResumo[];
  macro: { selic: number | null; ipca: number | null };
  atualizado: string | null;
  baseEm: string | null;
  posicoesCacheadasEm: string | null;
  contagem: {
    total: number;
    comPosicao: number;
    comprar: number;
    manter: number;
    vender: number;
    observar: number;
    /** Ativos com preço dentro de 5% da mínima de 52 semanas. */
    minimas52: number;
  };
}

/** Ficha fundamentalista completa (união de ação e FII, campos opcionais). */
export interface DetalheFundamentos {
  ticker: string;
  nome: string;
  categoria: "acao" | "fii";
  logo: string | null;
  tipo: string | null;
  setor: string | null;
  subsetor: string | null;
  segmento: string | null;
  preco: number | null;
  fechamentoAnterior: number | null;
  variacaoPercent: number | null;
  volume: number | null;
  valorMercado: number | null;
  liquidez: number | null;
  patrimonio: number | null;
  lucro: number | null;
  receita: number | null;
  pl: number | null;
  pvp: number | null;
  psr: number | null;
  evEbit: number | null;
  dy12: number | null;
  roe: number | null;
  roic: number | null;
  margemLiquida: number | null;
  margemEbit: number | null;
  dividaPatrimonio: number | null;
  crescReceita5a: number | null;
  lpa: number | null;
  vpa: number | null;
  precoTetoBazin: number | null;
  upsideBazin: number | null;
  precoJustoGraham: number | null;
  upsideGraham: number | null;
  pontuacao: number | null;
  vacancia: number | null;
  capRate: number | null;
}

export interface RadarDetalhe {
  ticker: string;
  fundamentos: DetalheFundamentos | null;
  serie: PosicaoSerie | null;
  posicao: PosicaoHistorica | null;
  noticias: NoticiaResumo[];
}

/** Visão completa do radar para uma categoria: linhas + sinais + notícias. */
export const radarVisao = createServerFn({ method: "GET" })
  .inputValidator((d: { categoria?: unknown } | undefined) => ({
    categoria: d?.categoria === "fii" ? ("fii" as const) : ("acao" as const),
  }))
  .handler(async ({ data }: { data: { categoria: "acao" | "fii" } }): Promise<RadarVisao> => {
    const radarFx = await import("@/lib/radar.server");
    const cvmServer = await import("@/lib/cvm.server");
    const gradeEmAndamento =
      data.categoria === "acao"
        ? (await import("@/lib/acoes.server")).gradeAcoesComCache()
        : (await import("@/lib/fiis.server")).gradeFiisComCache();
    const noticiasMod = await import("@/lib/noticias.server");

    const vazioCvm = {
      mapa: {} as Record<string, import("@/lib/cvm.server").FundamentoCvm>,
      atualizadoEm: null as string | null,
    };
    const [grade, banco, noticias, macro, fundamentosCvm] = await Promise.all([
      gradeEmAndamento,
      radarFx.lerPosicoesBanco(),
      noticiasMod.agregarNoticias().catch(() => []),
      radarFx.contextoMacro(),
      cvmServer.lerFundamentosCvm().catch(() => vazioCvm),
    ]);

    const noticiasPorTicker = new Map<string, NoticiaResumo[]>();
    for (const n of noticias) {
      for (const t of n.tickers) {
        const lista = noticiasPorTicker.get(t.toUpperCase()) ?? [];
        lista.push({
          id: n.id,
          titulo: n.titulo,
          fonte: n.fonte,
          publicadoEm: n.publicadoEm,
          urgente: n.urgente,
        });
        noticiasPorTicker.set(t.toUpperCase(), lista);
      }
    }

    const noticiasUrgentes = noticias
      .filter((n) => n.urgente)
      .sort((a, b) => new Date(b.publicadoEm).getTime() - new Date(a.publicadoEm).getTime())
      .slice(0, 6)
      .map((n) => ({
        id: n.id,
        titulo: n.titulo,
        fonte: n.fonte,
        publicadoEm: n.publicadoEm,
        urgente: true,
      }));

    const posicoes = banco.posicoes;
    const contagem: RadarVisao["contagem"] = {
      total: 0,
      comPosicao: 0,
      comprar: 0,
      manter: 0,
      vender: 0,
      observar: 0,
      minimas52: 0,
    };
    const linhas: LinhaRadarBase[] = [];

    for (const raw of grade.linhas) {
      const ticker = raw.ticker.toUpperCase();
      const posicao = posicoes[ticker] ?? null;
      const noticiasDoTicker = (noticiasPorTicker.get(ticker) ?? []).sort((a, b) =>
        b.publicadoEm.localeCompare(a.publicadoEm),
      );
      const sinal = sinalRadar({
        variacaoDia: raw.variacaoPercent ?? null,
        dy12: raw.dy12 ?? null,
        pvp: raw.pvp ?? null,
        percentil: posicao?.percentil ?? null,
        noticiaImpacto: noticiasDoTicker.some((n) => n.urgente),
      });
      const score = scoreOportunidade({
        percentil: posicao?.percentil ?? null,
        dy12: raw.dy12 ?? null,
        drawdownMaximoPct: posicao?.drawdownMaximoPct ?? null,
        noticiaImpacto: noticiasDoTicker.some((n) => n.urgente),
      });

      contagem.total++;
      if (posicao) {
        contagem.comPosicao++;
        if (posicao.distMinima52sPct !== null && posicao.distMinima52sPct <= 5)
          contagem.minimas52++;
      }
      if (sinal.tipo !== "sem-dados") contagem[sinal.tipo as keyof typeof contagem]++;

      linhas.push({
        ticker,
        nome: raw.nome,
        categoria: data.categoria,
        tipo: "tipo" in raw ? (raw.tipo ?? null) : null,
        setor:
          data.categoria === "acao"
            ? "setor" in raw
              ? (raw.setor ?? null)
              : null
            : "tipo" in raw
              ? (raw.tipo ?? null)
              : null,
        logo: raw.logo ?? null,
        preco: raw.preco ?? null,
        variacaoDia: raw.variacaoPercent ?? null,
        dy12: raw.dy12 ?? null,
        pvp: raw.pvp ?? null,
        pl: "pl" in raw ? (raw.pl ?? null) : null,
        posicao,
        sinal,
        score,
        fundamentos: "pontuacao" in raw ? (raw.pontuacao ?? null) : null,
        liquidez: "liquidez" in raw ? (raw.liquidez ?? null) : null,
        dividaPatrimonio: "dividaPatrimonio" in raw ? (raw.dividaPatrimonio ?? null) : null,
        margemLiquida: "margemLiquida" in raw ? (raw.margemLiquida ?? null) : null,
        selic: macro.selic,
        consistenciaDividendos: null,
        percentilPlReal: fundamentosCvm.mapa[ticker]?.percentilPl ?? null,
        percentilEvEbitReal: fundamentosCvm.mapa[ticker]?.percentilEvEbit ?? null,
        evEbitReal: fundamentosCvm.mapa[ticker]?.evEbit ?? null,
        dividaLiquidaReal: fundamentosCvm.mapa[ticker]?.dividaLiquida ?? null,
      });
    }

    return {
      categoria: data.categoria,
      linhas,
      noticiasImpacto: Object.fromEntries(
        [...noticiasPorTicker.entries()].map(([t, v]) => [t, v.slice(0, 5)]),
      ),
      noticiasUrgentes,
      macro,
      atualizado: grade.atualizadoEm ?? null,
      baseEm: grade.baseEm ?? null,
      posicoesCacheadasEm: banco.atualizadoEm,
      contagem,
    };
  });

/** Posições históricas dos tickers pedidos — busca só o que falta no cache. */
export const radarPosicoes = createServerFn({ method: "GET" })
  .inputValidator((d: { tickers?: unknown } | undefined) => ({
    tickers: Array.isArray(d?.tickers)
      ? [...new Set(d.tickers.map((t) => String(t).trim().toUpperCase()))].slice(0, 120)
      : [],
  }))
  .handler(async ({ data }): Promise<RadarPosicoesResposta> => {
    if (!data.tickers.length) return { posicoes: {}, sparklines: {} };
    const radarFx = await import("@/lib/radar.server");
    // A posição pode vir da memória ou do cache compartilhado (radar:posicao);
    // só busca no Yahoo o que realmente não está salvo. Sem o mapa do banco,
    // cada request em isolate frio rebuscaria a página inteira no Yahoo.
    const [posicoes, sparklines] = await Promise.all([
      (async () => {
        const banco = await radarFx.lerPosicoesBanco();
        return radarFx.posicoesParaTickers(data.tickers, banco.posicoes);
      })(),
      radarFx.sparklinesParaTickers(data.tickers),
    ]);
    return { posicoes, sparklines };
  });

/** Série semanal (desde o início) para o gráfico de um ativo. */
export const radarSerie = createServerFn({ method: "GET" })
  .inputValidator((d: { ticker?: unknown } | undefined) => ({
    ticker: typeof d?.ticker === "string" ? d.ticker.trim().toUpperCase().slice(0, 12) : "",
  }))
  .handler(async ({ data }): Promise<PosicaoSerie | null> => {
    if (!data.ticker) return null;
    const radarFx = await import("@/lib/radar.server");
    return radarFx.serieParaGrafico(data.ticker);
  });

/** Ficha fundamentalista completa a partir da linha da grade (ação ou FII). */
function construirFundamentos(
  ticker: string,
  categoria: "acao" | "fii",
  raw: LinhaAcao | LinhaFii,
): DetalheFundamentos {
  if (categoria === "acao") {
    const a = raw as LinhaAcao;
    return {
      ticker,
      nome: a.nome,
      categoria,
      logo: a.logo ?? null,
      tipo: null,
      setor: a.setor ?? null,
      subsetor: a.subsetor ?? null,
      segmento: a.segmento ?? null,
      preco: a.preco ?? null,
      fechamentoAnterior: a.fechamentoAnterior ?? null,
      variacaoPercent: a.variacaoPercent ?? null,
      volume: a.volume ?? null,
      valorMercado: a.valorMercado ?? null,
      liquidez: a.liquidez ?? null,
      patrimonio: a.patrimonio ?? null,
      lucro: a.lucro ?? null,
      receita: a.receita ?? null,
      pl: a.pl ?? null,
      pvp: a.pvp ?? null,
      psr: a.psr ?? null,
      evEbit: a.evEbit ?? null,
      dy12: a.dy12 ?? null,
      roe: a.roe ?? null,
      roic: a.roic ?? null,
      margemLiquida: a.margemLiquida ?? null,
      margemEbit: a.margemEbit ?? null,
      dividaPatrimonio: a.dividaPatrimonio ?? null,
      crescReceita5a: a.crescReceita5a ?? null,
      lpa: a.lpa ?? null,
      vpa: a.vpa ?? null,
      precoTetoBazin: a.precoTetoBazin ?? null,
      upsideBazin: a.upsideBazin ?? null,
      precoJustoGraham: a.precoJustoGraham ?? null,
      upsideGraham: a.upsideGraham ?? null,
      pontuacao: a.pontuacao ?? null,
      vacancia: null,
      capRate: null,
    };
  }
  const f = raw as LinhaFii;
  return {
    ticker,
    nome: f.nome,
    categoria,
    logo: f.logo ?? null,
    tipo: f.tipo,
    setor: null,
    subsetor: null,
    segmento: f.segmento ?? null,
    preco: f.preco ?? null,
    fechamentoAnterior: f.fechamentoAnterior ?? null,
    variacaoPercent: f.variacaoPercent ?? null,
    volume: f.volume ?? null,
    valorMercado: f.valorMercado ?? null,
    liquidez: f.liquidez ?? null,
    patrimonio: f.patrimonio ?? null,
    lucro: null,
    receita: null,
    pl: null,
    pvp: f.pvp ?? null,
    psr: null,
    evEbit: null,
    dy12: f.dy12 ?? null,
    roe: null,
    roic: null,
    margemLiquida: null,
    margemEbit: null,
    dividaPatrimonio: null,
    crescReceita5a: null,
    lpa: null,
    vpa: f.vpa ?? null,
    precoTetoBazin: null,
    upsideBazin: null,
    precoJustoGraham: null,
    upsideGraham: null,
    pontuacao: null,
    vacancia: f.vacancia ?? null,
    capRate: f.capRate ?? null,
  };
}

/** Ficha completa de um ativo: fundamentos + série + posição + notícias. */
export const radarDetalhe = createServerFn({ method: "GET" })
  .inputValidator((d: { ticker?: unknown } | undefined) => ({
    ticker: typeof d?.ticker === "string" ? d.ticker.trim().toUpperCase().slice(0, 12) : "",
  }))
  .handler(async ({ data }): Promise<RadarDetalhe | null> => {
    if (!data.ticker) return null;
    const radarFx = await import("@/lib/radar.server");
    // Só a grade da categoria do ticker (FIIs terminam em 11): carregar as
    // duas grades a cada clique era o dobro de custo (Brapi/Fundamentus).
    const ehFii = /11$/i.test(data.ticker);
    const [serie, posicoes, grades, noticiasMod] = await Promise.all([
      radarFx.serieParaGrafico(data.ticker),
      radarFx.posicoesParaTickers([data.ticker]),
      (async (): Promise<{ linhas: Array<LinhaAcao | LinhaFii> }> => {
        try {
          const linhas = ehFii
            ? (await (await import("@/lib/fiis.server")).gradeFiisComCache()).linhas
            : (await (await import("@/lib/acoes.server")).gradeAcoesComCache()).linhas;
          return { linhas };
        } catch {
          return { linhas: [] };
        }
      })(),
      import("@/lib/noticias.server").catch(() => null),
    ]);
    const raw = grades.linhas.find((l) => l.ticker.toUpperCase() === data.ticker) ?? null;
    const fundamentos = raw ? construirFundamentos(data.ticker, ehFii ? "fii" : "acao", raw) : null;
    const noticias = noticiasMod ? await noticiasMod.agregarNoticias().catch(() => []) : [];

    const noticiasDoAtivo = noticias
      .filter((n) => n.tickers.some((t) => t.toUpperCase() === data.ticker))
      .sort((a, b) => new Date(b.publicadoEm).getTime() - new Date(a.publicadoEm).getTime())
      .slice(0, 6)
      .map((n) => ({
        id: n.id,
        titulo: n.titulo,
        fonte: n.fonte,
        publicadoEm: n.publicadoEm,
        urgente: n.urgente,
      }));

    return {
      ticker: data.ticker,
      fundamentos,
      serie,
      posicao: posicoes[data.ticker] ?? null,
      noticias: noticiasDoAtivo,
    };
  });

export interface ResultadoAnaliseIA {
  analise: AnaliseIA | null;
  erro?: string | null;
}

/** Análise gerada pelo Técnico IA para um ativo (cache de 72h no servidor).
 *  Autenticado: geração de análise consome cota paga de LLM. */
export const radarAnaliseIA = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticker?: unknown; forcar?: unknown } | undefined) => ({
    ticker: typeof d?.ticker === "string" ? d.ticker.trim().toUpperCase().slice(0, 12) : "",
    forcar: d?.forcar === true,
  }))
  .handler(
    async ({
      context,
      data,
    }: {
      context: { userId: string };
      data: { ticker: string; forcar: boolean };
    }): Promise<ResultadoAnaliseIA> => {
      if (!data.ticker) return { analise: null, erro: null };
      const radarServer = await import("@/lib/radar.server");
      if (!data.forcar) {
        const cache = await radarServer.lerAnaliseIA(data.ticker).catch(() => null);
        if (cache) return { analise: cache };
      }
      if (!radarServer.limitePorUsuario("radar:ia", context.userId, 10, 10 * 60_000)) {
        return {
          analise: null,
          erro: "Muitas análises em pouco tempo. Aguarde alguns minutos e tente de novo.",
        };
      }
      const lovableApiKey = process.env.LOVABLE_API_KEY;
      if (!lovableApiKey) {
        return {
          analise: null,
          erro: "A geração de IA não está configurada neste ambiente. Peça ao administrador para definir a chave LOVABLE_API_KEY.",
        };
      }
      try {
        const analise = await radarServer.gerarAnaliseIA(data.ticker, lovableApiKey);
        return {
          analise,
          erro: analise
            ? null
            : "O Técnico IA não conseguiu montar a análise agora. Tente novamente em instantes.",
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro desconhecido";
        console.error(`Radar IA falhou para ${data.ticker}:`, e);
        return {
          analise: null,
          erro: `Falha ao gerar a análise: ${msg}`,
        };
      }
    },
  );

/** Histórico do Técnico IA para um ativo (da mais recente para a mais antiga). */
export const radarHistoricoIA = createServerFn({ method: "GET" })
  .inputValidator((d: { ticker?: unknown } | undefined) => ({
    ticker: typeof d?.ticker === "string" ? d.ticker.trim().toUpperCase().slice(0, 12) : "",
  }))
  .handler(async ({ data }): Promise<AnaliseIA[]> => {
    if (!data.ticker) return [];
    const radarServer = await import("@/lib/radar.server");
    return radarServer.lerHistoricoIA(data.ticker);
  });

/** Preenche em lotes o histórico que falta no universo da categoria (idempotente).
 *  Autenticado + limitado: cada chamada pode disparar até 120 fetches ao Yahoo. */
export const radarCompletarCache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { categoria?: unknown; limite?: unknown } | undefined) => ({
    categoria: d?.categoria === "fii" ? ("fii" as const) : ("acao" as const),
    limite: Number.isFinite(Number(d?.limite))
      ? Math.min(300, Math.max(1, Math.floor(Number(d?.limite))))
      : 120,
  }))
  .handler(
    async ({
      context,
      data,
    }: {
      context: { userId: string };
      data: { categoria: "acao" | "fii"; limite: number };
    }): Promise<{ buscados: number; obtidos: number; faltam: number }> => {
      const radarServer = await import("@/lib/radar.server");
      if (!radarServer.limitePorUsuario("radar:backfill", context.userId, 30, 5 * 60_000)) {
        return { buscados: 0, obtidos: 0, faltam: 0 };
      }
      return radarServer.completarFaltasRadar(data.categoria, data.limite);
    },
  );

/** Backtest do sinal do radar para um ativo (+ buy-and-hold do Ibovespa via BOVA11). */
export const radarBacktest = createServerFn({ method: "GET" })
  .inputValidator((d: { ticker?: unknown } | undefined) => ({
    ticker: typeof d?.ticker === "string" ? d.ticker.trim().toUpperCase().slice(0, 12) : "",
  }))
  .handler(async ({ data }): Promise<RespostaBacktest | null> => {
    if (!data.ticker) return null;
    const radarServer = await import("@/lib/radar.server");
    return radarServer.backtestRadarAtivo(data.ticker);
  });

/** Preenche o percentil de P/L real (CVM) dos tickers da grade de ações.
 *  Autenticado + limitado: cada chamada baixa arquivos da CVM (compartilhados
 *  entre tickers) e faz 2 fetches Yahoo por ticker. Idempotente: só busca
 *  quem está sem fundamento ou com mais de 7 dias. */
export const cvmCompletarCache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limite?: unknown } | undefined) => ({
    limite: Number.isFinite(Number(d?.limite))
      ? Math.min(60, Math.max(1, Math.floor(Number(d?.limite))))
      : 30,
  }))
  .handler(
    async ({
      context,
      data,
    }: {
      context: { userId: string };
      data: { limite: number };
    }): Promise<{ buscados: number; obtidos: number; faltam: number }> => {
      const cvmServer = await import("@/lib/cvm.server");
      if (!(await cvmServer.limitePorUsuarioCvm(context.userId))) {
        return { buscados: 0, obtidos: 0, faltam: 0 };
      }
      const grade = await (
        await import("@/lib/acoes.server")
      )
        .gradeAcoesComCache()
        .catch(() => null);
      const tickers = (grade?.linhas ?? []).map((l: { ticker: string }) => l.ticker.toUpperCase());
      const { buscados, obtidos } = await cvmServer.atualizarFundamentosCvm(tickers, data.limite);
      return { buscados, obtidos, faltam: Math.max(0, tickers.length - obtidos) };
    },
  );
