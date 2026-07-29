/**
 * Fonte única de verdade dos rótulos de navegação.
 * Sidebar, abas da carteira, breadcrumbs e o h1 do cabeçalho leem daqui,
 * garantindo que o texto da aba selecionada seja o mesmo em todo o layout.
 */
export type SecaoNav = {
  to: string;
  rotulo: string;
  grupo: string;
};

export const SECOES: SecaoNav[] = [
  { to: "/dashboard", rotulo: "Resumo", grupo: "Carteira" },
  { to: "/carteira", rotulo: "Carteira", grupo: "Carteira" },
  { to: "/dividendos", rotulo: "Proventos", grupo: "Carteira" },
  { to: "/aportes", rotulo: "Patrimônio", grupo: "Carteira" },
  { to: "/estatisticas", rotulo: "Rentabilidade", grupo: "Carteira" },
  { to: "/rebalanceamento", rotulo: "Análise", grupo: "Carteira" },



  { to: "/cotacoes", rotulo: "Cotações de mercado", grupo: "MERCADO" },
  { to: "/rankings", rotulo: "Ranking de Ativos", grupo: "MERCADO" },

  { to: "/mercado", rotulo: "Mercado & B3", grupo: "MERCADO" },
  { to: "/planejador", rotulo: "Planejador FI", grupo: "Planejamento" },
  { to: "/metas", rotulo: "Metas", grupo: "Planejamento" },
  { to: "/chat", rotulo: "Técnico IA", grupo: "Planejamento" },
];

/** Abas horizontais da carteira, na ordem exibida. */
export const ABAS_CARTEIRA = [
  "/dashboard",
  "/carteira",
  "/dividendos",
  "/aportes",
  "/estatisticas",
  "/rebalanceamento",
] as const;

export function secaoPorRota(pathname: string): SecaoNav | undefined {
  return SECOES.find((s) => s.to === pathname);
}
