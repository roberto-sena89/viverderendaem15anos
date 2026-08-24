/**
 * Score do Investidor — nota geral (0–100) do usuário como investidor,
 * calculada a partir de dados reais da carteira. É gamificação com
 * transparência: cada pilar mostra o que contribuiu.
 *
 * Pilares:
 *  1. Disciplina de aportes (peso 30)  — constância e crescimento dos aportes
 *  2. Diversificação (peso 25)         — concentração da carteira
 *  3. Progresso das metas (peso 20)    — % das metas atingido
 *  4. Renda passiva (peso 15)          — dividendos vs. patrimônio
 *  5. Horizonte (peso 10)              — tempo investindo / regularidade
 */

import type { Ativo, Aporte, Dividendo, Meta } from "@/lib/portfolio";

export interface PilarScore {
  chave: "disciplina" | "diversificacao" | "metas" | "renda" | "horizonte";
  rotulo: string;
  nota: number; // 0–100
  peso: number; // %
  detalhe: string;
}

export interface ScoreInvestidor {
  nota: number; // 0–100
  nivel: { id: string; nome: string; faixa: [number, number] };
  pilares: PilarScore[];
  proximoNivel: { nome: string; falta: number } | null;
  conquistas: string[];
}

export const NIVEIS_INVESTIDOR = [
  { id: "iniciante", nome: "Iniciante", faixa: [0, 29] as [number, number] },
  { id: "aprendiz", nome: "Aprendiz", faixa: [30, 49] as [number, number] },
  { id: "disciplinado", nome: "Disciplinado", faixa: [50, 69] as [number, number] },
  { id: "estratega", nome: "Estrategista", faixa: [70, 89] as [number, number] },
  { id: "lenda", nome: "Lenda do Milhão", faixa: [90, 100] as [number, number] },
];

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

function nivelDaNota(nota: number) {
  return (
    NIVEIS_INVESTIDOR.find((n) => nota >= n.faixa[0] && nota <= n.faixa[1]) ?? NIVEIS_INVESTIDOR[0]
  );
}

export function calcularScoreInvestidor(input: {
  ativos: Ativo[];
  aportes: Aporte[];
  dividendos: Dividendo[];
  metas: Meta[];
}): ScoreInvestidor {
  const { ativos, aportes, dividendos, metas } = input;
  const conquistas: string[] = [];

  /* 1. Disciplina de aportes (30%) */
  let notaDisciplina = 0;
  let detalheDisciplina = "";
  const ordenados = [...aportes].sort((a, b) => a.data.localeCompare(b.data));
  if (ordenados.length === 0) {
    detalheDisciplina = "Nenhum aporte registrado ainda.";
  } else {
    const primeiro = new Date(ordenados[0].data);
    const meses = Math.max(1, Math.round((Date.now() - primeiro.getTime()) / (30.44 * 86_400_000)));
    const mesesComAporte = new Set(ordenados.map((a) => a.data.slice(0, 7))).size;
    const constancia = clamp((mesesComAporte / meses) * 100);
    const totalAportado = ordenados.reduce(
      (s, a) => s + Number(a.valor ?? a.preco * a.quantidade) + Number(a.taxas ?? 0),
      0,
    );
    // Aportes consistentes = bom. R$ 0-500/mês baixo, R$ 5000+/mês alto.
    const mediaMensal = totalAportado / meses;
    const volume = clamp((mediaMensal / 10_000) * 100);
    notaDisciplina = Math.round(constancia * 0.6 + volume * 0.4);
    detalheDisciplina = `${mesesComAporte}/${meses} meses com aporte (${Math.round(constancia)}% constância), média de R$ ${mediaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}/mês.`;
    if (constancia >= 80) conquistas.push("📅 Aportes consistentes");
    if (totalAportado >= 50_000) conquistas.push("💰 R$ 50 mil aportados");
  }

  /* 2. Diversificação (25%) */
  let notaDiv = 0;
  let detalheDiv = "";
  const total = ativos.reduce((s, a) => s + Number(a.quantidade) * Number(a.precoAtual), 0);
  if (total <= 0 || ativos.length === 0) {
    detalheDiv = "Sem posições para avaliar diversificação.";
  } else {
    const porAtivo = ativos
      .map((a) => ({ ticker: a.ticker, valor: Number(a.quantidade) * Number(a.precoAtual) }))
      .sort((a, b) => b.valor - a.valor);
    const maior = porAtivo[0]?.valor ?? 0;
    const pctMaior = (maior / total) * 100;
    // Até 2 ativos = 0; 5+ ativos bem distribuídos = alto
    const qtde = ativos.length;
    const fatorQtde = clamp(((qtde - 2) / 8) * 100);
    const fatorConcentracao = clamp(100 - pctMaior * 0.7);
    notaDiv = Math.round(fatorQtde * 0.5 + fatorConcentracao * 0.5);
    detalheDiv = `${qtde} ativos; o maior representa ${pctMaior.toFixed(0)}% do patrimônio.`;
    if (qtde >= 8 && pctMaior < 25) conquistas.push("🧺 Carteira bem diversificada");
    if (pctMaior > 50) conquistas.push("⚠️ Concentração alta no maior ativo");
  }

  /* 3. Progresso das metas (20%) */
  let notaMetas = 0;
  let detalheMetas = "";
  if (metas.length === 0) {
    detalheMetas = "Nenhuma meta cadastrada. Defina metas para acompanhar seu progresso.";
    notaMetas = 30;
  } else {
    const progressos = metas.map((m) => clamp((total / Number(m.alvo)) * 100));
    const media = progressos.reduce((a, b) => a + b, 0) / progressos.length;
    notaMetas = Math.round(media);
    const atingidas = progressos.filter((p) => p >= 100).length;
    detalheMetas = `${atingidas}/${metas.length} metas atingidas; progresso médio de ${Math.round(media)}%.`;
    if (atingidas > 0) conquistas.push(`🎯 ${atingidas} meta(s) atingida(s)`);
  }

  /* 4. Renda passiva (15%) */
  let notaRenda = 0;
  let detalheRenda = "";
  const dividendos12m = dividendos
    .filter((d) => new Date(d.data) >= new Date(Date.now() - 366 * 86_400_000))
    .reduce((s, d) => s + Number(d.valor), 0);
  if (dividendos12m > 0 && total > 0) {
    const yieldAnual = (dividendos12m / total) * 100;
    notaRenda = clamp(((yieldAnual - 2) / 10) * 100); // 2% = 0, 12%+ = 100
    detalheRenda = `R$ ${dividendos12m.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} de proventos em 12m (yield ${yieldAnual.toFixed(1)}%).`;
    if (yieldAnual >= 6) conquistas.push("🍃 Yield anual acima de 6%");
  } else {
    detalheRenda = "Sem proventos recebidos nos últimos 12 meses.";
    notaRenda = 0;
  }

  /* 5. Horizonte (10%) */
  let notaHorizonte = 0;
  let detalheHorizonte = "";
  if (ordenados.length === 0) {
    detalheHorizonte = "Sem histórico de aportes.";
  } else {
    const primeiro = new Date(ordenados[0].data);
    const anos = (Date.now() - primeiro.getTime()) / (365.25 * 86_400_000);
    notaHorizonte = clamp(anos * 20); // 5 anos = 100
    detalheHorizonte = `${anos.toFixed(1)} anos de histórico de aportes.`;
    if (anos >= 3) conquistas.push("🏆 3+ anos de jornada");
  }

  const pilares: PilarScore[] = [
    {
      chave: "disciplina",
      rotulo: "Disciplina de aportes",
      nota: notaDisciplina,
      peso: 30,
      detalhe: detalheDisciplina,
    },
    {
      chave: "diversificacao",
      rotulo: "Diversificação",
      nota: notaDiv,
      peso: 25,
      detalhe: detalheDiv,
    },
    {
      chave: "metas",
      rotulo: "Progresso das metas",
      nota: notaMetas,
      peso: 20,
      detalhe: detalheMetas,
    },
    { chave: "renda", rotulo: "Renda passiva", nota: notaRenda, peso: 15, detalhe: detalheRenda },
    {
      chave: "horizonte",
      rotulo: "Horizonte",
      nota: notaHorizonte,
      peso: 10,
      detalhe: detalheHorizonte,
    },
  ];

  const nota = Math.round(pilares.reduce((s, p) => s + p.nota * (p.peso / 100), 0));
  const nivel = nivelDaNota(nota);
  const idx = NIVEIS_INVESTIDOR.findIndex((n) => n.id === nivel.id);
  const proximo =
    idx >= 0 && idx < NIVEIS_INVESTIDOR.length - 1 ? NIVEIS_INVESTIDOR[idx + 1] : null;
  const falta = proximo ? Math.max(0, proximo.faixa[0] - nota) : null;

  if (nota >= 90) conquistas.push("👑 Nível máximo alcançado");

  return {
    nota,
    nivel,
    pilares,
    proximoNivel: proximo ? { nome: proximo.nome, falta: falta ?? 0 } : null,
    conquistas: [...new Set(conquistas)],
  };
}
