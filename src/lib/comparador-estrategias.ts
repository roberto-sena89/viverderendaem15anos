/**
 * Comparador de Estratégias — projeta o mesmo plano com diferentes alocações
 * (conservador, moderado, agressivo, dividendos, Selic alta) e mostra qual
 * leva à independência financeira mais rápido.
 */

import { type PlanoConfig, type ProjecaoAno } from "@/lib/portfolio";
import { resumirCenario } from "@/lib/cenarios";

export interface Estrategia {
  id: string;
  rotulo: string;
  descricao: string;
  rentabilidadeAnual: number;
  cor: string;
}

export const ESTRATEGIAS: Estrategia[] = [
  {
    id: "conservador",
    rotulo: "Conservador",
    descricao: "RF 80% + RV 20% — retorno menor, mais previsível.",
    rentabilidadeAnual: 8,
    cor: "var(--color-chart-4)",
  },
  {
    id: "moderado",
    rotulo: "Moderado",
    descricao: "RF 50% + RV 50% — equilíbrio entre risco e retorno.",
    rentabilidadeAnual: 10,
    cor: "var(--color-chart-3)",
  },
  {
    id: "agressivo",
    rotulo: "Agressivo",
    descricao: "RF 20% + RV 80% — maior retorno potencial, mais volatilidade.",
    rentabilidadeAnual: 13,
    cor: "var(--color-chart-2)",
  },
  {
    id: "dividendos",
    rotulo: "Foco em Dividendos",
    descricao: "FIIs + ações de DY alto — renda passiva crescente.",
    rentabilidadeAnual: 9,
    cor: "var(--color-chart-1)",
  },
  {
    id: "selic-alta",
    rotulo: "Cenário Selic Alta",
    descricao: "Juros altos persistentes — rentabilidade elevada.",
    rentabilidadeAnual: 15,
    cor: "var(--color-chart-5)",
  },
];

export interface ResultadoEstrategia {
  estrategia: Estrategia;
  linhas: ProjecaoAno[];
  patrimonioFinal: number;
  patrimonioRealFinal: number;
  rendaPassivaMensal: number;
  anoIndependencia: number | null;
  idadeIndependencia: number | null;
  totalAportado: number;
}

export interface ComparacaoEstrategias {
  base: {
    patrimonioAtual: number;
    aporteMensal: number;
    aumentoAnual: number;
    inflacaoAnual: number;
    taxaRetirada: number;
    idadeAtual: number;
    idadeAposentadoria: number;
    objetivoRendaMensal: number;
  };
  resultados: ResultadoEstrategia[];
}

/**
 * Compara as estratégias com o mesmo plano de aportes, variando apenas a
 * rentabilidade (proxy da alocação).
 */
export function compararEstrategias(
  plano: PlanoConfig & { patrimonioAtual: number },
  objetivoRendaMensal: number,
): ComparacaoEstrategias {
  const resultados: ResultadoEstrategia[] = ESTRATEGIAS.map((estrategia) => {
    const input: PlanoConfig & { patrimonioAtual: number } = {
      ...plano,
      rentabilidadeAnual: estrategia.rentabilidadeAnual,
    };
    const resumo = resumirCenario({
      id: estrategia.id,
      nome: estrategia.rotulo,
      criadoEm: new Date().toISOString(),
      input,
      objetivoRenda: objetivoRendaMensal,
    });
    const final = resumo.linhas[resumo.linhas.length - 1];
    return {
      estrategia,
      linhas: resumo.linhas,
      patrimonioFinal: resumo.patrimonioFinal,
      patrimonioRealFinal: final?.patrimonioReal ?? 0,
      rendaPassivaMensal: resumo.rendaPassiva,
      anoIndependencia: resumo.anoIndependencia,
      idadeIndependencia: resumo.idadeIndependencia,
      totalAportado: resumo.totalAportado,
    };
  });

  return {
    base: {
      patrimonioAtual: plano.patrimonioAtual,
      aporteMensal: plano.aporteMensal,
      aumentoAnual: plano.aumentoAnual,
      inflacaoAnual: plano.inflacaoAnual,
      taxaRetirada: plano.taxaRetirada,
      idadeAtual: plano.idadeAtual,
      idadeAposentadoria: plano.idadeAposentadoria,
      objetivoRendaMensal,
    },
    resultados,
  };
}

/** Ordena estratégias por quem chega primeiro à independência. */
export function rankearEstrategias(resultados: ResultadoEstrategia[]): ResultadoEstrategia[] {
  return [...resultados].sort((a, b) => {
    const anoA = a.anoIndependencia ?? Number.POSITIVE_INFINITY;
    const anoB = b.anoIndependencia ?? Number.POSITIVE_INFINITY;
    if (anoA !== anoB) return anoA - anoB;
    return b.patrimonioRealFinal - a.patrimonioRealFinal;
  });
}
