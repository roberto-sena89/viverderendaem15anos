import { CLASSE_POS_FIXADO, classeDoAtivo, type Ativo, type Categoria } from "@/lib/portfolio";

/**
 * Paleta única do app: cada tipo de ativo tem sempre a mesma cor
 * (dashboard, carteira, rebalanceamento, janelas e gráficos).
 * Os valores apontam para tokens semânticos definidos em src/styles.css.
 */
export const COR_CLASSE: Record<string, string> = {
  "Ações": "var(--color-chart-14)",
  FIIs: "var(--color-chart-13)",
  "ETF (Brasil)": "var(--color-chart-11)",
  "ETFs - Brasil": "var(--color-chart-11)",
  "ETF (Exterior)": "var(--color-chart-12)",
  "ETFs - Global": "var(--color-chart-12)",
  [CLASSE_POS_FIXADO]: "var(--color-chart-6)",
  "Renda Fixa - IPCA+": "var(--color-chart-7)",
  "Renda Fixa - Prefixado": "var(--color-chart-8)",
  BDRs: "var(--color-chart-9)",
  Stocks: "var(--color-chart-2)",
  REITs: "var(--color-chart-10)",
  Criptomoedas: "var(--color-chart-4)",
  "Fundos de Investimentos": "var(--color-chart-7)",
};

/** Categorias da carteira mapeadas para a mesma cor da sua classe de estratégia. */
export const COR_CATEGORIA: Record<string, string> = {
  "Ações": COR_CLASSE["Ações"],
  "Fundos Imobiliários": COR_CLASSE.FIIs,
  FIIs: COR_CLASSE.FIIs,
  Fiagro: COR_CLASSE.FIIs,
  "Tesouro Direto": COR_CLASSE[CLASSE_POS_FIXADO],
  Tesouro: COR_CLASSE[CLASSE_POS_FIXADO],
  "Renda Fixa": COR_CLASSE[CLASSE_POS_FIXADO],
  BDR: COR_CLASSE.BDRs,
  "ETF Brasil": COR_CLASSE["ETF (Brasil)"],
  "ETF (Exterior)": COR_CLASSE["ETF (Exterior)"],
  "ETF EUA": COR_CLASSE["ETF (Exterior)"],
  "Fundos de Investimentos": COR_CLASSE["Fundos de Investimentos"],
  Stocks: COR_CLASSE.Stocks,
  REITs: COR_CLASSE.REITs,
  Criptomoedas: COR_CLASSE.Criptomoedas,
};

const FALLBACK = "var(--color-muted-foreground)";

/** Cor fixa de uma categoria da carteira. */
export const corCategoria = (categoria: Categoria | string) => {
  if (categoria === "Renda Fixa") return COR_CLASSE[CLASSE_POS_FIXADO];
  return COR_CATEGORIA[categoria] ?? FALLBACK;
};

/** Cor fixa de uma classe de alocação (tabelas de rebalanceamento e alvos). */
export const corClasse = (classe: string) => COR_CLASSE[classe] ?? FALLBACK;

/** Cor fixa de um ativo, derivada da sua classe. */
export const corAtivo = (a: Ativo) => corClasse(classeDoAtivo(a));
