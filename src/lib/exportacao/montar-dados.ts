import {
  classeDoAtivo,
  valorAtual as calcValorAtual,
  valorInvestido as calcValorInvestido,
  type Ativo,
  type Dividendo,
} from "@/lib/portfolio";
import { arredondar, dataIso } from "./formatadores";
import type { DadosExportacao, LinhaCarteira, ResumoExportacao } from "./tipos";

/**
 * Converte o estado atual da carteira em linhas e resumo prontos para exportação.
 * Puro e síncrono — seguro para milhares de ativos (O(n) sobre ativos e dividendos).
 */
export function montarDadosExportacao(
  ativos: Ativo[],
  dividendos: Dividendo[] = [],
  agora: Date = new Date(),
): DadosExportacao {
  const recebidosPorTicker = new Map<string, number>();
  for (const d of dividendos) {
    const chave = d.ticker?.toUpperCase() ?? "";
    recebidosPorTicker.set(chave, (recebidosPorTicker.get(chave) ?? 0) + (d.valor || 0));
  }

  const totalAtual = ativos.reduce((s, a) => s + calcValorAtual(a), 0);
  const data = dataIso(agora);

  const linhas: LinhaCarteira[] = ativos.map((a) => {
    const investido = calcValorInvestido(a);
    const atual = calcValorAtual(a);
    const lucro = atual - investido;
    return {
      tipo: a.categoria,
      ticker: a.ticker,
      nome: a.nome,
      quantidade: arredondar(a.quantidade, 8),
      precoMedio: arredondar(a.precoMedio),
      cotacaoAtual: arredondar(a.precoAtual),
      valorInvestido: arredondar(investido),
      valorAtual: arredondar(atual),
      lucro: arredondar(lucro),
      lucroPercentual: arredondar(investido > 0 ? (lucro / investido) * 100 : 0),
      dividendYield: arredondar(a.dy ?? 0),
      dividendosRecebidos: arredondar(recebidosPorTicker.get(a.ticker?.toUpperCase() ?? "") ?? 0),
      setor: classeDoAtivo(a).replace(/\n/g, " · "),
      participacao: arredondar(totalAtual > 0 ? (atual / totalAtual) * 100 : 0),
      atualizadoEm: data,
    };
  });

  const totalInvestido = linhas.reduce((s, l) => s + l.valorInvestido, 0);
  const dividendosRecebidos = linhas.reduce((s, l) => s + l.dividendosRecebidos, 0);
  const lucroTotal = totalAtual - totalInvestido;

  const porClasse = new Map<string, number>();
  for (const l of linhas) porClasse.set(l.tipo, (porClasse.get(l.tipo) ?? 0) + l.valorAtual);

  const resumo: ResumoExportacao = {
    patrimonioTotal: arredondar(totalAtual),
    totalInvestido: arredondar(totalInvestido),
    valorAtual: arredondar(totalAtual),
    lucroTotal: arredondar(lucroTotal),
    rentabilidadeTotal: arredondar(totalInvestido > 0 ? (lucroTotal / totalInvestido) * 100 : 0),
    dividendosRecebidos: arredondar(dividendosRecebidos),
    numeroAtivos: linhas.length,
    distribuicao: [...porClasse.entries()]
      .map(([classe, valor]) => ({
        classe,
        valor: arredondar(valor),
        participacao: arredondar(totalAtual > 0 ? (valor / totalAtual) * 100 : 0),
      }))
      .sort((a, b) => b.valor - a.valor),
  };

  return { linhas, resumo, data };
}
