import writeXlsxFile, { type Row, type Cell } from "write-excel-file";

import {
  FORMATO_MOEDA,
  FORMATO_PERCENTUAL,
  FORMATO_QUANTIDADE,
} from "./formatadores";
import type { DadosExportacao, LinhaCarteira } from "./tipos";

interface DefColuna {
  header: string;
  key: keyof LinhaCarteira;
  width: number;
  formato?: string;
  /** Colore verde/vermelho conforme o sinal do valor. */
  sinal?: boolean;
}

const COLUNAS: DefColuna[] = [
  { header: "Tipo de Ativo", key: "tipo", width: 22 },
  { header: "Código/Ticker", key: "ticker", width: 14 },
  { header: "Nome do Ativo", key: "nome", width: 34 },
  { header: "Quantidade", key: "quantidade", width: 14, formato: FORMATO_QUANTIDADE },
  { header: "Preço Médio", key: "precoMedio", width: 15, formato: FORMATO_MOEDA },
  { header: "Cotação Atual", key: "cotacaoAtual", width: 15, formato: FORMATO_MOEDA },
  { header: "Valor Investido", key: "valorInvestido", width: 17, formato: FORMATO_MOEDA },
  { header: "Valor Atual", key: "valorAtual", width: 17, formato: FORMATO_MOEDA },
  { header: "Lucro/Prejuízo (R$)", key: "lucro", width: 19, formato: FORMATO_MOEDA, sinal: true },
  { header: "Lucro/Prejuízo (%)", key: "lucroPercentual", width: 18, formato: FORMATO_PERCENTUAL, sinal: true },
  { header: "Dividend Yield (%)", key: "dividendYield", width: 18, formato: FORMATO_PERCENTUAL },
  { header: "Dividendos Recebidos", key: "dividendosRecebidos", width: 20, formato: FORMATO_MOEDA },
  { header: "Setor", key: "setor", width: 26 },
  { header: "Participação (%)", key: "participacao", width: 17, formato: FORMATO_PERCENTUAL },
  { header: "Última Atualização", key: "atualizadoEm", width: 19 },
];

const VERDE = "#0F7A3D";
const VERMELHO = "#C02626";
const HEADER_BG = "#006B3C";
const BRANCO = "#FFFFFF";

const celulaCabecalho = (value: string): Cell => ({
  value,
  fontWeight: "bold",
  color: BRANCO,
  backgroundColor: HEADER_BG,
  align: "center",
  alignVertical: "center",
  wrap: true,
});

const celulaNumero = (valor: number, formato?: string, sinal?: boolean): Cell => ({
  type: Number,
  value: Number.isFinite(valor) ? valor : 0,
  format: formato,
  ...(sinal ? { fontWeight: "bold" as const, color: valor < 0 ? VERMELHO : VERDE } : {}),
});

/**
 * Gera a planilha .xlsx com as abas "Carteira" e "Resumo".
 * A biblioteca é carregada sob demanda para não pesar no bundle inicial.
 */
export async function gerarXlsxCarteira({ linhas, resumo }: DadosExportacao): Promise<Blob> {
  // ---------- Aba Carteira ----------
  const abaCarteira: Row[] = [
    COLUNAS.map((c) => celulaCabecalho(c.header)),
    ...linhas.map((l) =>
      COLUNAS.map((c): Cell => {
        const valor = l[c.key];
        return typeof valor === "number"
          ? celulaNumero(valor, c.formato, c.sinal)
          : { type: String, value: valor == null ? "" : String(valor) };
      }),
    ),
  ];

  // ---------- Aba Resumo ----------
  const indicadores: [string, number, string | undefined, boolean?][] = [
    ["Patrimônio total", resumo.patrimonioTotal, FORMATO_MOEDA],
    ["Total investido", resumo.totalInvestido, FORMATO_MOEDA],
    ["Valor atual", resumo.valorAtual, FORMATO_MOEDA],
    ["Lucro total", resumo.lucroTotal, FORMATO_MOEDA, true],
    ["Rentabilidade total", resumo.rentabilidadeTotal, FORMATO_PERCENTUAL, true],
    ["Total recebido em dividendos", resumo.dividendosRecebidos, FORMATO_MOEDA],
    ["Número de ativos", resumo.numeroAtivos, "0"],
  ];

  const abaResumo: Row[] = [
    [celulaCabecalho("Indicador"), celulaCabecalho("Valor")],
    ...indicadores.map(([indicador, valor, formato, sinal]): Row => [
      { type: String, value: indicador, fontWeight: "bold" },
      celulaNumero(valor, formato, sinal),
    ]),
    [],
    [{ type: String, value: "Distribuição por classe de ativos", fontWeight: "bold", fontSize: 12 }],
    [celulaCabecalho("Classe"), celulaCabecalho("Valor atual"), celulaCabecalho("Participação (%)")],
    ...resumo.distribuicao.map((d): Row => [
      { type: String, value: d.classe },
      celulaNumero(d.valor, FORMATO_MOEDA),
      celulaNumero(d.participacao, FORMATO_PERCENTUAL),
    ]),
  ];

  return writeXlsxFile([abaCarteira, abaResumo], {
    sheets: ["Carteira", "Resumo"],
    columns: [
      COLUNAS.map((c) => ({ width: c.width })),
      [{ width: 32 }, { width: 22 }, { width: 18 }],
    ],
    stickyRowsCount: 1,
  }) as unknown as Promise<Blob>;
}
