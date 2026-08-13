import { brl, pct } from "@/lib/portfolio";
import type { Ativo, Categoria } from "@/lib/portfolio";

const M = 40;
const CONTEUDO = 595.28 - M * 2;
const VERDE: [number, number, number] = [0, 107, 60];
const VERMELHO: [number, number, number] = [150, 40, 40];

export interface DadosRelatorioCarteira {
  ativos: Ativo[];
  custoTotal: number; // soma de quantidade × preço médio
  dividendoTotal12m: number;
}

export interface LinhaCategoria {
  categoria: Categoria;
  valor: number;
  custo: number;
  rentabilidade: number;
  dividendos: number;
}

export function agruparCategorias(ativos: Ativo[]): LinhaCategoria[] {
  const mapa = new Map<Categoria, LinhaCategoria>();
  for (const a of ativos) {
    const valor = a.quantidade * a.precoAtual;
    const custo = a.quantidade * a.precoMedio;
    const atual = mapa.get(a.categoria) ?? {
      categoria: a.categoria,
      valor: 0,
      custo: 0,
      rentabilidade: 0,
      dividendos: 0,
    };
    atual.valor += valor;
    atual.custo += custo;
    atual.dividendos += (valor * a.dy) / 100;
    mapa.set(a.categoria, atual);
  }
  return [...mapa.values()].sort((x, y) => y.valor - x.valor);
}

export async function gerarRelatorioCarteira(dados: DadosRelatorioCarteira) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = M;

  const valorTotal = dados.ativos.reduce((s, a) => s + a.quantidade * a.precoAtual, 0);
  const lucro = valorTotal - dados.custoTotal;
  const rentGeral = dados.custoTotal > 0 ? lucro / dados.custoTotal : 0;
  const categorias = agruparCategorias(dados.ativos);

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...VERDE);
  doc.text("Relatório de Carteira", M, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(130, 130, 130);
  doc.text(`Viver de Renda em 15 Anos · ${new Date().toLocaleDateString("pt-BR")}`, M, y);
  y += 22;

  // Resumo executivo
  const cartoes: Array<[string, string]> = [
    ["Patrimônio", brl(valorTotal)],
    ["Custo", brl(dados.custoTotal)],
    ["Dividendos 12m", brl(dados.dividendoTotal12m)],
    ["Lucro", brl(lucro)],
  ];
  y = desenharCards(doc, cartoes, y);

  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...(lucro >= 0 ? VERDE : VERMELHO));
  doc.text(
    `Rentabilidade acumulada: ${pct(rentGeral)} ${lucro >= 0 ? "acima do custo" : "abaixo do custo"}`,
    M,
    y,
  );
  y += 24;

  // Distribuição por classe
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("Distribuição por classe", M, y);
  y += 16;
  for (const c of categorias) {
    const fracao = valorTotal > 0 ? c.valor / valorTotal : 0;
    doc.setFillColor(...(c.rentabilidade >= 0 ? VERDE : VERMELHO));
    doc.roundedRect(M, y, CONTEUDO * fracao, 12, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`${c.categoria}: ${brl(c.valor)} (${pct(fracao)})`, M, y + 9);
    y += 18;
  }
  y += 16;

  // Ativos
  y = desenharTabelaAtivos(doc, dados.ativos, y);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Relatório informativo gerado a partir da carteira cadastrada. Não constitui recomendação de investimento.",
    M,
    doc.internal.pageSize.getHeight() - 24,
  );

  doc.save(`relatorio-carteira-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function desenharCards(doc: import("jspdf").jsPDF, itens: Array<[string, string]>, y: number) {
  const col = CONTEUDO / itens.length;
  let x = M;
  for (const [titulo, valor] of itens) {
    doc.setFillColor(245, 247, 246);
    doc.roundedRect(x, y, col - 8, 44, 4, 4, "F");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(titulo, x + 10, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(valor, x + 10, y + 30);
    doc.setFont("helvetica", "normal");
    x += col;
  }
  return y + 52;
}

function cabecalhoDeTabela(
  doc: import("jspdf").jsPDF,
  colunas: Array<[string, number]>,
  y: number,
) {
  doc.setFillColor(240, 244, 242);
  doc.rect(M, y - 12, CONTEUDO, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  for (const [rotulo, x] of colunas) {
    doc.text(rotulo, M + x, y + 2);
  }
  doc.setFont("helvetica", "normal");
  return y + 18;
}

function desenharTabelaAtivos(doc: import("jspdf").jsPDF, ativos: Ativo[], topo: number) {
  const ordenados = [...ativos].sort(
    (x, y) => y.quantidade * y.precoAtual - x.quantidade * x.precoAtual,
  );
  let y = cabecalhoDeTabela(
    doc,
    [
      ["Ativo", 6],
      ["Qtde", 110],
      ["Preço", 160],
      ["Valor", 230],
      ["Rent.", 300],
      ["Yield", 360],
    ],
    topo,
  );

  for (const a of ordenados) {
    const valor = a.quantidade * a.precoAtual;
    const rent = a.precoMedio > 0 ? a.precoAtual / a.precoMedio - 1 : 0;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(a.ticker, M + 6, y);
    doc.text(String(a.quantidade), M + 110, y);
    doc.text(brl(a.precoAtual), M + 160, y);
    doc.setTextColor(30, 30, 30);
    doc.text(brl(valor), M + 230, y);
    doc.setTextColor(...(rent >= 0 ? VERDE : VERMELHO));
    doc.text(pct(rent), M + 300, y);
    doc.setTextColor(30, 30, 30);
    doc.text(pct(a.dy / 100), M + 360, y);
    y += 16;

    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = M + 10;
      y = cabecalhoDeTabela(
        doc,
        [
          ["Ativo", 6],
          ["Qtde", 110],
          ["Preço", 160],
          ["Valor", 230],
          ["Rent.", 300],
          ["Yield", 360],
        ],
        y,
      );
    }
  }
  return y;
}
