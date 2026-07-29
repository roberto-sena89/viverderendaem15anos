import { brl, pct } from "@/lib/portfolio";
import { CORES_CENARIO_PDF, type ResumoCenario } from "@/lib/cenarios";

const M = 40;
const LARGURA = 595.28; // A4 retrato em pt
const CONTEUDO = LARGURA - M * 2;

function compacto(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

export async function gerarPdfComparativo(resumos: ResumoCenario[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = M;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(0, 107, 60);
  doc.text("Comparativo de cenários", M, y);

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `Planejador da Independência Financeira · gerado em ${new Date().toLocaleString("pt-BR")}`,
    M,
    y,
  );

  y += 24;
  y = desenharGrafico(doc, resumos, y);

  y += 28;
  y = desenharTabela(doc, resumos, y);

  y += 24;
  desenharPremissas(doc, resumos, y);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Projeções estimadas a partir das premissas informadas. Não constitui recomendação de investimento.",
    M,
    doc.internal.pageSize.getHeight() - 24,
  );

  doc.save(`comparativo-cenarios-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function desenharGrafico(doc: import("jspdf").jsPDF, resumos: ResumoCenario[], topo: number) {
  const altura = 190;
  const eixoX = M + 46;
  const larguraGrafico = CONTEUDO - 46;
  const base = topo + altura;

  const maximo = Math.max(...resumos.flatMap((r) => r.linhas.map((l) => l.patrimonio)), 1);
  const anos = resumos.flatMap((r) => r.linhas.map((l) => l.ano));
  const anoMin = Math.min(...anos);
  const anoMax = Math.max(...anos, anoMin + 1);

  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.6);
  for (let i = 0; i <= 4; i++) {
    const linhaY = base - (altura / 4) * i;
    doc.line(eixoX, linhaY, eixoX + larguraGrafico, linhaY);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(compacto((maximo / 4) * i), M, linhaY + 3);
  }

  const px = (ano: number) => eixoX + ((ano - anoMin) / (anoMax - anoMin)) * larguraGrafico;
  const py = (valor: number) => base - (valor / maximo) * altura;

  doc.setLineWidth(1.4);
  resumos.forEach((r, i) => {
    doc.setDrawColor(CORES_CENARIO_PDF[i % CORES_CENARIO_PDF.length]);
    r.linhas.forEach((linha, idx) => {
      if (idx === 0) return;
      const anterior = r.linhas[idx - 1];
      doc.line(px(anterior.ano), py(anterior.patrimonio), px(linha.ano), py(linha.patrimonio));
    });
  });

  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(String(anoMin), eixoX, base + 12);
  doc.text(String(anoMax), eixoX + larguraGrafico - 16, base + 12);

  let legendaX = eixoX;
  const legendaY = base + 28;
  doc.setFontSize(8);
  resumos.forEach((r, i) => {
    doc.setFillColor(CORES_CENARIO_PDF[i % CORES_CENARIO_PDF.length]);
    doc.rect(legendaX, legendaY - 6, 8, 8, "F");
    doc.setTextColor(60, 60, 60);
    const rotulo = r.cenario.nome.slice(0, 22);
    doc.text(rotulo, legendaX + 12, legendaY);
    legendaX += 24 + doc.getTextWidth(rotulo);
  });

  return legendaY + 6;
}

function desenharTabela(doc: import("jspdf").jsPDF, resumos: ResumoCenario[], topo: number) {
  const linhas: Array<[string, (r: ResumoCenario) => string]> = [
    ["Patrimônio projetado", (r) => brl(r.patrimonioFinal)],
    ["Em valor de hoje", (r) => brl(r.patrimonioReal)],
    ["Renda passiva/mês", (r) => brl(r.rendaPassiva)],
    ["Total aportado", (r) => brl(r.totalAportado)],
    ["Independência", (r) => (r.anoIndependencia ? `${r.anoIndependencia} · ${r.idadeIndependencia} anos` : "Após o período")],
    ["Progresso da meta", (r) => pct(r.progresso)],
  ];

  const colRotulo = 130;
  const colLargura = (CONTEUDO - colRotulo) / resumos.length;
  let y = topo;

  doc.setFillColor(245, 247, 246);
  doc.rect(M, y - 12, CONTEUDO, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text("Indicador", M + 6, y + 2);
  resumos.forEach((r, i) => {
    doc.setTextColor(CORES_CENARIO_PDF[i % CORES_CENARIO_PDF.length]);
    doc.text(r.cenario.nome.slice(0, 20), M + colRotulo + colLargura * i + 6, y + 2);
  });

  y += 22;
  doc.setFont("helvetica", "normal");
  linhas.forEach(([rotulo, valor], idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(M, y - 12, CONTEUDO, 20, "F");
    }
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(9);
    doc.text(rotulo, M + 6, y + 2);
    doc.setTextColor(30, 30, 30);
    resumos.forEach((r, i) => {
      doc.text(valor(r), M + colRotulo + colLargura * i + 6, y + 2);
    });
    y += 20;
  });

  return y;
}

function desenharPremissas(doc: import("jspdf").jsPDF, resumos: ResumoCenario[], topo: number) {
  let y = topo;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 107, 60);
  doc.text("Premissas de cada cenário", M, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  resumos.forEach((r, i) => {
    if (y > doc.internal.pageSize.getHeight() - 70) {
      doc.addPage();
      y = M;
    }
    const c = r.cenario;
    doc.setTextColor(CORES_CENARIO_PDF[i % CORES_CENARIO_PDF.length]);
    doc.text(c.nome, M, y);
    y += 13;
    doc.setTextColor(90, 90, 90);
    const texto = [
      `Idade ${c.input.idadeAtual} a ${c.input.idadeAposentadoria} anos · patrimônio inicial ${brl(c.input.patrimonioAtual)}`,
      `Aporte mensal ${brl(c.input.aporteMensal)} com aumento de ${pct(c.input.aumentoAnual)} ao ano`,
      `Rentabilidade ${pct(c.input.rentabilidadeAnual)} a.a. · inflação ${pct(c.input.inflacaoAnual)} a.a. · retirada ${pct(c.input.taxaRetirada)}`,
      `Renda desejada ${brl(c.objetivoRenda)}/mês · necessário ${brl(r.patrimonioNecessario)}`,
    ];
    texto.forEach((linha) => {
      doc.text(linha, M + 10, y);
      y += 12;
    });
    y += 8;
  });
}
