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

  if (percentil !== null && percentil >= LIMITE_ALTA) {
    return {
      tipo: "manter",
      zona,
      percentil,
      motivo: `Valor elevado versus a própria história (${percentil.toFixed(0)}%) — evite comprar no topo.`,
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
