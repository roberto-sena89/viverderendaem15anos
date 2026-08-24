/**
 * Prejuízo Fiscal & Tax-Loss Harvesting — painel de apuração de prejuízos
 * acumulados por regra tributária e sugestões de vendas com prejuízo para
 * compensar ganhos de capital.
 *
 * Regras (mercado à vista/swing trade):
 *  - Prejuízo de Ações compensa ganho de Ações (mesma regra), ilimitado no tempo.
 *  - Prejuízo de FIIs compensa ganho de FIIs; ETF/BDR/Stocks/REITs similarmente.
 *  - Cripto compensa cripto.
 *  - A ordem de compensação é cronológica (meses seguintes).
 */

import { lancarVendas, regraDaCategoria, REGRAS, type RegraTributaria } from "@/lib/tributacao";
import type { Aporte, Ativo } from "@/lib/portfolio";

export interface PrejuizoPorRegra {
  regra: RegraTributaria;
  rotulo: string;
  prejuizoAcumulado: number; // positivo = valor a compensar
  ganhoAcumulado: number;
  saldo: number; // ganho (+) ou prejuízo (-)
}

export interface SugestaoTaxLoss {
  ticker: string;
  categoria: string;
  quantidade: number;
  precoAtual: number;
  precoMedio: number;
  perdaPotencial: number; // positiva = prejuízo ao vender hoje
  pctPerda: number; // % abaixo do preço médio
}

export interface PainelPrejuizoFiscal {
  porRegra: PrejuizoPorRegra[];
  prejuizoTotal: number;
  sugestoes: SugestaoTaxLoss[];
  aviso: string;
}

/**
 * Calcula o saldo de prejuízos/ganhos por regra a partir do histórico de
 * aportes (vendas = quantidade negativa).
 */
export function calcularPrejuizoFiscal(aportes: Aporte[]): PainelPrejuizoFiscal {
  const vendas = lancarVendas(aportes);
  const porRegra = new Map<RegraTributaria, { prejuizo: number; ganho: number }>();

  for (const venda of vendas) {
    const atual = porRegra.get(venda.regra) ?? { prejuizo: 0, ganho: 0 };
    if (venda.ganho < 0) atual.prejuizo += Math.abs(venda.ganho);
    else atual.ganho += venda.ganho;
    porRegra.set(venda.regra, atual);
  }

  const regras: PrejuizoPorRegra[] = [...porRegra.entries()]
    .filter(([, v]) => v.prejuizo > 0 || v.ganho > 0)
    .map(([regra, v]) => ({
      regra,
      rotulo: REGRAS[regra].rotulo,
      prejuizoAcumulado: Math.round(v.prejuizo * 100) / 100,
      ganhoAcumulado: Math.round(v.ganho * 100) / 100,
      saldo: Math.round((v.ganho - v.prejuizo) * 100) / 100,
    }))
    .sort((a, b) => b.prejuizoAcumulado - a.prejuizoAcumulado);

  const prejuizoTotal = regras.reduce((s, r) => s + Math.max(0, -r.saldo), 0);

  return {
    porRegra: regras,
    prejuizoTotal: Math.round(prejuizoTotal * 100) / 100,
    sugestoes: [],
    aviso: "Apuração simplificada para planejamento — consulte um contador para a declaração.",
  };
}

/**
 * Sugere vendas com prejuízo (tax-loss harvesting) para ativos atuais que
 * estão abaixo do preço médio. Não recomenda vender; apenas mostra o potencial.
 */
export function sugerirTaxLoss(
  ativos: Ativo[],
  _prejuizoFiscal: PainelPrejuizoFiscal,
): SugestaoTaxLoss[] {
  const sugestoes: SugestaoTaxLoss[] = [];

  for (const ativo of ativos) {
    const quantidade = Number(ativo.quantidade);
    const precoMedio = Number(ativo.precoMedio);
    const precoAtual = Number(ativo.precoAtual);
    if (quantidade <= 0 || precoMedio <= 0 || precoAtual <= 0) continue;

    const perdaPorCota = precoAtual - precoMedio;
    if (perdaPorCota >= 0) continue; // só abaixo do preço médio

    // Regra da categoria — só faz sentido para renda variável apurada
    const regra = regraDaCategoria(ativo.categoria);
    if (regra === "nao-apurado") continue;

    sugestoes.push({
      ticker: ativo.ticker,
      categoria: ativo.categoria,
      quantidade,
      precoAtual,
      precoMedio,
      perdaPotencial: Math.round(perdaPorCota * quantidade * 100) / 100,
      pctPerda: Math.round((perdaPorCota / precoMedio) * 10000) / 100,
    });
  }

  // Ordena pela maior perda potencial
  return sugestoes.sort((a, b) => b.perdaPotencial - a.perdaPotencial).slice(0, 10);
}

/** Resumo simples para exibição no dashboard. */
export function resumoPrejuizo(aportes: Aporte[]) {
  const painel = calcularPrejuizoFiscal(aportes);
  return {
    prejuizoTotal: painel.prejuizoTotal,
    regrasComPrejuizo: painel.porRegra.filter((r) => r.saldo < 0).length,
  };
}
