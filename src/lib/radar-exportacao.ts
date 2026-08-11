/**
 * Exportação da visão atual do radar — CSV, XLSX e PDF, 100% no cliente.
 * Reaproveita os padrões do serviço de exportação da carteira.
 */

import { baixarArquivo, campoCsv, dataIso } from "@/lib/exportacao/formatadores";
import type { LinhaRadarBase } from "@/lib/radar.server";
import { avaliarParaGestor, type RatingGestor } from "@/lib/score-gestor";

export type FormatoExportacaoRadar = "csv" | "xlsx" | "pdf";

export interface LinhaRadarExport {
  ticker: string;
  nome: string;
  categoria: "acao" | "fii";
  setor: string | null;
  preco: number | null;
  variacaoDia: number | null;
  dy12: number | null;
  pvp: number | null;
  percentil: number | null;
  distMinima52sPct: number | null;
  drawdownMaximoPct: number | null;
  score: number | null;
  sinal: string;
  urgente: boolean;
  rating: RatingGestor | null;
  notaGestor: number | null;
}

const ROTULOS_SINAL: Record<string, string> = {
  comprar: "Comprar",
  manter: "Manter",
  vender: "Vender",
  observar: "Observar",
  "sem-dados": "Sem dados",
};

export function linhasParaExportacao(linhas: LinhaRadarBase[]): LinhaRadarExport[] {
  return linhas.map((l) => {
    const gestor = avaliarParaGestor({
      ticker: l.ticker,
      fundamentos: l.fundamentos,
      oportunidade: l.score,
      sinal: l.sinal.tipo,
      dy12: l.dy12,
      pl: l.pl,
      payout: null,
      liquidez: l.liquidez,
      dividaPatrimonio: l.dividaPatrimonio,
      margemLiquida: l.margemLiquida,
      regime: null,
      selic: l.selic,
      setor: l.setor,
      consistenciaDividendos: l.consistenciaDividendos,
      percentilDistribucional: l.posicao?.percentilDistribucional ?? null,
      volatilidadeAnualPct: l.posicao?.volatilidadeAnualPct ?? null,
    });
    return {
      ticker: l.ticker,
      nome: l.nome,
      categoria: l.categoria,
      setor: l.setor,
      preco: l.preco,
      variacaoDia: l.variacaoDia,
      dy12: l.dy12,
      pvp: l.pvp,
      percentil: l.posicao?.percentil ?? null,
      distMinima52sPct: l.posicao?.distMinima52sPct ?? null,
      drawdownMaximoPct: l.posicao?.drawdownMaximoPct ?? null,
      score: l.score,
      sinal: ROTULOS_SINAL[l.sinal.tipo] ?? l.sinal.tipo,
      urgente: l.sinal.urgente,
      rating: gestor.rating,
      notaGestor: gestor.nota,
    };
  });
}

const COLUNAS_CSV = [
  "Ticker",
  "Nome",
  "Setor/Tipo",
  "Preco",
  "VariacaoDia",
  "DY12m",
  "PVPA",
  "Percentil",
  "PosMinima52s",
  "Score",
  "Sinal",
  "Urgente",
  "RatingGestor",
  "NotaGestor",
] as const;

const numero = (v: number | null | undefined): string =>
  v === null || v === undefined || !Number.isFinite(v) ? "" : v.toFixed(2);

function gerarCsv(linhas: LinhaRadarExport[]): string {
  const partes: string[] = [COLUNAS_CSV.join(",")];
  for (const l of linhas) {
    partes.push(
      [
        campoCsv(l.ticker),
        campoCsv(l.nome),
        campoCsv(l.setor ?? ""),
        numero(l.preco),
        numero(l.variacaoDia),
        numero(l.dy12),
        numero(l.pvp),
        numero(l.percentil),
        numero(l.distMinima52sPct),
        numero(l.score),
        campoCsv(l.sinal),
        l.urgente ? "1" : "",
        campoCsv(l.rating ?? ""),
        numero(l.notaGestor),
      ].join(","),
    );
  }
  return "\uFEFF" + partes.join("\n") + "\n";
}

function celulaTexto(texto: string | number | null | undefined) {
  return {
    type: String,
    value: texto === null || texto === undefined ? "" : String(texto),
  };
}

function celulaNumero(valor: number | null | undefined) {
  return {
    type: Number,
    value: Number.isFinite(valor ?? NaN) ? Number(valor) : 0,
    format: "0.0",
  };
}

async function gerarXlsx(linhas: LinhaRadarExport[]): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const cabecalho = [
    "Ticker",
    "Nome",
    "Setor/Tipo",
    "Preço",
    "Var. Dia %",
    "DY 12m %",
    "P/VPA",
    "Percentil",
    "Score",
    "Sinal",
    "Rating",
    "Nota",
  ];
  const dados = [
    cabecalho.map((t) => ({
      type: String,
      value: t,
      fontWeight: "bold" as const,
      backgroundColor: "#006B3C" as const,
      textColor: "#FFFFFF" as const,
    })),
    ...linhas.map((l) => [
      celulaTexto(l.ticker),
      celulaTexto(l.nome),
      celulaTexto(l.setor),
      celulaNumero(l.preco),
      celulaNumero(l.variacaoDia),
      celulaNumero(l.dy12),
      celulaNumero(l.pvp),
      celulaNumero(l.percentil),
      celulaNumero(l.score),
      celulaTexto(l.sinal),
      celulaTexto(l.rating ?? ""),
      celulaNumero(l.notaGestor),
    ]),
  ];

  const saida = writeXlsxFile([
    {
      sheet: "Radar",
      data: dados,
      columns: [
        { width: 10 },
        { width: 36 },
        { width: 18 },
        { width: 12 },
        { width: 14 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 10 },
        { width: 14 },
        { width: 10 },
        { width: 10 },
      ],
      stickyRowsCount: 1,
    },
  ]);
  return saida.toBlob();
}

const CORES_SINAL_PDF: Record<string, [number, number, number]> = {
  Vender: [220, 38, 38],
  Comprar: [22, 163, 74],
  Manter: [180, 133, 0],
  Observar: [14, 116, 144],
  "Sem dados": [110, 110, 110],
};

const CORES_RATING_PDF: Record<string, [number, number, number]> = {
  A: [22, 163, 74],
  B: [14, 116, 144],
  C: [180, 133, 0],
  D: [220, 38, 38],
};

async function gerarPdf(linhas: LinhaRadarExport[], tituloCategoria: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 40;
  const LARGURA = doc.internal.pageSize.getWidth();
  let y = 44;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 107, 60);
  doc.text(`Radar de Oportunidades — ${tituloCategoria}`, M, y);

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")} · ${linhas.length} ativos · educacional, não é recomendação`,
    M,
    y,
  );

  const colunas = [
    { titulo: "Ticker", largura: 70, alinhar: "left" as const },
    { titulo: "Nome", largura: 170, alinhar: "left" as const },
    { titulo: "Preço", largura: 66, alinhar: "right" as const },
    { titulo: "Var %", largura: 52, alinhar: "right" as const },
    { titulo: "Score", largura: 44, alinhar: "right" as const },
    { titulo: "Rating", largura: 46, alinhar: "center" as const },
    { titulo: "Percentil", largura: 58, alinhar: "right" as const },
    { titulo: "Sinal", largura: 76, alinhar: "left" as const },
  ];

  let linha = 0;

  const cabecalhoTabela = (inicio: number) => {
    doc.setFillColor(0, 107, 60);
    doc.rect(M, inicio, LARGURA - M * 2, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let x = M;
    for (const c of colunas) {
      doc.text(c.titulo, x + 6, inicio + 11);
      x += c.largura;
    }
  };

  doc.setFont("helvetica", "normal");
  cabecalhoTabela(y);
  y += 16;

  for (const l of linhas) {
    if (linha > 0 && linha % 40 === 0) {
      doc.addPage();
      y = 40;
      cabecalhoTabela(y);
      y += 16;
    }
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    let x = M;
    doc.text(l.ticker, x + 6, y + 10, { align: "left" });
    x += colunas[0].largura;
    doc.text(l.nome.slice(0, 36), x + 6, y + 10, { align: "left" });
    x += colunas[1].largura;
    doc.setTextColor(60, 60, 60);
    doc.text(l.preco !== null ? `R$ ${l.preco.toFixed(2)}` : "—", x + 6, y + 10, {
      align: "right",
    });
    x += colunas[2].largura;
    doc.text(l.variacaoDia !== null ? `${l.variacaoDia.toFixed(2)}%` : "—", x + 6, y + 10, {
      align: "right",
    });
    x += colunas[3].largura;
    const corScore: readonly [number, number, number] =
      l.score !== null && l.score >= 70 ? [22, 163, 74] : [60, 60, 60];
    doc.setTextColor(...corScore);
    doc.text(l.score !== null ? String(l.score) : "—", x + 6, y + 10, { align: "right" });
    x += colunas[4].largura;
    const corRating = l.rating ? (CORES_RATING_PDF[l.rating] ?? [110, 110, 110]) : [110, 110, 110];
    doc.setTextColor(corRating[0], corRating[1], corRating[2]);
    doc.text(l.rating ?? "—", x + 6, y + 10, { align: "center" });
    x += colunas[5].largura;
    doc.setTextColor(60, 60, 60);
    doc.text(l.percentil !== null ? `${l.percentil.toFixed(0)}%` : "—", x + 6, y + 10, {
      align: "right",
    });
    x += colunas[6].largura;
    doc.setTextColor(...(CORES_SINAL_PDF[l.sinal] ?? [110, 110, 110]));
    doc.text(l.sinal, x + 6, y + 10, { align: "left" });
    y += 16;
    linha++;
  }

  return doc.output("blob");
}

/** Exporta a visão atual do radar e dispara o download. */
export async function exportarRadar(
  formato: FormatoExportacaoRadar,
  linhas: LinhaRadarBase[],
  categoria: "acao" | "fii",
): Promise<void> {
  if (!linhas.length) throw new Error("Nenhum ativo na visão atual para exportar.");
  const linhasExport = linhasParaExportacao(linhas);
  const sufixo = categoria === "fii" ? "FIIs" : "Acoes";
  const data = dataIso();

  if (formato === "csv") {
    baixarArquivo(
      new Blob([gerarCsv(linhasExport)], { type: "text/csv;charset=utf-8" }),
      `Radar_${sufixo}_${data}.csv`,
    );
    return;
  }
  if (formato === "xlsx") {
    const blob = await gerarXlsx(linhasExport);
    baixarArquivo(blob, `Radar_${sufixo}_${data}.xlsx`);
    return;
  }
  const blob = await gerarPdf(linhasExport, sufixo);
  baixarArquivo(blob, `Radar_${sufixo}_${data}.pdf`);
}
