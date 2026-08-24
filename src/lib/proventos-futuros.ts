/**
 * Calendário de Proventos Futuros — projeta os próximos 12 meses de proventos
 * da carteira com base no histórico de dividendos e nas posições atuais.
 *
 * Metodologia: para cada ativo, usa a média mensal dos dividendos recebidos
 * nos últimos 12 meses × quantidade em carteira. Sem histórico, o ativo é
 * excluído (confiança é proporcional ao tamanho do histórico).
 */

import type { Ativo, Dividendo } from "@/lib/portfolio";

export interface ProventoProjetado {
  mes: string; // "2026-09"
  ticker: string;
  categoria: string;
  valorEstimado: number;
  confianca: "alta" | "media" | "baixa";
}

export interface ResumoCalendario {
  meses: { mes: string; total: number }[];
  porAtivo: { ticker: string; categoria: string; mediaMensal: number }[];
  totalAnual: number;
  totalMensalMedio: number;
  ativosSemHistorico: string[];
}

/**
 * Projeta os proventos dos próximos 12 meses a partir das posições atuais e
 * do histórico de dividendos.
 */
export function projetarProventos(ativos: Ativo[], dividendos: Dividendo[]): ResumoCalendario {
  const agora = new Date();
  const inicioJanela = new Date(agora);
  inicioJanela.setMonth(inicioJanela.getMonth() - 12);

  // Agrupa dividendos dos últimos 12 meses por ticker
  const divPorTicker = new Map<string, number[]>();
  for (const d of dividendos) {
    const data = new Date(d.data);
    if (!Number.isNaN(data.getTime()) && data >= inicioJanela) {
      const arr = divPorTicker.get(d.ticker) ?? [];
      arr.push(Number(d.valor));
      divPorTicker.set(d.ticker, arr);
    }
  }

  const mapaMes = new Map<string, number>();
  const porAtivo: { ticker: string; categoria: string; mediaMensal: number }[] = [];
  const ativosSemHistorico: string[] = [];

  for (const ativo of ativos) {
    const quantidade = Number(ativo.quantidade);
    if (quantidade <= 0) continue;

    const divs = divPorTicker.get(ativo.ticker);
    if (!divs || divs.length === 0) {
      // Posição que nunca pagou no período — informa para o usuário
      const categoriaPaga = ["FIIS", "FIIs", "Ações", "ETF Brasil", "Fiagro"].includes(
        ativo.categoria,
      );
      if (categoriaPaga) ativosSemHistorico.push(ativo.ticker);
      continue;
    }

    const totalDivs = divs.reduce((a, b) => a + b, 0);
    const mediaPorCota = totalDivs / divs.length;
    const mediaMensal = mediaPorCota * quantidade;
    if (mediaMensal <= 0) continue;

    porAtivo.push({
      ticker: ativo.ticker,
      categoria: ativo.categoria,
      mediaMensal: Math.round(mediaMensal * 100) / 100,
    });

    for (let i = 1; i <= 12; i++) {
      const data = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      mapaMes.set(chave, (mapaMes.get(chave) ?? 0) + mediaMensal);
    }
  }

  const meses: { mes: string; total: number }[] = [];
  for (let i = 1; i <= 12; i++) {
    const data = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    meses.push({ mes: chave, total: Math.round((mapaMes.get(chave) ?? 0) * 100) / 100 });
  }

  const totalAnual = meses.reduce((s, m) => s + m.total, 0);

  return {
    meses,
    porAtivo: porAtivo.sort((a, b) => b.mediaMensal - a.mediaMensal),
    totalAnual: Math.round(totalAnual * 100) / 100,
    totalMensalMedio: Math.round((totalAnual / 12) * 100) / 100,
    ativosSemHistorico,
  };
}

/** Rótulo curto de um mês "2026-09" → "set 26". */
export function rotuloMes(curto: string): string {
  const [ano, mes] = curto.split("-");
  const nomes = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const idx = Number(mes) - 1;
  if (!ano || idx < 0 || idx > 11) return curto;
  return `${nomes[idx]} ${ano.slice(2)}`;
}
