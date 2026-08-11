/**
 * Score Gestor: análise unificada de qualidade para decisão de aporte.
 *
 * Consolida em uma única nota (0–100) os pilares usados na mesa de gestão:
 * fundamentos (score Buy & Hold com ajuste setorial), oportunidade de preço
 * (radar, com robustez da distribuição histórica), qualidade dos dividendos
 * (DY + payout + consistência), prêmio da renda variável sobre a renda fixa
 * (DY vs Selic) e liquidez/endividamento — e traduz a nota em rating
 * (A/B/C/D), veredito, bandeiras de risco (incluindo volatilidade extrema) e
 * limite de aporte para posições de alto valor. É uma ferramenta de triagem e
 * gestão de risco, não recomendação formal de investimento.
 */

import { CORES_SCORE, type RotuloScore, type TipoSinal, rotuloScore } from "./radar-base";

export type RatingGestor = "A" | "B" | "C" | "D";

export type VereditoGestor = "comprar" | "observar" | "evitar";

export type RegimeTributario = "real" | "presumido" | null;

/** Entradas necessárias para avaliar um ativo na ótica do gestor. */
export type EntradasScoreGestor = {
  ticker: string;

  /** Score fundamentalista Buy & Hold (0–100) — de `pontuacaoBuyAndHold`. */
  fundamentos: number | null;
  /** Score de oportunidade do radar (0–100). */
  oportunidade: number | null;
  /** Sinal do radar — usado para sobrepor o veredito em caso de choque. */
  sinal: TipoSinal;

  dy12: number | null;
  pl: number | null;
  /** Payout em % (0–100+). Quando null, é estimado a partir de DY × P/L. */
  payout: number | null;
  /** Volume médio diário em reais (liquidez). */
  liquidez: number | null;
  /** Dívida/Patrimônio (vezes). */
  dividaPatrimonio: number | null;
  /** Margem líquida em %. Negativa indica prejuízo. */
  margemLiquida: number | null;

  /** Regime tributário da companhia — hoje informativo, não penaliza a nota. */
  regime: RegimeTributario;

  /** Meta Selic anualizada (%) — referencial de renda fixa para o prêmio do DY. */
  selic: number | null;
  /** Setor macro da companhia (defensivo/cíclico) — ajusta a nota de fundamentos. */
  setor: string | null;
  /** Anos consecutivos pagando dividendos. Null = histórico desconhecido. */
  consistenciaDividendos: number | null;
  /**
   * Posição do preço atual por rank na distribuição semanal (0–100; maior =
   * mais caro). Complementa o percentil de faixa usado no score de
   * oportunidade: na zona cara da distribuição, o papel é caro mesmo "no meio
   * da faixa".
   */
  percentilDistribucional: number | null;
  /** Volatilidade anualizada da série semanal (%). Null = sem histórico. */
  volatilidadeAnualPct: number | null;
  /**
   * Percentil do P/L real (TTM da CVM) na própria história trimestral
   * (0–100; maior = mais caro por valuation). Quando presente, é a fonte
   * preferida do pilar de oportunidade — substitui o percentil distribucional
   * de preço, que era uma aproximação (P/L projetado == posição do preço).
   */
  percentilPlReal: number | null;
};

/** Componente do score com transparência de nota e peso. */
export type ComponenteScoreGestor = {
  chave:
    "fundamentos" | "oportunidade" | "dividendos" | "premioSelic" | "liquidez" | "endividamento";
  rotulo: string;
  nota: number | null;
  peso: number;
  detalhe: string | null;
};

export type ScoreGestor = {
  ticker: string;
  nota: number | null;
  rating: RatingGestor | null;
  veredito: VereditoGestor;
  componentes: ComponenteScoreGestor[];
  /** Bandeiras vermelhas que podem bloquear ou reduzir o aporte. */
  alertas: string[];
  /** Limite de posição sugerido em % do patrimônio (rating) e em R$. */
  limite: LimiteAporte | null;
  motivo: string;
  regime: RegimeTributario;
  /** Setor usado no ajuste setorial da nota (null quando não informado). */
  setor: string | null;
};

export type LimiteAporte = {
  /** Percentual máximo do patrimônio sugerido pelo rating. */
  maxPatrimonioPct: number;
  /** Valor máximo do aporte em R$, limitado também pela liquidez. */
  maxValor: number | null;
  /** Fração do volume diário que a posição não deve ultrapassar (%). */
  impactoVolumePct: number | null;
};

/* ------------------------------------------------------------------ *
 * Pesos e limites
 * ------------------------------------------------------------------ */

export const PESO_FUNDAMENTOS = 0.35;
export const PESO_OPORTUNIDADE = 0.2;
export const PESO_DIVIDENDOS = 0.2;
export const PESO_PREMIO_SELIC = 0.1;
export const PESO_LIQUIDEZ = 0.08;
export const PESO_ENDIVIDAMENTO = 0.07;
/** Peso mínimo acumulado para emitir nota (reescala o score parcial). */
export const PESO_MINIMO_NOTA = 0.5;

export const LIMITE_RATING_A = 75;
export const LIMITE_RATING_B = 60;
export const LIMITE_RATING_C = 45;

/** DY 12m considerado o alvo do pilar de renda do gestor. */
export const DY_ALVO_GESTOR = 8;
/** Payout acima disso é financiado por dívida — bandeira e nota menor. */
export const PAYOUT_MAX_SUSTENTAVEL = 90;
/** Payout acima disso vira bandeira vermelha. */
export const PAYOUT_ALERTA = 100;
/** Dívida/Patrimônio acima disso é bandeira de alavancagem excessiva. */
export const DIVIDA_ALERTA = 2;
/** Volume diário mínimo (R$) para posições de alto valor sem impacto. */
export const LIQUIDEZ_MINIMA_GESTOR = 5_000_000;
/** Posição não deve ultrapassar 10% do volume diário (regra de impacto). */
export const IMPACTO_VOLUME_PCT = 10;

/** DY precisa superar a Selic nesta margem (p.p.) para nota cheia no prêmio. */
export const PREMIO_DY_ACIMA_SELIC_PTS = 4;
/** DY abaixo da Selic nesta margem (p.p.) zera o prêmio. */
export const PREMIO_DY_ABAIXO_SELIC_PTS = 4;
/** DY abaixo da Selic vira bandeira de custo de oportunidade. */
export const SELIC_ALERTA_DY_INFERIOR = 0;
/** Menos anos pagando dividendos que isso é bandeira de consistência. */
export const CONSISTENCIA_ANOS_MINIMA = 3;
/** Anos pagando dividendos considerados "consistência plena" no componente. */
export const CONSISTENCIA_ANOS_PLENA = 10;

/** Posição por rank acima disso sinaliza preço na zona mais cara da história. */
export const PERCENTIL_DISTRIBUCIONAL_ALERTA = 90;
/** Peso do percentil distribucional sobre o score de oportunidade do radar. */
export const PESO_POSICAO_DISTRIBUCIONAL = 0.15;
/** Volatilidade anual acima disso é bandeira fora do perfil de renda passiva. */
export const VOLATILIDADE_ALERTA = 35;
/** Volatilidade anual acima disso bloqueia o aporte (fora da mesa). */
export const VOLATILIDADE_MAX = 60;

/**
 * Ajuste setorial aplicado à nota de fundamentos (pontos): setores defensivos
 * (receita recorrente, menor volatilidade de lucro) ganham; cíclicos ou
 * voláteis perdem. Fora do mapa = neutro (0).
 */
export const AJUSTE_SETOR: Record<string, number> = {
  "Utilidade Pública": 4,
  Financeiro: 3,
  Saúde: 3,
  "Consumo não Cíclico": 3,
  Comunicações: 2,
  "Consumo Cíclico": -2,
  "Bens Industriais": -2,
  "Petróleo, Gás e Biocombustíveis": -2,
  "Materiais Básicos": -3,
  "Tecnologia da Informação": -3,
};

/** Percentual máximo do patrimônio por rating. */
export const LIMITE_PATRIMONIO_POR_RATING: Record<RatingGestor, number> = {
  A: 8,
  B: 5,
  C: 3,
  D: 0,
};

export const ROTULOS_RATING: Record<RatingGestor, string> = {
  A: "Qualidade alta — aportar até o limite",
  B: "Qualidade boa — aporte moderado",
  C: "Qualidade média — aguardar melhora",
  D: "Qualidade baixa — não aportar",
};

export const CORES_RATING: Record<RatingGestor, string> = {
  A: "text-emerald-600 bg-emerald-600/10",
  B: "text-sky-600 bg-sky-600/10",
  C: "text-amber-600 bg-amber-600/10",
  D: "text-red-600 bg-red-600/10",
};

export const CORES_VEREDITO: Record<VereditoGestor, string> = {
  comprar: "text-emerald-600 bg-emerald-600/10",
  observar: "text-sky-600 bg-sky-600/10",
  evitar: "text-red-600 bg-red-600/10",
};

/* ------------------------------------------------------------------ *
 * Componentes
 * ------------------------------------------------------------------ */

function clamp(valor: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, valor));
}

/** Payout estimado: DY (%) × P/L (vezes) = parcela do lucro distribuída. */
export function estimarPayout(dy12: number | null, pl: number | null): number | null {
  if (dy12 === null || pl === null || !Number.isFinite(dy12) || !Number.isFinite(pl)) return null;
  if (dy12 <= 0 || pl <= 0) return null;
  return (dy12 / 100) * pl * 100;
}

function pontosDy(dy12: number | null): number {
  if (dy12 === null || !Number.isFinite(dy12) || dy12 <= 0) return 0;
  return clamp((dy12 / DY_ALVO_GESTOR) * 100, 0, 100);
}

function pontosPayout(payout: number | null): number {
  if (payout === null || !Number.isFinite(payout) || payout <= 0) return 50;
  if (payout <= PAYOUT_MAX_SUSTENTAVEL) return 100;
  if (payout >= PAYOUT_ALERTA * 2) return 0;
  return 100 - ((payout - PAYOUT_MAX_SUSTENTAVEL) / PAYOUT_MAX_SUSTENTAVEL) * 100;
}

/**
 * Componente de dividendos (0–100): 60% rendimento (DY rumo a 8%) e 40%
 * sustentabilidade (payout ≤ 90% = nota cheia, 100% = zero). Quando a
 * consistência é conhecida (anos pagando dividendos), ela absorve 20% do
 * peso do payout, premiando histórico comprovado.
 */
export function pontosDividendos(
  dy12: number | null,
  payout: number | null,
  consistenciaDividendos: number | null = null,
): number {
  const dy = pontosDy(dy12);
  if (consistenciaDividendos === null || !Number.isFinite(consistenciaDividendos)) {
    return Math.round(dy * 0.6 + pontosPayout(payout) * 0.4);
  }
  const consistencia = pontosConsistencia(consistenciaDividendos) ?? 0;
  return Math.round(dy * 0.6 + pontosPayout(payout) * 0.2 + consistencia * 0.2);
}

/**
 * Consistência de dividendos (0–100): anos consecutivos pagando proventos.
 * 10+ anos valem nota cheia; escala linear até lá. Null = neutro (não pontua).
 */
export function pontosConsistencia(anos: number | null): number | null {
  if (anos === null || !Number.isFinite(anos)) return null;
  return Math.round(clamp((anos / CONSISTENCIA_ANOS_PLENA) * 100, 0, 100));
}

/**
 * Prêmio da renda variável sobre a renda fixa (0–100): compara o DY 12m com a
 * Selic. DY ≥ Selic + 4 p.p. = nota cheia; DY ≤ Selic − 4 p.p. = zero; no meio
 * escala linear, com empate (DY = Selic) valendo 50. Sem Selic ou DY, null
 * (o componente fica fora da nota e os pesos são reescalados).
 */
export function pontosPremio(dy12: number | null, selic: number | null): number | null {
  if (dy12 === null || selic === null || !Number.isFinite(dy12) || !Number.isFinite(selic)) {
    return null;
  }
  const premio = dy12 - selic;
  const faixa = PREMIO_DY_ACIMA_SELIC_PTS + PREMIO_DY_ABAIXO_SELIC_PTS;
  return Math.round(clamp(((premio + PREMIO_DY_ABAIXO_SELIC_PTS) / faixa) * 100, 0, 100));
}

/** Ajuste setorial (pontos) da nota de fundamentos; fora do mapa = neutro. */
export function ajusteSetorial(setor: string | null | undefined): number {
  if (!setor) return 0;
  return AJUSTE_SETOR[setor] ?? 0;
}

/**
 * Nota de oportunidade ajustada pelo percentil distribucional: o score do
 * radar posiciona o preço pela faixa (mín–máx); o percentil por rank capta a
 * forma da distribuição — preço "no meio da faixa", mas acima de 90% das
 * leituras históricas, continua caro. Sem percentil, mantém o score original.
 */
export function pontosOportunidadeComDistribuicao(
  score: number | null,
  percentilDistribucional: number | null,
): number | null {
  if (score === null) return null;
  if (
    percentilDistribucional === null ||
    !Number.isFinite(percentilDistribucional) ||
    percentilDistribucional < 0 ||
    percentilDistribucional > 100
  ) {
    return score;
  }
  const valorHistorico = 100 - percentilDistribucional;
  return Math.round(
    clamp(
      score * (1 - PESO_POSICAO_DISTRIBUCIONAL) + valorHistorico * PESO_POSICAO_DISTRIBUCIONAL,
      0,
      100,
    ),
  );
}

/**
 * Apura o percentil que alimenta o pilar de oportunidade: o do P/L real
 * (CVM) quando disponível — valuation de fato — e, sem ele, o da
 * distribuição de preços (aproximação por posição do preço). Entre 0–100,
 * maior = mais caro.
 */
export function percentilValorizacaoEfetivo(e: {
  percentilDistribucional: number | null;
  percentilPlReal: number | null;
}): number | null {
  const pl = e.percentilPlReal;
  if (pl !== null && Number.isFinite(pl) && pl >= 0 && pl <= 100) return pl;
  const pd = e.percentilDistribucional;
  if (pd !== null && Number.isFinite(pd) && pd >= 0 && pd <= 100) return pd;
  return null;
}

function pontosLiquidez(liquidez: number | null): number {
  if (liquidez === null || !Number.isFinite(liquidez) || liquidez <= 0) return 0;
  const pontos = clamp((Math.log10(liquidez) - 4) / (8 - 4), 0, 1) * 100;
  return Math.round(pontos);
}

function pontosEndividamento(dividaPatrimonio: number | null): number {
  if (dividaPatrimonio === null || !Number.isFinite(dividaPatrimonio)) return 50;
  return Math.round(clamp(100 - (dividaPatrimonio / DIVIDA_ALERTA) * 100, 0, 100));
}

function detalheLiquidez(liquidez: number | null): string | null {
  if (liquidez === null || !Number.isFinite(liquidez)) return null;
  if (liquidez >= 50_000_000) return "Liquidez alta (R$ 50M+/dia)";
  if (liquidez >= LIQUIDEZ_MINIMA_GESTOR) return "Liquidez adequada ao gestor";
  return "Liquidez baixa — posições grandes impactam o preço";
}

function detalhePayout(
  dy12: number | null,
  pl: number | null,
  payout: number | null,
): string | null {
  const p = payout ?? estimarPayout(dy12, pl);
  if (p === null) return null;
  if (p > PAYOUT_ALERTA) return `Payout de ${p.toFixed(0)}% — distribui mais do que gera de lucro`;
  if (p > PAYOUT_MAX_SUSTENTAVEL)
    return `Payout de ${p.toFixed(0)}% — próximo do limite sustentável`;
  return `Payout de ${p.toFixed(0)}% — distribuição sustentável`;
}

function detalhePremio(dy12: number | null, selic: number | null): string | null {
  if (dy12 === null || selic === null || !Number.isFinite(dy12) || !Number.isFinite(selic)) {
    return null;
  }
  const premio = dy12 - selic;
  if (premio >= 0) {
    return `DY de ${dy12.toFixed(1)}% vs Selic de ${selic.toFixed(1)}% — prêmio de +${premio.toFixed(1)} p.p. sobre a renda fixa`;
  }
  return `DY de ${dy12.toFixed(1)}% vs Selic de ${selic.toFixed(1)}% — prêmio de ${premio.toFixed(1)} p.p. (abaixo da renda fixa)`;
}

/* ------------------------------------------------------------------ *
 * Avaliação
 * ------------------------------------------------------------------ */

function ratingDaNota(nota: number): RatingGestor {
  if (nota >= LIMITE_RATING_A) return "A";
  if (nota >= LIMITE_RATING_B) return "B";
  if (nota >= LIMITE_RATING_C) return "C";
  return "D";
}

/** Veredito: qualidade + sinal do radar, com sobreposição em caso de choque
 *  ou volatilidade extrema (fora do perfil de renda). */
export function vereditoGestor(
  nota: number | null,
  sinal: TipoSinal,
  volatilidadeAnualPct: number | null = null,
): VereditoGestor {
  if (sinal === "vender") return "evitar";
  if (volatilidadeAnualPct !== null && volatilidadeAnualPct > VOLATILIDADE_MAX) return "evitar";
  if (nota === null) return "observar";
  if (nota >= LIMITE_RATING_A) return "comprar";
  if (nota >= LIMITE_RATING_B) {
    return sinal === "comprar" ? "comprar" : "observar";
  }
  return "evitar";
}

function montarAlertas(e: EntradasScoreGestor): string[] {
  const alertas: string[] = [];
  if (e.sinal === "vender") {
    alertas.push("Sinal de venda no radar — choque em andamento, fora da mesa de aportes");
  }
  const payout = e.payout ?? estimarPayout(e.dy12, e.pl);
  if (payout !== null && payout > PAYOUT_ALERTA) {
    alertas.push("Payout acima de 100% — dividendos financiados por reservas ou dívida");
  }
  if (e.dividaPatrimonio !== null && e.dividaPatrimonio > DIVIDA_ALERTA) {
    alertas.push(`Endividamento elevado (dívida/patrimônio de ${e.dividaPatrimonio.toFixed(1)}x)`);
  }
  if (e.margemLiquida !== null && e.margemLiquida < 0) {
    alertas.push("Margem líquida negativa — empresa operando com prejuízo");
  }
  if (e.liquidez !== null && e.liquidez < LIQUIDEZ_MINIMA_GESTOR) {
    alertas.push("Liquidez abaixo de R$ 5M/dia — difícil montar posição grande sem impacto");
  }
  if (e.dy12 !== null && e.dy12 < 4) {
    alertas.push("DY 12m abaixo de 4% — fraco para o objetivo de renda");
  }
  if (e.selic !== null && e.dy12 !== null && e.dy12 < e.selic - SELIC_ALERTA_DY_INFERIOR) {
    alertas.push(
      `Prêmio negativo: DY de ${e.dy12.toFixed(1)}% abaixo da Selic (${e.selic.toFixed(1)}%) — ações pagando menos que a renda fixa`,
    );
  }
  if (e.consistenciaDividendos !== null && e.consistenciaDividendos < CONSISTENCIA_ANOS_MINIMA) {
    alertas.push(
      `Histórico curto de dividendos (${e.consistenciaDividendos} ano${e.consistenciaDividendos === 1 ? "" : "s"}) — consistência ainda não comprovada`,
    );
  }
  const percentilEfetivo = percentilValorizacaoEfetivo(e);
  if (percentilEfetivo !== null && percentilEfetivo >= PERCENTIL_DISTRIBUCIONAL_ALERTA) {
    const plReal = e.percentilPlReal !== null && Number.isFinite(e.percentilPlReal);
    alertas.push(
      plReal
        ? `P/L real acima de ${percentilEfetivo.toFixed(0)}% da própria história (CVM) — papel caro por valuation, aguarde recuo antes de aportar`
        : `Preço acima de ${percentilEfetivo.toFixed(0)}% das leituras históricas — momento caro da própria série, aguarde recuo antes de aportar`,
    );
  }
  if (e.volatilidadeAnualPct !== null && e.volatilidadeAnualPct >= VOLATILIDADE_ALERTA) {
    alertas.push(
      `Volatilidade anual de ${e.volatilidadeAnualPct.toFixed(0)}% — oscilação alta para o perfil de renda passiva`,
    );
  }
  if (e.volatilidadeAnualPct !== null && e.volatilidadeAnualPct > VOLATILIDADE_MAX) {
    alertas.push("Volatilidade extrema — papel fora da mesa de aportes");
  }
  return alertas;
}

/**
 * Limite de posição para patrimônios de alto valor: percentual definido pelo
 * rating, com teto absoluto de 10% do volume diário para não impactar o preço.
 */
export function limiteAporte(
  patrimonio: number | null,
  rating: RatingGestor | null,
  liquidez: number | null,
): LimiteAporte | null {
  const maxPatrimonioPct = rating ? LIMITE_PATRIMONIO_POR_RATING[rating] : 0;
  let maxValor: number | null = null;
  let impactoVolumePct: number | null = null;
  if (patrimonio !== null && patrimonio > 0 && maxPatrimonioPct > 0) {
    maxValor = (patrimonio * maxPatrimonioPct) / 100;
  }
  if (liquidez !== null && liquidez > 0 && maxPatrimonioPct > 0) {
    const teto = (liquidez * IMPACTO_VOLUME_PCT) / 100;
    impactoVolumePct = IMPACTO_VOLUME_PCT;
    maxValor = maxValor === null ? teto : Math.min(maxValor, teto);
  }
  return { maxPatrimonioPct, maxValor, impactoVolumePct };
}

/**
 * Avaliação completa do ativo na ótica do gestor: nota 0–100 ponderada por
 * fundamentos (35%, com ajuste setorial), oportunidade (20%), dividendos
 * (20%), prêmio vs Selic (10%), liquidez (8%) e endividamento (7%), com
 * reescala quando faltam dados. Retorna null quando a cobertura de pesos é
 * insuficiente para uma nota confiável.
 */
export function avaliarParaGestor(e: EntradasScoreGestor): ScoreGestor {
  const payout = e.payout ?? estimarPayout(e.dy12, e.pl);
  const ajusteSetor = ajusteSetorial(e.setor);
  const percentilEfetivo = percentilValorizacaoEfetivo(e);
  const plRealDisponivel = e.percentilPlReal !== null && Number.isFinite(e.percentilPlReal);
  const detalheOportunidade =
    e.oportunidade === null
      ? null
      : percentilEfetivo === null
        ? "Posição no histórico, DY e risco (radar)"
        : plRealDisponivel
          ? `Posição no histórico, DY e risco; P/L real acima de ${percentilEfetivo.toFixed(0)}% da própria história (CVM)`
          : `Posição no histórico, DY e risco; preço acima de ${percentilEfetivo.toFixed(0)}% das leituras históricas`;

  const componentes: ComponenteScoreGestor[] = [
    {
      chave: "fundamentos",
      rotulo: "Fundamentos",
      nota: e.fundamentos === null ? null : Math.round(clamp(e.fundamentos + ajusteSetor, 0, 100)),
      peso: PESO_FUNDAMENTOS,
      detalhe:
        e.fundamentos === null
          ? null
          : ajusteSetor === 0
            ? "Score Buy & Hold (rentabilidade, margem, crescimento)"
            : ajusteSetor > 0
              ? `Score Buy & Hold + ${ajusteSetor} pts de ajuste setorial (defensivo)`
              : `Score Buy & Hold − ${-ajusteSetor} pts de ajuste setorial (cíclico/volátil)`,
    },
    {
      chave: "oportunidade",
      rotulo: "Oportunidade de preço",
      nota: pontosOportunidadeComDistribuicao(e.oportunidade, percentilEfetivo),
      peso: PESO_OPORTUNIDADE,
      detalhe: detalheOportunidade,
    },
    {
      chave: "dividendos",
      rotulo: "Dividendos",
      nota: pontosDividendos(e.dy12, payout, e.consistenciaDividendos),
      peso: PESO_DIVIDENDOS,
      detalhe: detalhePayout(e.dy12, e.pl, payout),
    },
    {
      chave: "premioSelic",
      rotulo: "Prêmio vs Selic",
      nota: pontosPremio(e.dy12, e.selic),
      peso: PESO_PREMIO_SELIC,
      detalhe: detalhePremio(e.dy12, e.selic),
    },
    {
      chave: "liquidez",
      rotulo: "Liquidez",
      nota: pontosLiquidez(e.liquidez),
      peso: PESO_LIQUIDEZ,
      detalhe: detalheLiquidez(e.liquidez),
    },
    {
      chave: "endividamento",
      rotulo: "Endividamento",
      nota: pontosEndividamento(e.dividaPatrimonio),
      peso: PESO_ENDIVIDAMENTO,
      detalhe:
        e.dividaPatrimonio === null
          ? null
          : `Dívida/patrimônio de ${e.dividaPatrimonio.toFixed(1)}x`,
    },
  ];

  let soma = 0;
  let pesos = 0;
  for (const c of componentes) {
    if (c.nota !== null) {
      soma += c.nota * c.peso;
      pesos += c.peso;
    }
  }

  const nota = pesos >= PESO_MINIMO_NOTA ? Math.round(soma / pesos) : null;
  const rating = nota === null ? null : ratingDaNota(nota);
  const veredito = vereditoGestor(nota, e.sinal, e.volatilidadeAnualPct);
  const alertas = montarAlertas(e);

  const motivo =
    nota === null
      ? "Dados insuficientes para uma nota confiável — aguarde cobertura maior."
      : rating === "A"
        ? `Rating A (${nota}/100): fundamentos e renda sólidos — dentro dos limites, o aporte está liberado.`
        : rating === "B"
          ? `Rating B (${nota}/100): boa qualidade — aporte moderado e reavaliação contínua.`
          : rating === "C"
            ? `Rating C (${nota}/100): qualidade mediana — aguarde melhora de indicadores antes de aportar.`
            : `Rating D (${nota}/100): qualidade baixa ou armadilha de valor — fora da mesa de aportes.`;

  return {
    ticker: e.ticker,
    nota,
    rating,
    veredito,
    componentes,
    alertas,
    limite: limiteAporte(null, rating, e.liquidez),
    motivo,
    regime: e.regime,
    setor: e.setor ?? null,
  };
}

/** Nota final expressa em rótulo qualitativo (reusa a escala do radar). */
export function rotuloGestor(nota: number | null): RotuloScore | null {
  if (nota === null) return null;
  return rotuloScore(nota);
}

/** Classe de cor da nota (reusa a paleta do radar). */
export function corNotaGestor(nota: number | null): string {
  if (nota === null) return "text-muted-foreground";
  return CORES_SCORE[rotuloScore(nota)];
}
