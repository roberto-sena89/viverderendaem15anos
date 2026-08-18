import { brl } from "@/lib/portfolio";
import type { DadosRelatorioAuditoria } from "@/lib/relatorio.functions";

const M = 40;
const LARGURA = 595.28;
const CONTEUDO = LARGURA - M * 2;
const ALTURA = 841.89;
const RODAPE = ALTURA - 40;

const VERDE = [0, 107, 60] as const;
const VERDE_CLARO = [0, 150, 84] as const;
const CINZA = [110, 110, 110] as const;
const TEXTO = [40, 40, 40] as const;
const ERRO = [211, 47, 47] as const;
const OK = [0, 130, 60] as const;
const AVISO = [218, 145, 0] as const;

type Doc = import("jspdf").jsPDF;

function rotuloPerfil(p: string) {
  return p === "conservador" ? "Conservador" : p === "agressivo" ? "Agressivo" : "Moderado";
}

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cabecalho(doc: Doc, titulo: string, geradoEm: string) {
  doc.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
  doc.rect(0, 0, LARGURA, 86, "F");
  doc.setFillColor(VERDE_CLARO[0], VERDE_CLARO[1], VERDE_CLARO[2]);
  doc.rect(0, 86, LARGURA, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Investidor em 15 Anos", M, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(220, 240, 230);
  doc.text("Relatório de Auditoria de Carteira · Gestor IA", M, 56);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date(geradoEm).toLocaleString("pt-BR")}`, M, 72);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
  doc.text(semAcento(titulo), M, 112);
}

function rodape(doc: Doc) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Análise educativa gerada automaticamente com base nos dados cadastrados pelo usuário. Não constitui recomendação de investimento.",
    M,
    ALTURA - 26,
    { maxWidth: CONTEUDO },
  );
  doc.setDrawColor(225, 225, 225);
  doc.line(M, ALTURA - 30, LARGURA - M, ALTURA - 30);
  doc.setFontSize(8);
  doc.text(`Página ${doc.getNumberOfPages()}`, LARGURA - M, ALTURA - 18, { align: "right" });
}

function quebrarTexto(doc: Doc, texto: string, maxLargura: number) {
  return doc.splitTextToSize(texto, maxLargura) as string[];
}

function tituloSecao(doc: Doc, texto: string, y: number) {
  if (y > RODAPE - 40) {
    doc.addPage();
    y = 40;
    rodape(doc);
  }
  doc.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
  doc.rect(M, y - 12, 4, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
  doc.text(semAcento(texto), M + 10, y);
  return y + 8;
}

function barra(
  doc: Doc,
  y: number,
  x: number,
  larguraMax: number,
  pctValor: number,
  cor: readonly [number, number, number],
) {
  doc.setFillColor(232, 236, 233);
  doc.roundedRect(x, y, larguraMax, 7, 1.5, 1.5, "F");
  doc.setFillColor(cor[0], cor[1], cor[2]);
  doc.roundedRect(
    x,
    y,
    Math.max(2, (Math.min(100, pctValor) / 100) * larguraMax),
    7,
    1.5,
    1.5,
    "F",
  );
}

function kpiCard(
  doc: Doc,
  x: number,
  y: number,
  largura: number,
  rotulo: string,
  valor: string,
  cor: readonly [number, number, number] = TEXTO,
) {
  doc.setFillColor(245, 247, 246);
  doc.roundedRect(x, y, largura, 46, 4, 4, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
  doc.text(semAcento(rotulo), x + 8, y + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(cor[0], cor[1], cor[2]);
  doc.text(semAcento(valor), x + 8, y + 32);
}

export async function gerarPdfRelatorioAuditoria(dados: DadosRelatorioAuditoria) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const a = dados.auditoria;
  const rb = dados.rebalanceamento;

  cabecalho(
    doc,
    `Auditoria da sua carteira · Perfil ${rotuloPerfil(dados.perfil)}`,
    dados.gerado_em,
  );

  let y = 128;

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
  doc.text(
    semAcento(
      `Patrimônio atual: ${brl(a.patrimonio_total)} · Total investido: ${brl(a.total_investido)} · ${a.numero_ativos} ativos em ${a.numero_classes} classes`,
    ),
    M,
    y,
  );
  y += 14;

  doc.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
  doc.roundedRect(M, y - 12, CONTEUDO, 24, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const seloTexto = `Selo: ${a.selo} · Score de diversificação ${a.score_diversificacao}/100`;
  doc.text(semAcento(seloTexto), M + 10, y + 2);
  y += 26;

  // KPI cards (2 linhas x 3 colunas)
  const colW = (CONTEUDO - 16) / 3;
  const kpis: [string, string, readonly [number, number, number]][] = [
    [
      "Rentabilidade geral",
      `${a.rentabilidade_pct.toFixed(1).replace(".", ",")}%`,
      a.rentabilidade_pct >= 0 ? OK : ERRO,
    ],
    ["Lucro/prejuízo", brl(a.lucro_total), a.lucro_total >= 0 ? OK : ERRO],
    ["Dividendos est. 12m", brl(a.dividendos_estimados_12m), VERDE_CLARO],
    ["DY da carteira", `${a.dy_carteira_pct.toFixed(2).replace(".", ",")}%`, VERDE_CLARO],
    ["Maior posição", a.concentracao.maior_ativo ?? "—", a.concentracao.top1_pct > 30 ? AVISO : OK],
    ["Renda passiva/mês", brl(Math.round(a.dividendos_estimados_12m / 12)), VERDE_CLARO],
  ];

  kpis.forEach(([rotulo, valor, cor], i) => {
    const col = i % 3;
    kpiCard(doc, M + col * (colW + 8), y, colW, rotulo, valor, cor);
  });
  y += 46 * 2 + 14;

  // Alocação por classe
  y = tituloSecao(doc, "Alocação por classe de ativos", y);
  y += 6;
  a.alocacao_por_classe.forEach((c) => {
    if (y > RODAPE - 30) {
      doc.addPage();
      y = 40;
      rodape(doc);
      y = tituloSecao(doc, "Alocação por classe de ativos (continuação)", y);
      y += 6;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
    doc.text(semAcento(c.classe.slice(0, 60)), M, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${c.pct.toFixed(1).replace(".", ",")}%`, LARGURA - M - 30, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
    doc.text(brl(c.valor), LARGURA - M, y, { align: "right" });
    barra(doc, y + 6, M, CONTEUDO, c.pct, VERDE_CLARO);
    y += 22;
  });
  y += 10;

  // Concentração
  y = tituloSecao(doc, "Concentração", y);
  y += 6;
  const conc = a.concentracao;
  const linhasConc: [string, number, readonly [number, number, number]][] = [
    ["Maior ativo", conc.top1_pct, conc.top1_pct > 30 ? ERRO : conc.top1_pct > 15 ? AVISO : OK],
    ["Top 3 ativos", conc.top3_pct, conc.top3_pct > 60 ? AVISO : OK],
    ["Top 5 ativos", conc.top5_pct, OK],
  ];
  linhasConc.forEach(([rotulo, valor, cor]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
    doc.text(semAcento(rotulo), M, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(cor[0], cor[1], cor[2]);
    doc.text(`${valor.toFixed(1).replace(".", ",")}%`, LARGURA - M, y, { align: "right" });
    barra(doc, y + 6, M, CONTEUDO, valor, cor);
    y += 22;
  });
  y += 8;

  // Pontos fortes e fracos
  const fortes = a.pontos_fortes;
  const fracos = a.pontos_fracos;
  y = tituloSecao(doc, "Pontos fortes e pontos de atenção", y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(OK[0], OK[1], OK[2]);
  doc.text("Pontos fortes", M, y);
  doc.setTextColor(ERRO[0], ERRO[1], ERRO[2]);
  doc.text("Pontos de atenção", M + CONTEUDO / 2, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const alturaCol = (texto: string) => {
    const linhas = quebrarTexto(doc, `• ${texto}`, CONTEUDO / 2 - 12);
    return Math.max(11, linhas.length * 10.5);
  };
  const maxPares = Math.max(fortes.length, fracos.length);
  for (let i = 0; i < maxPares; i++) {
    if (y > RODAPE - 16) {
      doc.addPage();
      y = 40;
      rodape(doc);
    }
    const altF = fortes[i] ? alturaCol(fortes[i]) : 0;
    const altFr = fracos[i] ? alturaCol(fracos[i]) : 0;
    if (fortes[i]) {
      const linhas = quebrarTexto(doc, `• ${fortes[i]}`, CONTEUDO / 2 - 12);
      doc.setTextColor(60, 60, 60);
      doc.text(linhas, M + 6, y);
    }
    if (fracos[i]) {
      const linhas = quebrarTexto(doc, `• ${fracos[i]}`, CONTEUDO / 2 - 12);
      doc.setTextColor(ERRO[0], ERRO[1], ERRO[2]);
      doc.text(linhas, M + CONTEUDO / 2 + 6, y);
    }
    y += Math.max(altF, altFr);
  }
  y += 12;

  // Rebalanceamento
  y = tituloSecao(doc, "Plano de rebalanceamento sugerido", y);
  y += 8;
  const colClasse = 170;
  const colAtual = 90;
  const colAlvo = 90;
  const cabecs = [
    ["Classe", M],
    ["Atual", M + colClasse],
    ["Alvo", M + colClasse + colAtual],
    ["Diferença", M + colClasse + colAtual + colAlvo],
  ] as const;

  doc.setFillColor(240, 244, 241);
  doc.roundedRect(M, y - 12, CONTEUDO, 20, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
  cabecs.forEach(([txt, x]) => doc.text(semAcento(txt), x, y + 1));
  y += 14;

  doc.setFont("helvetica", "normal");
  rb.por_classe.forEach((l) => {
    if (y > RODAPE - 14) {
      doc.addPage();
      y = 40;
      rodape(doc);
    }
    doc.setFontSize(8.5);
    doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
    doc.text(semAcento(l.classe.slice(0, 40)), M, y);
    doc.text(`${l.pct_atual.toFixed(1).replace(".", ",")}%`, M + colClasse, y);
    doc.text(`${l.pct_alvo.toFixed(1).replace(".", ",")}%`, M + colClasse + colAtual, y);
    doc.setFont("helvetica", "bold");
    const cor = l.status === "ok" ? CINZA : l.status === "aportar" ? OK : ERRO;
    doc.setTextColor(cor[0], cor[1], cor[2]);
    const texto =
      l.status === "ok"
        ? "ok"
        : l.status === "aportar"
          ? `aportar ${brl(l.diferenca)}`
          : `reduzir ${brl(Math.abs(l.diferenca))}`;
    doc.text(semAcento(texto), M + colClasse + colAtual + colAlvo, y);
    y += 14;
  });

  if (rb.prioridades_de_aporte.length > 0) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
    doc.text("Prioridades de aporte", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    rb.prioridades_de_aporte.forEach((p) => {
      if (y > RODAPE - 14) {
        doc.addPage();
        y = 40;
        rodape(doc);
      }
      doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
      doc.text(
        semAcento(
          `${p.classe.slice(0, 40)} · atual ${p.pct_atual.toFixed(1).replace(".", ",")}% → alvo ${p.pct_alvo}% · aporte sugerido ${brl(p.quanto_aportar)}`,
        ),
        M + 6,
        y,
      );
      y += 13;
    });
  }
  y += 10;

  // Projeção de independência financeira
  y = tituloSecao(doc, "Projeção de independência financeira", y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
  const proj = dados.projecao;
  const linhasProj: [string, string][] = [
    ["Patrimônio projetado", brl(proj.patrimonio_projetado)],
    ["Em valor de hoje", brl(proj.patrimonio_projetado_real)],
    ["Renda passiva projetada/mês", brl(proj.renda_passiva_mensal_projetada)],
    ["Total aportado projetado", brl(proj.total_aportado_projetado)],
    [
      "Primeiro milhão",
      proj.primeiro_milhao_em ? `Em ${proj.primeiro_milhao_em}` : "Após o período",
    ],
    [
      "Premissas",
      `${dados.plano_utilizado.idadeAtual} → ${dados.plano_utilizado.idadeAposentadoria} anos · aporte ${brl(dados.plano_utilizado.aporteMensal)}/mês · ${String(dados.plano_utilizado.rentabilidadeAnual).replace(".", ",")}% a.a. · inflação ${String(dados.plano_utilizado.inflacaoAnual).replace(".", ",")}% · retirada ${String(dados.plano_utilizado.taxaRetirada).replace(".", ",")}%`,
    ],
  ];
  linhasProj.forEach(([rotulo, valor], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(M, y - 10, CONTEUDO, 18, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
    doc.text(semAcento(rotulo), M + 6, y + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
    doc.text(semAcento(valor), LARGURA - M - 6, y + 2, { align: "right" });
    y += 18;
  });

  // Tabela ano a ano
  if (proj.projecao_ano_a_ano.length > 0) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
    doc.text("Evolução projetada ano a ano", M, y);
    y += 12;

    const larguraTabela = CONTEUDO;
    const colAno = 80;
    const colIdade = 80;
    const colPat = (larguraTabela - colAno - colIdade) / 2;

    doc.setFillColor(240, 244, 241);
    doc.roundedRect(M, y - 12, CONTEUDO, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
    doc.text("Ano", M + 6, y + 1);
    doc.text("Idade", M + colAno, y + 1);
    doc.text("Patrimônio", M + colAno + colIdade, y + 1);
    doc.text("Renda passiva/mês", M + colAno + colIdade + colPat, y + 1);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const passos = Math.max(1, Math.round(proj.projecao_ano_a_ano.length / 18));
    proj.projecao_ano_a_ano.forEach((l, i) => {
      const ultimo = i === proj.projecao_ano_a_ano.length - 1;
      if (i % passos !== 0 && !ultimo) return;
      if (y > RODAPE - 12) {
        doc.addPage();
        y = 40;
        rodape(doc);
      }
      if (i % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(M, y - 10, CONTEUDO, 12, "F");
      }
      doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
      doc.text(String(l.ano), M + 6, y + 2);
      doc.text(String(l.idade), M + colAno, y + 2);
      doc.text(brl(l.patrimonio), M + colAno + colIdade, y + 2);
      doc.text(brl(l.renda_passiva_mensal), M + colAno + colIdade + colPat, y + 2);
      y += 12;
    });
  }
  y += 8;

  // Metas
  y = tituloSecao(doc, "Progresso das metas", y);
  y += 8;
  if (dados.metas.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
    doc.text("Nenhuma meta cadastrada.", M, y);
    y += 16;
  } else {
    dados.metas.forEach((m) => {
      if (y > RODAPE - 20) {
        doc.addPage();
        y = 40;
        rodape(doc);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
      doc.text(semAcento(m.nome.slice(0, 45)), M, y);
      doc.setFont("helvetica", "bold");
      const cor = m.atingida ? OK : m.progresso_pct >= 50 ? AVISO : CINZA;
      doc.setTextColor(cor[0], cor[1], cor[2]);
      doc.text(`${m.progresso_pct.toFixed(0).replace(".", ",")}%`, LARGURA - M, y, {
        align: "right",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
      const detalhe = m.atingida ? "Meta atingida" : `Falta ${brl(m.falta)} para ${brl(m.alvo)}`;
      doc.text(semAcento(detalhe), LARGURA - M, y + 11, { align: "right" });
      barra(doc, y + 12, M, CONTEUDO, m.progresso_pct, cor);
      y += 28;
    });
  }
  y += 6;

  // Resumo de aportes e dividendos
  y = tituloSecao(doc, "Aportes e proventos registrados", y);
  y += 8;
  const colRotulo = 150;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
  doc.text(`Total aportado: ${brl(dados.aportes.total_aportado)}`, M, y);
  doc.text(`Proventos recebidos: ${brl(dados.dividendos.total_recebido)}`, M + colRotulo, y);
  y += 14;
  doc.setFontSize(8);
  doc.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
  doc.text(
    `Média mensal de aportes: ${brl(dados.aportes.media_mensal)} · ${dados.aportes.numero_aportes} lançamentos`,
    M,
    y,
  );
  doc.text(
    `Média mensal de proventos: ${brl(dados.dividendos.media_mensal)} · yield on cost ${dados.dividendos.yield_on_cost_pct.toFixed(2).replace(".", ",")}%`,
    M + colRotulo,
    y,
  );
  y += 16;

  // Tabela de ativos
  if (dados.resumo_ativos.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(VERDE[0], VERDE[1], VERDE[2]);
    doc.text("Detalhamento da carteira", M, y);
    y += 12;

    const colTicker = 90;
    const colCat = 120;
    const colQtd = 70;
    const colPM = 90;
    const colPreco = 90;
    const colPct = 60;

    doc.setFillColor(240, 244, 241);
    doc.roundedRect(M, y - 12, CONTEUDO, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
    doc.text("Ticker", M + 4, y + 1);
    doc.text("Categoria", M + colTicker, y + 1);
    doc.text("Qtd", M + colTicker + colCat, y + 1);
    doc.text("PM", M + colTicker + colCat + colQtd, y + 1);
    doc.text("Preço", M + colTicker + colCat + colQtd + colPM, y + 1);
    doc.text("Pct", M + colTicker + colCat + colQtd + colPM + colPreco, y + 1);
    doc.text("Valor", M + colTicker + colCat + colQtd + colPM + colPreco + colPct, y + 1);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    dados.resumo_ativos.forEach((ativo, i) => {
      if (y > RODAPE - 12) {
        doc.addPage();
        y = 40;
        rodape(doc);
      }
      if (i % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(M, y - 10, CONTEUDO, 12, "F");
      }
      doc.setTextColor(TEXTO[0], TEXTO[1], TEXTO[2]);
      doc.text(semAcento(ativo.ticker.slice(0, 10)), M + 4, y + 2);
      doc.text(semAcento(ativo.categoria.slice(0, 18)), M + colTicker, y + 2);
      doc.text(ativo.quantidade.toLocaleString("pt-BR"), M + colTicker + colCat, y + 2);
      doc.text(brl(ativo.preco_medio, 2), M + colTicker + colCat + colQtd, y + 2);
      doc.text(brl(ativo.preco_atual, 2), M + colTicker + colCat + colQtd + colPM, y + 2);
      doc.text(
        `${ativo.pct.toFixed(1).replace(".", ",")}%`,
        M + colTicker + colCat + colQtd + colPM + colPreco,
        y + 2,
      );
      doc.text(
        brl(ativo.valor_atual),
        M + colTicker + colCat + colQtd + colPM + colPreco + colPct,
        y + 2,
      );
      y += 12;
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(CINZA[0], CINZA[1], CINZA[2]);
  const nPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= nPaginas; i++) {
    doc.setPage(i);
    rodape(doc);
  }

  doc.save(`Auditoria_Carteira_${new Date(dados.gerado_em).toISOString().slice(0, 10)}.pdf`);
}
