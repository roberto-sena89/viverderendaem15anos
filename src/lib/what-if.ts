/**
 * Simulador "E se?" — cenários de quebra-hipótese sobre o plano financeiro.
 *
 * Cada cenário altera um único parâmetro do plano atual e reprojeta o
 * patrimônio, mostrando o impacto na data da independência financeira.
 * Lógica pura (client-safe), construída sobre `projetar`/`cenarios`.
 */

import { projetar, type PlanoConfig, type ProjecaoAno } from "@/lib/portfolio";
import { resumirCenario } from "@/lib/cenarios";

export interface CenarioQuebra {
  id: string;
  rotulo: string;
  descricao: string;
  icone:
    | "trending-up"
    | "trending-down"
    | "pause"
    | "arrow-up"
    | "arrow-down"
    | "flame"
    | "calendar"
    | "target";
  altera: Partial<PlanoConfig>;
}

export interface ResultadoQuebra {
  cenario: CenarioQuebra;
  linhas: ProjecaoAno[];
  patrimonioFinal: number;
  rendaPassivaMensal: number;
  anoIndependencia: number | null;
  idadeIndependencia: number | null;
  /** Diferença em anos vs. o plano base (negativo = chegou antes). */
  deltaAnos: number | null;
}

export interface SimulacaoQuebra {
  base: {
    anoIndependencia: number | null;
    idadeIndependencia: number | null;
    patrimonioFinal: number;
    rendaPassivaMensal: number;
  };
  cenarios: ResultadoQuebra[];
}

/**
 * Gera os cenários "E se?" a partir do plano atual.
 * `objetivoRendaMensal` é usado para calcular o patrimônio necessário.
 */
export function gerarCenariosQuebra(
  plano: PlanoConfig & { patrimonioAtual: number },
  _objetivoRendaMensal: number,
): CenarioQuebra[] {
  const { aporteMensal, rentabilidadeAnual, inflacaoAnual, idadeAposentadoria } = plano;
  const brl = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  return [
    {
      id: "aporte-dobrado",
      rotulo: "Aportar o dobro",
      descricao: `Aporte mensal sobe para R$ ${brl(aporteMensal * 2)}.`,
      icone: "trending-up",
      altera: { aporteMensal: aporteMensal * 2 },
    },
    {
      id: "aporte-metade",
      rotulo: "Aportar metade",
      descricao: `Aporte mensal cai para R$ ${brl(Math.round(aporteMensal / 2))}.`,
      icone: "trending-down",
      altera: { aporteMensal: Math.round(aporteMensal / 2) },
    },
    {
      id: "parar-aportes",
      rotulo: "Parar de aportar",
      descricao: "Sem novos aportes — só o patrimônio rende.",
      icone: "pause",
      altera: { aporteMensal: 0 },
    },
    {
      id: "selic-alta",
      rotulo: "Rentabilidade +3%",
      descricao: `Retorno anual sobe de ${rentabilidadeAnual}% para ${rentabilidadeAnual + 3}%.`,
      icone: "arrow-up",
      altera: { rentabilidadeAnual: rentabilidadeAnual + 3 },
    },
    {
      id: "selic-baixa",
      rotulo: "Rentabilidade -3%",
      descricao: `Retorno anual cai de ${rentabilidadeAnual}% para ${Math.max(2, rentabilidadeAnual - 3)}%.`,
      icone: "arrow-down",
      altera: { rentabilidadeAnual: Math.max(2, rentabilidadeAnual - 3) },
    },
    {
      id: "inflacao-alta",
      rotulo: "Inflação +2%",
      descricao: `Inflação anual sobe para ${inflacaoAnual + 2}%.`,
      icone: "flame",
      altera: { inflacaoAnual: inflacaoAnual + 2 },
    },
    {
      id: "aposentar-cedo",
      rotulo: "Aposentar 5 anos antes",
      descricao: `Meta de aposentadoria aos ${Math.max(idadeAposentadoria - 5, 18)} anos.`,
      icone: "calendar",
      altera: { idadeAposentadoria: Math.max(idadeAposentadoria - 5, 18) },
    },
    {
      id: "aposentar-tarde",
      rotulo: "Aposentar 5 anos depois",
      descricao: `Meta de aposentadoria aos ${idadeAposentadoria + 5} anos.`,
      icone: "target",
      altera: { idadeAposentadoria: idadeAposentadoria + 5 },
    },
    {
      id: "taxa-retirada-3",
      rotulo: "Retirada conservadora (3%)",
      descricao: "Reduz a taxa de retirada para 3% — patrimônio necessário maior.",
      icone: "trending-down",
      altera: { taxaRetirada: 3 },
    },
    {
      id: "taxa-retirada-5",
      rotulo: "Retirada agressiva (5%)",
      descricao: "Aumenta a taxa de retirada para 5% — independência mais cedo, mais risco.",
      icone: "trending-up",
      altera: { taxaRetirada: 5 },
    },
  ];
}

/**
 * Roda todos os cenários e compara com o plano base.
 */
export function simularQuebra(
  plano: PlanoConfig & { patrimonioAtual: number },
  objetivoRendaMensal: number,
): SimulacaoQuebra {
  const cenarios = gerarCenariosQuebra(plano, objetivoRendaMensal);
  const baseResumo = resumirCenario({
    id: "base",
    nome: "Plano atual",
    criadoEm: new Date().toISOString(),
    input: { ...plano },
    objetivoRenda: objetivoRendaMensal,
  });

  const base = {
    anoIndependencia: baseResumo.anoIndependencia,
    idadeIndependencia: baseResumo.idadeIndependencia,
    patrimonioFinal: baseResumo.patrimonioFinal,
    rendaPassivaMensal: baseResumo.rendaPassiva,
  };

  const cenariosResultado: ResultadoQuebra[] = cenarios.map((cenario) => {
    const input = { ...plano, ...cenario.altera };
    const resumo = resumirCenario({
      id: cenario.id,
      nome: cenario.rotulo,
      criadoEm: new Date().toISOString(),
      input,
      objetivoRenda: objetivoRendaMensal,
    });
    return {
      cenario,
      linhas: resumo.linhas,
      patrimonioFinal: resumo.patrimonioFinal,
      rendaPassivaMensal: resumo.rendaPassiva,
      anoIndependencia: resumo.anoIndependencia,
      idadeIndependencia: resumo.idadeIndependencia,
      deltaAnos:
        resumo.anoIndependencia != null && base.anoIndependencia != null
          ? resumo.anoIndependencia - base.anoIndependencia
          : null,
    };
  });

  return { base, cenarios: cenariosResultado };
}

/** Projeção única com plano alterado (usada pelo comparador de estratégias). */
export function projetarComPlano(
  plano: PlanoConfig & { patrimonioAtual: number },
  altera: Partial<PlanoConfig>,
): ProjecaoAno[] {
  return projetar({ ...plano, ...altera });
}
