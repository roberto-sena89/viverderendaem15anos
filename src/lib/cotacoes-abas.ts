import type { CategoriaMercado } from "@/lib/grade-mercado.functions";

export type AbaCotacoes = {
  id: string;
  rotulo: string;
  categoria?: CategoriaMercado;
};

/** Abas da página de Cotações. A aba "Câmbio" foi removida do produto. */
export const ABAS_COTACOES: AbaCotacoes[] = [
  { id: "geral", rotulo: "Visão geral" },
  { id: "acoes", rotulo: "Ações", categoria: "acoes" },
  { id: "fiis", rotulo: "FIIs", categoria: "fiis" },
  { id: "indices", rotulo: "Índices" },
  { id: "tesouro", rotulo: "Tesouro Direto" },
  { id: "etfs", rotulo: "ETFs", categoria: "etfs" },
  { id: "cripto", rotulo: "Criptomoedas", categoria: "cripto" },
  { id: "commodities", rotulo: "Commodities" },
];

/** Abas genéricas renderizadas por PainelCategoria (as demais têm painel próprio). */
export const ABAS_CATEGORIA_GENERICA = ABAS_COTACOES.filter(
  (a) => a.categoria && !["fiis", "acoes", "etfs", "cripto"].includes(a.id),
);
