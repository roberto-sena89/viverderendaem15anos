/**
 * Análise de carteira em estilo casa de análise:
 * - benchmark global (carteira vs Ibovespa vs IVVB11/global)
 * - exposição por moeda (BRL/USD/cripto)
 * - risco (volatilidade, drawdown, Sharpe) e diversificação
 */
import type { Ativo, Categoria } from "@/lib/portfolio";

export type MoedaExposicao = "BRL" | "USD" | "Cripto";

const MOEDA_POR_CATEGORIA: Partial<Record<Categoria, MoedaExposicao>> = {
  Stocks: "USD",
  REITs: "USD",
  "ETF (Global)": "USD",
  "ETF EUA": "USD",
  BDR: "USD",
  Criptomoedas: "Cripto",
};

export function moedaDaCategoria(categoria: Categoria): MoedaExposicao {
  return MOEDA_POR_CATEGORIA[categoria] ?? "BRL";
}

const ROTULO_MOEDA: Record<MoedaExposicao, string> = {
  BRL: "Brasil (R$)",
  USD: "Exterior (US$)",
  Cripto: "Criptoativos",
};

export interface ExposicaoMoeda {
  moeda: MoedaExposicao;
  valor: number;
  pct: number;
  rotulo: string;
}

/** Distribuição do patrimônio por moeda de exposição. */
export function exposicaoPorMoeda(ativos: Ativo[]): ExposicaoMoeda[] {
  const total = ativos.reduce((s, a) => s + a.quantidade * a.precoAtual, 0);
  if (total <= 0) return [];
  const porMoeda = new Map<MoedaExposicao, number>();
  for (const ativo of ativos) {
    const moeda = moedaDaCategoria(ativo.categoria);
    porMoeda.set(moeda, (porMoeda.get(moeda) ?? 0) + ativo.quantidade * ativo.precoAtual);
  }
  return (Object.keys(ROTULO_MOEDA) as MoedaExposicao[])
    .filter((moeda) => (porMoeda.get(moeda) ?? 0) > 0)
    .map((moeda) => ({
      moeda,
      valor: porMoeda.get(moeda) ?? 0,
      pct: (porMoeda.get(moeda) ?? 0) / total,
      rotulo: ROTULO_MOEDA[moeda],
    }))
    .sort((a, b) => b.valor - a.valor);
}

export interface RetornoPonderado {
  retornoPct: number | null; // retorno 12m % ponderado pelo valor atual
  coberturaPct: number; // fração do patrimônio com retorno conhecido
}

/**
 * Retorno 12m da carteira: média ponderada pelo valor atual dos ativos que
 * possuem retorno no mapa (tipicamente { ticker: "IVA" } do Yahoo).
 */
export function retornoPonderado12m(
  ativos: Ativo[],
  retornosPorTicker: Map<string, number | null>,
): RetornoPonderado {
  const total = ativos.reduce((s, a) => s + a.quantidade * a.precoAtual, 0);
  let somaPonderada = 0;
  let cobertura = 0;
  for (const ativo of ativos) {
    const chave = ativo.ticker.toUpperCase();
    const ret = retornosPorTicker.get(chave) ?? retornosPorTicker.get(`${chave}.SA`);
    if (ret === undefined || ret === null || !Number.isFinite(ret)) continue;
    const valor = ativo.quantidade * ativo.precoAtual;
    somaPonderada += valor * ret;
    cobertura += valor;
  }
  if (cobertura <= 0) return { retornoPct: null, coberturaPct: 0 };
  return {
    retornoPct: somaPonderada / cobertura,
    coberturaPct: total > 0 ? cobertura / total : 0,
  };
}

export interface BenchmarkGlobal {
  retornoCarteiraPct: number | null;
  retornoIbovPct: number | null;
  retornoGlobalPct: number | null; // IVVB11 / S&P500 como proxy
  excedenteIbovPct: number | null;
  excedenteGlobalPct: number | null;
  notaIbov: number; // 0-10
  notaGlobal: number; // 0-10
}

/**
 * Compara o retorno da carteira com benchmarks e gera notas (igual às notas
 * de desempenho: 5 + excedente × 0,25, limitado a 0..10).
 */
export function montarBenchmarkGlobal(
  retornoCarteiraPct: number | null,
  retornoIbovPct: number | null,
  retornoGlobalPct: number | null,
): BenchmarkGlobal {
  const nota = (excedente: number | null): number =>
    excedente === null ? 5 : Math.max(0, Math.min(10, 5 + excedente * 0.25));
  return {
    retornoCarteiraPct,
    retornoIbovPct,
    retornoGlobalPct,
    excedenteIbovPct:
      retornoCarteiraPct !== null && retornoIbovPct !== null
        ? retornoCarteiraPct - retornoIbovPct
        : null,
    excedenteGlobalPct:
      retornoCarteiraPct !== null && retornoGlobalPct !== null
        ? retornoCarteiraPct - retornoGlobalPct
        : null,
    notaIbov: nota(
      retornoCarteiraPct !== null && retornoIbovPct !== null
        ? retornoCarteiraPct - retornoIbovPct
        : null,
    ),
    notaGlobal: nota(
      retornoCarteiraPct !== null && retornoGlobalPct !== null
        ? retornoCarteiraPct - retornoGlobalPct
        : null,
    ),
  };
}

export interface MetricasRisco {
  volatilidadeAnualPct: number | null;
  drawdownMaximoPct: number | null;
  sharpe: number | null;
  melhorMesPct: number | null;
  piorMesPct: number | null;
  retornoAnualizadoPct: number | null;
  meses: number;
}

/**
 * Métricas de risco sobre série mensal de patrimônio (sem ajuste de aportes:
 * relatório simplificado). Sharpe usa retorno livre de risco anual (default 11%).
 */
export function metricasDeSerieMensal(
  serie: number[],
  retornoLivreRiscoAnualPct = 11,
): MetricasRisco {
  const retornos: number[] = [];
  for (let i = 1; i < serie.length; i++) {
    const anterior = serie[i - 1];
    if (anterior > 0) retornos.push(serie[i] / anterior - 1);
  }
  if (retornos.length === 0) {
    return {
      volatilidadeAnualPct: null,
      drawdownMaximoPct: null,
      sharpe: null,
      melhorMesPct: null,
      piorMesPct: null,
      retornoAnualizadoPct: null,
      meses: 0,
    };
  }
  const media = retornos.reduce((s, r) => s + r, 0) / retornos.length;
  const variancia = retornos.reduce((s, r) => s + (r - media) ** 2, 0) / retornos.length;
  const desvioMes = Math.sqrt(variancia);
  const volatilidadeAnual = desvioMes * Math.sqrt(12) * 100;
  let pico = serie[0];
  let drawdownMax = 0;
  for (const valor of serie) {
    if (valor > pico) pico = valor;
    if (pico > 0) drawdownMax = Math.max(drawdownMax, (pico - valor) / pico);
  }
  const retornoAnualizado = (1 + media) ** 12 - 1;
  const sharpe =
    volatilidadeAnual > 0
      ? (retornoAnualizado - retornoLivreRiscoAnualPct / 100) / (volatilidadeAnual / 100)
      : null;
  return {
    volatilidadeAnualPct: volatilidadeAnual,
    drawdownMaximoPct: drawdownMax * 100,
    sharpe,
    melhorMesPct: Math.max(...retornos) * 100,
    piorMesPct: Math.min(...retornos) * 100,
    retornoAnualizadoPct: retornoAnualizado * 100,
    meses: retornos.length,
  };
}

export interface Diversidade {
  hhi: number; // 0..1
  numEficaz: number; // 1/hhi: "ativos efetivos"
  indice: number; // 0..100
}

/**
 * Diversificação efetiva: número de ativos "puros" equivalentes (inverso do HHI).
 * Índice = min(100, numEficaz × 10) para uma régua prática.
 */
export function diversificacao(ativos: Ativo[]): Diversidade {
  const total = ativos.reduce((s, a) => s + a.quantidade * a.precoAtual, 0);
  if (total <= 0) return { hhi: 0, numEficaz: 0, indice: 0 };
  const hhi = ativos.reduce((s, a) => {
    const peso = (a.quantidade * a.precoAtual) / total;
    return s + peso * peso;
  }, 0);
  const numEficaz = 1 / hhi;
  return { hhi, numEficaz, indice: Math.round(Math.min(100, numEficaz * 10)) };
}
