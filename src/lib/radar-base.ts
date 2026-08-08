/**
 * Radar de oportunidades: lógica pura de análise de histórico e sinais.
 *
 * Consome a série histórica (mínimo/máximo/posição) e os fundamentos atuais
 * para sugerir "comprar" (preço nas mínimas históricas), "vender" (choque de
 * alto impacto / deterioração) ou "manter" (zona neutra). É um radar
 * educacional de triagem, não recomendação formal de investimento.
 */

export type ZonaHistorica = "minima" | "baixa" | "media" | "alta" | "maxima" | "sem-dados";

export type TipoSinal = "comprar" | "manter" | "vender" | "observar" | "sem-dados";

export type SinalRadar = {
  tipo: TipoSinal;
  zona: ZonaHistorica;
  /** Posição do preço atual dentro do range histórico: 0 = mínima, 100 = máxima. */
  percentil: number | null;
  motivo: string;
  urgente: boolean;
};

export type EntradasSinal = {
  variacaoDia: number | null;
  dy12: number | null;
  pvp: number | null;
  percentil: number | null;
  noticiaImpacto: boolean;
};

export const LIMITE_MINIMA = 25;
export const LIMITE_BAIXA = 40;
export const LIMITE_MEDIA = 70;
export const LIMITE_ALTA = 90;
export const CHOQUE_DIA_PCT = -12;
export const AVISO_DIA_PCT = -6;
export const DY_MINIMO_COMPRA = 4;
/** P/VPA a partir do qual um preço barato no histórico vira armadilha de valor. */
export const PVP_MAX_COMPRA = 3;

/* ------------------------------------------------------------------ *
 * Score de oportunidade (0–100)
 * ------------------------------------------------------------------ */

export type RotuloScore = "excelente" | "boa" | "media" | "fraca";

export type EntradasScore = {
  percentil: number | null;
  dy12: number | null;
  drawdownMaximoPct: number | null;
  noticiaImpacto: boolean;
};

export const LIMITE_SCORE_EXCELENTE = 70;
export const LIMITE_SCORE_BOA = 50;
export const LIMITE_SCORE_MEDIA = 35;
/** DY 12m considerado "excelente" no teto do componente de rendimento. */
export const DY_TETO_SCORE = 12;
/** Nota máxima para o risco: queda de até 15% desde o pico. */
export const DRAWDOWN_ZERO = -15;
/** Nota mínima para o risco: quedas além disso zeram o componente. */
export const DRAWDOWN_MAX = -70;
/** Desconto aplicado quando há notícia de alto impacto associada ao ativo. */
export const DESCONTO_NOTICIA_SCORE = 12;

const PESO_PRECO = 0.5;
const PESO_DY = 0.3;
const PESO_RISCO = 0.2;

function clamp(valor: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, valor));
}

function pontosPreco(percentil: number): number {
  return 100 - percentil;
}

function pontosDy(dy12: number | null): number {
  if (dy12 === null || !Number.isFinite(dy12) || dy12 <= 0) return 0;
  return clamp((dy12 / DY_TETO_SCORE) * 100, 0, 100);
}

function pontosRisco(drawdownMaximoPct: number | null): number {
  if (drawdownMaximoPct === null || !Number.isFinite(drawdownMaximoPct)) return 50;
  if (drawdownMaximoPct >= DRAWDOWN_ZERO) return 100;
  if (drawdownMaximoPct <= DRAWDOWN_MAX) return 0;
  return clamp(((drawdownMaximoPct - DRAWDOWN_MAX) / (DRAWDOWN_ZERO - DRAWDOWN_MAX)) * 100, 0, 100);
}

/**
 * Score de oportunidade composto, 0 (fraco) a 100 (excelente):
 * 50% posição na própria história, 30% DY 12m, 20% risco (drawdown máximo),
 * com desconto por notícia de alto impacto. Sem histórico o score é null.
 */
export function scoreOportunidade(e: EntradasScore): number | null {
  if (e.percentil === null) return null;
  const bruto =
    pontosPreco(e.percentil) * PESO_PRECO +
    pontosDy(e.dy12) * PESO_DY +
    pontosRisco(e.drawdownMaximoPct) * PESO_RISCO;
  const total = bruto - (e.noticiaImpacto ? DESCONTO_NOTICIA_SCORE : 0);
  return Math.round(clamp(total, 0, 100));
}

export function rotuloScore(score: number): RotuloScore {
  if (score >= LIMITE_SCORE_EXCELENTE) return "excelente";
  if (score >= LIMITE_SCORE_BOA) return "boa";
  if (score >= LIMITE_SCORE_MEDIA) return "media";
  return "fraca";
}

export const CORES_SCORE: Record<RotuloScore, string> = {
  excelente: "text-emerald-600 bg-emerald-600/10",
  boa: "text-sky-600 bg-sky-600/10",
  media: "text-amber-600 bg-amber-600/10",
  fraca: "text-muted-foreground bg-muted/40",
};

export function posicaoPercentil(
  precoAtual: number | null,
  minimo: number | null,
  maximo: number | null,
): number | null {
  if (
    precoAtual === null ||
    minimo === null ||
    maximo === null ||
    !(precoAtual > 0) ||
    maximo <= minimo
  ) {
    return null;
  }
  const pct = ((precoAtual - minimo) / (maximo - minimo)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function zonaDePercentil(percentil: number | null): ZonaHistorica {
  if (percentil === null) return "sem-dados";
  if (percentil <= LIMITE_MINIMA) return "minima";
  if (percentil <= LIMITE_BAIXA) return "baixa";
  if (percentil <= LIMITE_MEDIA) return "media";
  if (percentil <= LIMITE_ALTA) return "alta";
  return "maxima";
}

/** Regra de decisão (ação ou FII) para a triagem da B3. */
export function sinalRadar(e: EntradasSinal): SinalRadar {
  const zona = zonaDePercentil(e.percentil);
  const percentil = e.percentil;

  // Choque externo: queda diária expressiva (ou queda relevante + notícia).
  if (e.variacaoDia !== null && e.variacaoDia <= CHOQUE_DIA_PCT) {
    return {
      tipo: "vender",
      zona,
      percentil,
      motivo:
        "Queda de mais de 12% no dia — choque em andamento. Verifique o noticiário antes de decidir.",
      urgente: true,
    };
  }
  if (e.variacaoDia !== null && e.variacaoDia <= AVISO_DIA_PCT && e.noticiaImpacto) {
    return {
      tipo: "vender",
      zona,
      percentil,
      motivo: "Queda relevante acompanhada de noticiário negativo de alto impacto.",
      urgente: true,
    };
  }

  // Compra: preço na zona inferior da própria história.
  if (percentil !== null && percentil <= LIMITE_MINIMA) {
    const dyOk = (e.dy12 ?? 0) >= DY_MINIMO_COMPRA;
    if (dyOk) {
      const pvp = e.pvp;
      if (pvp !== null && pvp >= PVP_MAX_COMPRA) {
        return {
          tipo: "observar",
          zona,
          percentil,
          motivo: `Nas mínimas históricas (${percentil.toFixed(0)}%), mas P/VPA de ${pvp.toFixed(2)} — preço baixo pode esconder armadilha de valor, confirme a qualidade.`,
          urgente: false,
        };
      }
      return {
        tipo: "comprar",
        zona,
        percentil,
        motivo: `Nas mínimas históricas (${percentil.toFixed(0)}%) com DY de ${(e.dy12 ?? 0).toFixed(1)}%.`,
        urgente: false,
      };
    }
    return {
      tipo: "observar",
      zona,
      percentil,
      motivo: "Nas mínimas históricas, mas sem DY atrativo — observe a qualidade antes de decidir.",
      urgente: false,
    };
  }

  if (percentil !== null && percentil <= LIMITE_BAIXA) {
    if (e.pvp !== null && e.pvp >= PVP_MAX_COMPRA) {
      return {
        tipo: "observar",
        zona,
        percentil,
        motivo: `Preço ainda barato em relação à própria história (${percentil.toFixed(0)}%), mas P/VPA de ${e.pvp.toFixed(1)} sugere valor subestimado pelos fundamentos — confirme antes de comprar.`,
        urgente: false,
      };
    }
    return {
      tipo: "comprar",
      zona,
      percentil,
      motivo: `Preço ainda barato em relação à própria história (${percentil.toFixed(0)}% da faixa).`,
      urgente: false,
    };
  }

  if (percentil !== null && percentil <= LIMITE_MEDIA) {
    return {
      tipo: "observar",
      zona: "media",
      percentil,
      motivo: "Faixa intermediária do histórico: aguarde melhor relação risco/retorno.",
      urgente: false,
    };
  }

  if (percentil !== null && percentil > LIMITE_MEDIA) {
    return {
      tipo: "manter",
      zona,
      percentil,
      motivo:
        zona === "maxima"
          ? `Valor elevado versus a própria história (${percentil.toFixed(0)}%) — evite comprar no topo.`
          : `Preço caro em relação à própria história (${percentil.toFixed(0)}%) — mantenha o que já possui e aguarde um recuo antes de comprar.`,
      urgente: false,
    };
  }

  return {
    tipo: "sem-dados",
    zona,
    percentil: null,
    motivo: "Sem histórico suficiente para posicionar o ativo.",
    urgente: false,
  };
}

export const CORES_SINAL: Record<TipoSinal, string> = {
  comprar: "text-emerald-600 bg-emerald-600/10",
  vender: "text-red-600 bg-red-600/10",
  manter: "text-amber-600 bg-amber-600/10",
  observar: "text-sky-600 bg-sky-600/10",
  "sem-dados": "text-muted-foreground bg-muted/40",
};

export const ROTULOS_ZONA: Record<ZonaHistorica, string> = {
  minima: "Mínima histórica",
  baixa: "Barata",
  media: "Faixa média",
  alta: "Cara",
  maxima: "Máxima histórica",
  "sem-dados": "Sem histórico",
};

/* ------------------------------------------------------------------ *
 * Backtest do sinal do radar
 * ------------------------------------------------------------------ */

/** Compra quando o preço fica até 2% acima da mínima das últimas 52 semanas. */
export const BT_TOLERANCIA_MINIMA_PCT = 2;
/** Lucro-alvo (venda) em percentual sobre o preço de entrada. */
export const BT_LUCRO_ALVO_PCT = 20;
/** Stop-loss em percentual sobre o preço de entrada. */
export const BT_STOP_PCT = -12;
/** Janela de semanas usada para ler "as mínimas" (mínima deslizante de 52s). */
export const BT_JANELA_SEMANAS = 52;
/** Série semanal com menos pontos que isso não permite leitura confiável da mínima 52s. */
export const BT_MINIMO_PONTOS = 60;
/** Para a aproximação da mínima 52s no início da série. */
const ATRASO_INICIAL_JANELA = 12;

export type ResultadoBacktest = {
  negocios: number;
  vencedores: number;
  perdedores: number;
  taxaAcertoPct: number;
  retornoMedioPct: number;
  retornoTotalPct: number;
  anos: number;
  retornoAnualPct: number;
  buyHoldPct: number;
  buyHoldAnualPct: number;
  semanasEmPosicao: number;
  semanasTotais: number;
};

/**
 * Backtest do comportamento sugerido pelo radar (semanais):
 * compra quando o preço está na vizinhança da mínima das últimas 52 semanas,
 * vende ao atingir +20% (lucro-alvo) ou -12% (proteção) sobre a entrada;
 * ao final da série, posição aberta é liquidada no último preço.
 *
 * Retorna null quando a série é curta demais para extrair as mínimas 52s.
 */
export function backtestSinal(serie: Array<{ f: number }>): ResultadoBacktest | null {
  const precos = serie.map((ponto) => ponto.f).filter((f) => Number.isFinite(f) && f > 0);
  const semanasTotais = precos.length;
  if (semanasTotais < BT_MINIMO_PONTOS) return null;

  const negocios: number[] = [];
  let semanasEmPosicao = 0;
  let compra = 0;
  let comprado = false;

  for (let i = 0; i < semanasTotais; i++) {
    if (!comprado) {
      const inicio = Math.max(0, i - BT_JANELA_SEMANAS + 1);
      const janela = precos.slice(inicio, i + 1);
      const minima52 = Math.min(...janela);
      const alvoCompra = (minima52 * (100 + BT_TOLERANCIA_MINIMA_PCT)) / 100;
      const preco = precos[i];
      const comJanela = i - inicio + 1 >= BT_JANELA_SEMANAS - ATRASO_INICIAL_JANELA;
      if (comJanela && preco <= alvoCompra) {
        comprado = true;
        compra = preco;
      }
      continue;
    }
    const preco = precos[i];
    const variacao = ((preco - compra) / compra) * 100;
    if (variacao >= BT_LUCRO_ALVO_PCT || variacao <= BT_STOP_PCT) {
      negocios.push(variacao);
      comprado = false;
      continue;
    }
    semanasEmPosicao++;
  }

  // Liquidação no fim da série se ainda estiver posicionado.
  if (comprado && semanasTotais > 0) {
    const precoFinal = precos[semanasTotais - 1];
    const variacao = ((precoFinal - compra) / compra) * 100;
    negocios.push(variacao);
    comprado = false;
  }

  const vencedores = negocios.filter((r) => r > 0).length;
  const perdedores = negocios.length - vencedores;
  const retornoMedioPct =
    negocios.length > 0 ? negocios.reduce((soma, r) => soma + r, 0) / negocios.length : 0;
  const retornoTotalPct =
    negocios.length > 0 ? negocios.reduce((soma, r) => soma * (1 + r / 100), 1) - 1 : 0;
  const anos = semanasTotais / 52;
  const anualizar = (total: number) => (1 + total) ** (1 / anos) - 1;
  const retornoAnualPct = anos > 0 ? anualizar(retornoTotalPct) : 0;
  const buyHold = (precos[precos.length - 1] / precos[0] - 1) * 100;
  const buyHoldAnualPct = anos > 0 ? anualizar(buyHold / 100) : 0;

  return {
    negocios: negocios.length,
    vencedores,
    perdedores,
    taxaAcertoPct: negocios.length > 0 ? (vencedores / negocios.length) * 100 : 0,
    retornoMedioPct,
    retornoTotalPct: retornoTotalPct * 100,
    anos,
    retornoAnualPct: retornoAnualPct * 100,
    buyHoldPct: buyHold,
    buyHoldAnualPct: buyHoldAnualPct * 100,
    semanasEmPosicao,
    semanasTotais,
  };
}
