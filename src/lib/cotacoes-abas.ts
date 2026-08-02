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

/**
 * Cabeçalho fixo (busca + abas) logo abaixo do cabeçalho do app.
 * No mobile acompanha a rolagem; no desktop as abas seguem fixas por conta própria.
 */
export const CLASSES_CABECALHO_FIXO =
  "sticky top-[var(--altura-cabecalho-app,4.75rem)] z-20 -mx-4 space-y-2 border-b border-border/60 bg-background/95 px-4 pt-2 pb-1 backdrop-blur sm:static sm:mx-0 sm:space-y-3 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0 sm:backdrop-blur-none";
/** Classes da barra de abas: 2 colunas no mobile, linha rolável só a partir de `sm`. */
export const CLASSES_BARRA_ABAS =
  "sticky top-0 z-20 -mx-1 bg-background/95 px-1 py-1 backdrop-blur sm:top-[var(--altura-cabecalho-app,7.5rem)] sm:overflow-x-auto";
export const CLASSES_LISTA_ABAS =
  "grid h-auto w-full grid-cols-2 items-stretch gap-1.5 p-1 sm:flex sm:w-max sm:gap-1";
export const CLASSES_GATILHO_ABA =
  "block w-full min-w-0 truncate whitespace-nowrap px-2 py-1.5 text-center text-[0.6875rem] leading-tight sm:w-auto sm:px-3 sm:text-sm";
/** Busca ocupa a largura total, alinhada à grade das abas (mín. 220px no desktop). */
export const CLASSES_BUSCA = "h-9 w-full pl-8 text-sm sm:w-full sm:min-w-[220px]";
