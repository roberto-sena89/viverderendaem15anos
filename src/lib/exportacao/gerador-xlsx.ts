import {
  FORMATO_MOEDA,
  FORMATO_PERCENTUAL,
  FORMATO_QUANTIDADE,
} from "./formatadores";
import type { DadosExportacao } from "./tipos";

interface DefColuna {
  header: string;
  key: string;
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

const VERDE = "FF0F7A3D";
const VERMELHO = "FFC02626";
const HEADER_BG = "FF006B3C";

/**
 * Gera a planilha .xlsx com as abas "Carteira" e "Resumo".
 * O ExcelJS é carregado sob demanda para não pesar no bundle inicial.
 */
export async function gerarXlsxCarteira({ linhas, resumo }: DadosExportacao): Promise<Blob> {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "Viver de Renda em 15 Anos";
  wb.created = new Date();

  // ---------- Aba Carteira ----------
  const ws = wb.addWorksheet("Carteira", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = COLUNAS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const cabecalho = ws.getRow(1);
  cabecalho.height = 24;
  cabecalho.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  for (const l of linhas) {
    const row = ws.addRow(l as unknown as Record<string, unknown>);
    COLUNAS.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      if (c.formato) cell.numFmt = c.formato;
      if (c.sinal) {
        const v = Number(cell.value ?? 0);
        cell.font = { color: { argb: v < 0 ? VERMELHO : VERDE }, bold: true };
      }
    });
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUNAS.length },
  };

  // ---------- Aba Resumo ----------
  const rs = wb.addWorksheet("Resumo");
  rs.columns = [
    { header: "Indicador", key: "indicador", width: 32 },
    { header: "Valor", key: "valor", width: 22 },
  ];
  const cabResumo = rs.getRow(1);
  cabResumo.height = 22;
  cabResumo.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  const indicadores: [string, number, string | undefined, boolean?][] = [
    ["Patrimônio total", resumo.patrimonioTotal, FORMATO_MOEDA],
    ["Total investido", resumo.totalInvestido, FORMATO_MOEDA],
    ["Valor atual", resumo.valorAtual, FORMATO_MOEDA],
    ["Lucro total", resumo.lucroTotal, FORMATO_MOEDA, true],
    ["Rentabilidade total", resumo.rentabilidadeTotal, FORMATO_PERCENTUAL, true],
    ["Total recebido em dividendos", resumo.dividendosRecebidos, FORMATO_MOEDA],
    ["Número de ativos", resumo.numeroAtivos, "0"],
  ];

  for (const [indicador, valor, formato, sinal] of indicadores) {
    const row = rs.addRow({ indicador, valor });
    row.getCell(1).font = { bold: true };
    const cell = row.getCell(2);
    if (formato) cell.numFmt = formato;
    if (sinal) cell.font = { bold: true, color: { argb: valor < 0 ? VERMELHO : VERDE } };
  }

  rs.addRow({});
  const tituloDist = rs.addRow({ indicador: "Distribuição por classe de ativos" });
  tituloDist.getCell(1).font = { bold: true, size: 12 };

  const cabDist = rs.addRow({ indicador: "Classe", valor: "Valor atual" });
  cabDist.getCell(3).value = "Participação (%)";
  [1, 2, 3].forEach((c) => {
    const cell = cabDist.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
  });
  rs.getColumn(3).width = 18;

  for (const d of resumo.distribuicao) {
    const row = rs.addRow({ indicador: d.classe, valor: d.valor });
    row.getCell(2).numFmt = FORMATO_MOEDA;
    const p = row.getCell(3);
    p.value = d.participacao;
    p.numFmt = FORMATO_PERCENTUAL;
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
