import { classeDoAtivo, CLASSE_POS_FIXADO } from "@/lib/portfolio";

export type PerfilInvestidor = "conservador" | "moderado" | "agressivo";

export interface AtivoLinha {
  ticker: string;
  categoria: string;
  quantidade: number;
  preco_medio: number;
  preco_atual: number;
  dy: number;
}

export interface LinhaAlocacao {
  classe: string;
  valor: number;
  pct: number;
}

export interface AuditoriaCarteira {
  patrimonio_total: number;
  total_investido: number;
  lucro_total: number;
  rentabilidade_pct: number;
  dividendos_estimados_12m: number;
  dy_carteira_pct: number;
  numero_ativos: number;
  numero_classes: number;
  alocacao_por_classe: LinhaAlocacao[];
  concentracao: {
    maior_ativo: string | null;
    top1_pct: number;
    top3_pct: number;
    top5_pct: number;
  };
  score_diversificacao: number;
  pontos_fortes: string[];
  pontos_fracos: string[];
  selo: string;
}

export interface LinhaRebalanceamento {
  classe: string;
  pct_atual: number;
  pct_alvo: number;
  valor_atual: number;
  valor_alvo: number;
  diferenca: number;
  status: "ok" | "aportar" | "reduzir";
}

export interface PlanoRebalanceamento {
  patrimonio_atual: number;
  alvo_utilizado: Record<string, number>;
  por_classe: LinhaRebalanceamento[];
  prioridades_de_aporte: {
    classe: string;
    pct_atual: number;
    pct_alvo: number;
    quanto_aportar: number;
  }[];
  classes_sobrealocadas: {
    classe: string;
    pct_atual: number;
    pct_alvo: number;
    quanto_reduzir: number;
  }[];
}

/** Alocação estratégica recomendada para cada perfil de investidor. */
export const ALOCACAO_POR_PERFIL: Record<PerfilInvestidor, Record<string, number>> = {
  conservador: {
    [CLASSE_POS_FIXADO]: 70,
    "ETFs - Brasil": 12,
    "ETFs - Global": 12,
    FIIs: 6,
  },
  moderado: {
    [CLASSE_POS_FIXADO]: 50,
    "ETFs - Brasil": 20,
    "ETFs - Global": 20,
    FIIs: 10,
  },
  agressivo: {
    [CLASSE_POS_FIXADO]: 30,
    "ETFs - Brasil": 30,
    "ETFs - Global": 25,
    FIIs: 10,
    Ações: 5,
  },
};

export const ARRED = (v: number) => Math.round(v * 100) / 100;

export function alocacaoAtualPorClasse(ativos: AtivoLinha[]): LinhaAlocacao[] {
  const total = ativos.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const mapa = new Map<string, number>();
  for (const a of ativos) {
    const classe = classeDoAtivo({
      id: "",
      ticker: a.ticker,
      nome: a.ticker,
      categoria: a.categoria as never,
      quantidade: a.quantidade,
      precoMedio: a.preco_medio,
      precoAtual: a.preco_atual,
      dy: a.dy,
    });
    mapa.set(classe, (mapa.get(classe) ?? 0) + a.quantidade * a.preco_atual);
  }
  return [...mapa.entries()]
    .map(([classe, valor]) => ({
      classe,
      valor,
      pct: total > 0 ? (valor / total) * 100 : 0,
    }))
    .sort((x, y) => y.valor - x.valor);
}

export function analisarCarteiraDe(ativos: AtivoLinha[]): AuditoriaCarteira {
  const total = ativos.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const investido = ativos.reduce((s, a) => s + a.quantidade * a.preco_medio, 0);
  const dividendos = ativos.reduce((s, a) => s + (a.quantidade * a.preco_atual * a.dy) / 100, 0);
  const dy = total > 0 ? (dividendos / total) * 100 : 0;
  const classes = alocacaoAtualPorClasse(ativos);

  const ordenados = [...ativos].sort(
    (x, y) => y.quantidade * y.preco_atual - x.quantidade * x.preco_atual,
  );
  const top1 = ordenados[0];
  const top1Valor = top1 ? top1.quantidade * top1.preco_atual : 0;
  const top3Valor = ordenados.slice(0, 3).reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const top5Valor = ordenados.slice(0, 5).reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const top1Pct = total > 0 ? (top1Valor / total) * 100 : 0;
  const top3Pct = total > 0 ? (top3Valor / total) * 100 : 0;
  const top5Pct = total > 0 ? (top5Valor / total) * 100 : 0;

  const concentracao = classes.length === 0 ? 0 : Math.max(...classes.map((c) => c.pct));
  const temRendaFixa = classes.some((c) => c.classe === CLASSE_POS_FIXADO);
  const temEquities = classes.some((c) =>
    ["Ações", "ETFs - Brasil", "ETFs - Global", "BDRs", "Stocks"].includes(c.classe),
  );
  const temFiis = classes.some((c) => c.classe === "FIIs");

  const pontosFracos: string[] = [];
  const pontosFortes: string[] = [];

  if (ativos.length === 0) {
    pontosFracos.push("Carteira vazia: comece definindo o perfil e faça o primeiro aporte.");
  }
  if (top1Pct > 50)
    pontosFracos.push(
      `Concentração alta no topo: ${top1?.ticker} sozinho pesa ${top1Pct.toFixed(0)}% do patrimônio.`,
    );
  else if (top1Pct > 30)
    pontosFracos.push(
      `Concentração relevante: ${top1?.ticker} responde por ${top1Pct.toFixed(0)}% da carteira.`,
    );
  else if (top1Pct > 0 && top1Pct <= 30)
    pontosFortes.push(
      `Boa distribuição: nenhum ativo passa de ${top1Pct.toFixed(0)}% da carteira.`,
    );
  if (ativos.length > 0 && ativos.length < 5)
    pontosFracos.push(`Poucos ativos (${ativos.length}): risco individual ainda alto.`);
  else if (ativos.length >= 10)
    pontosFortes.push(`Carteira com ${ativos.length} ativos: boa capilaridade de posições.`);
  if (!temRendaFixa && ativos.length > 0)
    pontosFracos.push(
      "Sem reserva/renda fixa: carteira fica exposta a quedas sem colchão de segurança.",
    );
  if (!temEquities && ativos.length > 0)
    pontosFracos.push("Sem exposição a ações/ETFs: baixo potencial de crescimento de longo prazo.");
  if (!temFiis && ativos.length > 0)
    pontosFracos.push("Sem FIIs: faltam ativos geradores de renda recorrente (dividendos).");
  if (temEquities && temRendaFixa && ativos.length > 0)
    pontosFortes.push("Mix equilibrado entre renda fixa e renda variável.");
  if (dy >= 6)
    pontosFortes.push(`DY elevado (${dy.toFixed(1)}% a.a.): boa geração de renda passiva.`);
  else if (dy > 0 && dy < 2 && ativos.length > 0)
    pontosFracos.push(`DY baixo (${dy.toFixed(1)}%): renda passiva ainda tímida.`);
  if (top3Pct < 60 && ativos.length >= 5)
    pontosFortes.push("Os 3 maiores ativos somam menos de 60%: concentração sob controle.");
  if (concentracao > 70)
    pontosFracos.push(
      `A classe dominante concentra ${concentracao.toFixed(0)}%: rebalancear para a estratégia-alvo reduz risco.`,
    );

  const score = Math.max(
    0,
    Math.min(
      100,
      (ativos.length >= 10 ? 25 : ativos.length >= 5 ? 18 : ativos.length >= 3 ? 12 : 4) +
        (top1Pct <= 15 ? 25 : top1Pct <= 30 ? 18 : top1Pct <= 50 ? 8 : 2) +
        (temRendaFixa ? 15 : 0) +
        (temEquities ? 15 : 0) +
        (temFiis ? 10 : 0) +
        (dy >= 4 ? 10 : dy >= 2 ? 5 : 0),
    ),
  );

  return {
    patrimonio_total: Math.round(total),
    total_investido: Math.round(investido),
    lucro_total: Math.round(total - investido),
    rentabilidade_pct: ARRED(investido > 0 ? ((total - investido) / investido) * 100 : 0),
    dividendos_estimados_12m: Math.round(dividendos),
    dy_carteira_pct: ARRED(dy),
    numero_ativos: ativos.length,
    numero_classes: classes.length,
    alocacao_por_classe: classes.map((c) => ({
      classe: c.classe,
      valor: Math.round(c.valor),
      pct: ARRED(c.pct),
    })),
    concentracao: {
      maior_ativo: top1?.ticker ?? null,
      top1_pct: ARRED(top1Pct),
      top3_pct: ARRED(top3Pct),
      top5_pct: ARRED(top5Pct),
    },
    score_diversificacao: score,
    pontos_fortes: pontosFortes,
    pontos_fracos: pontosFracos,
    selo:
      score >= 75
        ? "Saúde financeira sólida"
        : score >= 50
          ? "Carteira em construção"
          : "Riscos a corrigir",
  };
}

export function planoDeRebalanceamento(
  ativos: AtivoLinha[],
  alvo: Record<string, number>,
): PlanoRebalanceamento {
  const atual = alocacaoAtualPorClasse(ativos);
  const total = ativos.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const presentes = new Set(atual.map((c) => c.classe));
  const todas = [...new Set([...Object.keys(alvo), ...presentes])];

  const linhas: LinhaRebalanceamento[] = todas.map((classe) => {
    const linha = atual.find((c) => c.classe === classe);
    const pctAtual = linha?.pct ?? 0;
    const pctAlvo = alvo[classe] ?? 0;
    const valorAtual = linha?.valor ?? 0;
    const valorAlvo = (pctAlvo / 100) * total;
    const diferenca = valorAlvo - valorAtual;
    return {
      classe,
      pct_atual: ARRED(pctAtual),
      pct_alvo: pctAlvo,
      valor_atual: Math.round(valorAtual),
      valor_alvo: Math.round(valorAlvo),
      diferenca: Math.round(diferenca),
      status: Math.abs(diferenca) < 100 ? "ok" : diferenca > 0 ? "aportar" : "reduzir",
    };
  });

  const aportar = linhas
    .filter((l) => l.status === "aportar")
    .sort((a, b) => b.diferenca - a.diferenca);
  const reduzir = linhas
    .filter((l) => l.status === "reduzir")
    .sort((a, b) => a.diferenca - b.diferenca);

  return {
    patrimonio_atual: Math.round(total),
    alvo_utilizado: alvo,
    por_classe: linhas,
    prioridades_de_aporte: aportar.slice(0, 4).map((l) => ({
      classe: l.classe,
      pct_atual: l.pct_atual,
      pct_alvo: l.pct_alvo,
      quanto_aportar: l.diferenca,
    })),
    classes_sobrealocadas: reduzir.slice(0, 4).map((l) => ({
      classe: l.classe,
      pct_atual: l.pct_atual,
      pct_alvo: l.pct_alvo,
      quanto_reduzir: Math.abs(l.diferenca),
    })),
  };
}
