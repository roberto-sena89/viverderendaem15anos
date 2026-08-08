import { campoCsv } from "./formatadores";
import type { DadosExportacao } from "./tipos";

const COLUNAS = [
  "Tipo",
  "Ticker",
  "Nome",
  "Quantidade",
  "PrecoMedio",
  "CotacaoAtual",
  "ValorInvestido",
  "ValorAtual",
  "Lucro",
  "LucroPercentual",
  "DividendYield",
  "Dividendos",
  "Setor",
  "ParticipacaoPercentual",
  "DataAtualizacao",
] as const;

/**
 * CSV UTF-8 otimizado para leitura por modelos de IA:
 * separador vírgula, apenas uma linha de cabeçalho, números decimais crus
 * (sem símbolo monetário), datas ISO, sem fórmulas nem formatação.
 * A última linha é o agregado `TOTAL`.
 */
export function gerarCsvChatGpt({ linhas, resumo }: DadosExportacao): Blob {
  const partes: string[] = [COLUNAS.join(",")];

  for (const l of linhas) {
    partes.push(
      [
        campoCsv(l.tipo),
        campoCsv(l.ticker),
        campoCsv(l.nome),
        l.quantidade,
        l.precoMedio.toFixed(2),
        l.cotacaoAtual.toFixed(2),
        l.valorInvestido.toFixed(2),
        l.valorAtual.toFixed(2),
        l.lucro.toFixed(2),
        l.lucroPercentual.toFixed(2),
        l.dividendYield.toFixed(2),
        l.dividendosRecebidos.toFixed(2),
        campoCsv(l.setor),
        l.participacao.toFixed(2),
        l.atualizadoEm,
      ].join(","),
    );
  }

  partes.push(
    [
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      resumo.totalInvestido.toFixed(2),
      resumo.valorAtual.toFixed(2),
      resumo.lucroTotal.toFixed(2),
      resumo.rentabilidadeTotal.toFixed(2),
      "",
      resumo.dividendosRecebidos.toFixed(2),
      "",
      "100.00",
      "",
    ].join(","),
  );

  // BOM garante que o Excel e outros leitores reconheçam UTF-8.
  return new Blob(["\uFEFF" + partes.join("\n") + "\n"], {
    type: "text/csv;charset=utf-8",
  });
}
