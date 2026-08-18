/**
 * Tipos, classificações e fórmulas compartilhados da grade de ações da B3.
 * Arquivo client-safe: usado pelo agregador no servidor e pela UI.
 */

export const SETORES_ACAO = [
  "Financeiro",
  "Utilidade Pública",
  "Petróleo, Gás e Biocombustíveis",
  "Materiais Básicos",
  "Consumo Cíclico",
  "Consumo não Cíclico",
  "Bens Industriais",
  "Saúde",
  "Tecnologia da Informação",
  "Comunicações",
  "Outros",
] as const;

export type SetorAcao = (typeof SETORES_ACAO)[number];

/** Cores fixas e consistentes por setor (badges da grade). */
export const COR_SETOR: Record<SetorAcao, string> = {
  Financeiro: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "Utilidade Pública": "bg-sky-500/15 text-sky-400 border-sky-500/25",
  "Petróleo, Gás e Biocombustíveis": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Materiais Básicos": "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "Consumo Cíclico": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25",
  "Consumo não Cíclico": "bg-lime-500/15 text-lime-400 border-lime-500/25",
  "Bens Industriais": "bg-slate-400/15 text-slate-300 border-slate-400/25",
  Saúde: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  "Tecnologia da Informação": "bg-violet-500/15 text-violet-400 border-violet-500/25",
  Comunicações: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  Outros: "bg-muted text-muted-foreground border-border",
};

/** Traduz o setor da fonte pública (em inglês) para o setor macro exibido. */
export function normalizarSetor(bruto: string | null | undefined): SetorAcao {
  const s = (bruto ?? "").toLowerCase();
  if (!s) return "Outros";
  if (s.includes("finance")) return "Financeiro";
  if (s.includes("utilit")) return "Utilidade Pública";
  if (s.includes("energy minerals")) return "Petróleo, Gás e Biocombustíveis";
  if (s.includes("non-energy minerals") || s.includes("process industries"))
    return "Materiais Básicos";
  if (
    s.includes("producer manufacturing") ||
    s.includes("industrial services") ||
    s.includes("commercial services") ||
    s.includes("distribution services") ||
    s.includes("transportation")
  ) {
    return "Bens Industriais";
  }
  if (
    s.includes("retail trade") ||
    s.includes("consumer services") ||
    s.includes("consumer durables")
  ) {
    return "Consumo Cíclico";
  }
  if (s.includes("consumer non-durables")) return "Consumo não Cíclico";
  if (s.includes("health")) return "Saúde";
  if (s.includes("technology services") || s.includes("electronic technology")) {
    return "Tecnologia da Informação";
  }
  if (s.includes("communications")) return "Comunicações";
  return "Outros";
}

/** Rótulo em português para o segmento vindo em inglês da fonte pública. */
const SEGMENTOS_PT: Record<string, string> = {
  "retail trade": "Comércio Varejista",
  "energy minerals": "Petróleo e Gás",
  "health services": "Serviços de Saúde",
  "health technology": "Saúde e Farmacêutica",
  utilities: "Energia e Saneamento",
  finance: "Serviços Financeiros",
  "consumer services": "Serviços ao Consumidor",
  "consumer non-durables": "Consumo Básico",
  "consumer durables": "Bens Duráveis",
  "non-energy minerals": "Mineração e Siderurgia",
  "commercial services": "Serviços Comerciais",
  "distribution services": "Distribuição",
  transportation: "Transporte e Logística",
  "technology services": "Serviços de Tecnologia",
  "process industries": "Indústria de Processo",
  communications: "Telecomunicações",
  "producer manufacturing": "Bens de Capital",
  miscellaneous: "Diversos",
  "electronic technology": "Tecnologia Eletrônica",
  "industrial services": "Serviços Industriais",
};

export function traduzirSegmento(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  return SEGMENTOS_PT[bruto.toLowerCase()] ?? bruto;
}

/** Uma linha da grade de ações (preço ao vivo + fundamentos diários). */
export type LinhaAcao = {
  ticker: string;
  nome: string;
  logo: string | null;
  setor: SetorAcao;
  subsetor: string | null;
  segmento: string | null;

  preco: number | null;
  fechamentoAnterior: number | null;
  variacao: number | null;
  variacaoPercent: number | null;
  volume: number | null;

  valorMercado: number | null;
  pl: number | null;
  pvp: number | null;
  psr: number | null;
  evEbit: number | null;

  dy12: number | null;
  roe: number | null;
  roic: number | null;
  margemLiquida: number | null;
  margemEbit: number | null;

  patrimonio: number | null;
  lucro: number | null;
  receita: number | null;
  liquidez: number | null;
  dividaPatrimonio: number | null;
  crescReceita5a: number | null;

  lpa: number | null;
  vpa: number | null;
  precoTetoBazin: number | null;
  upsideBazin: number | null;
  precoJustoGraham: number | null;
  upsideGraham: number | null;
  pontuacao: number | null;

  /** true quando o preço veio da base diária e não da cotação ao vivo. */
  precoDefasado: boolean;
};

/** Indicadores históricos calculados sob demanda (por página visível). */
export type HistoricoAcao = {
  ticker: string;
  dy5a: number | null;
  var30d: number | null;
  var12m: number | null;
  var60m: number | null;
  crescLucro5a: number | null;
};

export type ResumoIbov = {
  valor: number | null;
  variacaoPercent: number | null;
  variacao12m: number | null;
  spark: number[];
};

export type RespostaAcoes = {
  linhas: LinhaAcao[];
  ibovespa: ResumoIbov | null;
  atualizadoEm: string;
  baseEm: string | null;
  parcial: boolean;
};

/* ------------------------------------------------------------------ *
 * Fórmulas
 * ------------------------------------------------------------------ */

/**
 * Preço-teto de Bazin: dividendo anual por ação dividido pelo yield mínimo
 * exigido (padrão de 6% ao ano).
 */
export function precoTetoBazin(
  preco: number | null,
  dy: number | null,
  yieldMinimo = 6,
): number | null {
  if (!preco || !dy || dy <= 0 || preco <= 0) return null;
  const dividendoAnual = preco * (dy / 100);
  return (dividendoAnual / yieldMinimo) * 100;
}

/**
 * Preço justo de Graham: raiz de 22,5 × LPA × VPA. Só faz sentido com lucro e
 * patrimônio positivos.
 */
export function precoJustoGraham(lpa: number | null, vpa: number | null): number | null {
  if (!lpa || !vpa || lpa <= 0 || vpa <= 0) return null;
  return Math.sqrt(22.5 * lpa * vpa);
}

/** Potencial de valorização (%) do preço atual até um preço-alvo. */
export function upside(preco: number | null, alvo: number | null): number | null {
  if (!preco || !alvo || preco <= 0) return null;
  return ((alvo - preco) / preco) * 100;
}

type FatoresScore = {
  dy: number | null;
  roe: number | null;
  margemLiquida: number | null;
  dividaPatrimonio: number | null;
  crescReceita5a: number | null;
  pl: number | null;
  pvp: number | null;
  liquidez: number | null;
};

const faixa = (v: number | null, min: number, max: number) => {
  if (v === null || !Number.isFinite(v)) return null;
  const p = (v - min) / (max - min);
  return Math.max(0, Math.min(1, p));
};

/**
 * Pontuação Buy and Hold (0–100): score proprietário que combina dividendos,
 * rentabilidade, margem, endividamento, crescimento, valuation e liquidez.
 * Cada fator vale entre 0 e 1 e é ponderado; fatores sem dado são ignorados e
 * o total é reescalado pelos pesos efetivamente usados.
 */
export function pontuacaoBuyAndHold(f: FatoresScore): number | null {
  const itens: Array<[number | null, number]> = [
    [faixa(f.dy, 0, 10), 18],
    [faixa(f.roe, 0, 25), 20],
    [faixa(f.margemLiquida, 0, 25), 14],
    [f.dividaPatrimonio === null ? null : 1 - (faixa(f.dividaPatrimonio, 0, 2) ?? 0), 14],
    [faixa(f.crescReceita5a, -5, 20), 12],
    [f.pl === null || f.pl <= 0 ? null : 1 - (faixa(f.pl, 4, 25) ?? 0), 10],
    [f.pvp === null || f.pvp <= 0 ? null : 1 - (faixa(f.pvp, 0.5, 4) ?? 0), 6],
    [faixa(f.liquidez === null ? null : Math.log10(Math.max(1, f.liquidez)), 4, 8), 6],
  ];
  let soma = 0;
  let pesos = 0;
  for (const [valor, peso] of itens) {
    if (valor === null) continue;
    soma += valor * peso;
    pesos += peso;
  }
  if (pesos < 40) return null;
  return Math.round((soma / pesos) * 100);
}

/** Cor do score na escala verde → âmbar → vermelho. */
export function corPontuacao(v: number | null): string {
  if (v === null) return "text-muted-foreground";
  if (v >= 70) return "text-positive";
  if (v >= 45) return "text-amber-400";
  return "text-negative";
}
