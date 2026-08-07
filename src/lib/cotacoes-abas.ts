import {
  Bitcoin,
  Building2,
  CandlestickChart,
  Gauge,
  Landmark,
  Layers,
  LayoutGrid,
  Wheat,
  type LucideIcon,
} from "lucide-react";

import type { CategoriaMercado } from "@/lib/grade-mercado.functions";

export type AbaCotacoes = {
  id: string;
  rotulo: string;
  /** Rótulo curto usado no mobile, onde o espaço é limitado. */
  rotuloCurto?: string;
  icone: LucideIcon;
  categoria?: CategoriaMercado;
};

/** Abas da página de Cotações. A aba "Câmbio" foi removida do produto. */
export const ABAS_COTACOES: AbaCotacoes[] = [
  { id: "geral", rotulo: "Visão geral", rotuloCurto: "Geral", icone: LayoutGrid },
  { id: "acoes", rotulo: "Ações", icone: CandlestickChart, categoria: "acoes" },
  { id: "fiis", rotulo: "FIIs", icone: Building2, categoria: "fiis" },
  { id: "indices", rotulo: "Índices", icone: Gauge },
  { id: "tesouro", rotulo: "Tesouro Direto", rotuloCurto: "Tesouro", icone: Landmark },
  { id: "etfs", rotulo: "ETFs", icone: Layers, categoria: "etfs" },
  { id: "cripto", rotulo: "Criptomoedas", rotuloCurto: "Cripto", icone: Bitcoin, categoria: "cripto" },
  { id: "commodities", rotulo: "Commodities", rotuloCurto: "Commod.", icone: Wheat },
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
/** Classes da barra de abas: grade de ícones no mobile, linha rolável a partir de `sm`. */
export const CLASSES_BARRA_ABAS =
  "sticky top-0 z-20 -mx-1 bg-background/95 px-1 py-1 backdrop-blur sm:top-[var(--altura-cabecalho-app,7.5rem)] sm:overflow-x-auto";
export const CLASSES_LISTA_ABAS =
  "grid h-auto w-full grid-cols-4 items-stretch gap-1.5 rounded-xl border border-border/60 bg-card/40 p-1.5 sm:flex sm:w-max sm:gap-1 sm:rounded-full sm:border-border/50 sm:p-1";
export const CLASSES_GATILHO_ABA =
  "foco-visivel alvo-toque-linha group flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center t-aba text-muted-foreground transition-colors data-[state=active]:bg-primary/12 data-[state=active]:text-primary data-[state=active]:shadow-none sm:w-auto sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3.5 sm:py-1.5 sm:whitespace-nowrap sm:data-[state=active]:bg-primary sm:data-[state=active]:text-primary-foreground";
export const CLASSES_ICONE_ABA = "size-4 shrink-0 sm:size-3.5";
export const CLASSES_ROTULO_ABA = "w-full truncate";
/** Busca ocupa a largura total, alinhada à grade das abas (mín. 220px no desktop). */
export const CLASSES_BUSCA = "h-9 w-full pl-8 text-sm sm:w-full sm:min-w-[220px]";
