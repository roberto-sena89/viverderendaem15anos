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
  { to: "/rebalanceamento", rotulo: "Rebalanceamento", grupo: "Carteira" },
  { to: "/historico-aportes", rotulo: "Histórico de Aportes", grupo: "Carteira" },
  { to: "/importar", rotulo: "Importar B3", grupo: "Carteira" },

  { to: "/cotacoes", rotulo: "Cotações", grupo: "MERCADO" },
  { to: "/rankings", rotulo: "Ranking de Ativos", grupo: "MERCADO" },
  { to: "/noticias", rotulo: "Notícias de Mercado", grupo: "MERCADO" },
  { to: "/radar", rotulo: "Radar de Oportunidades", grupo: "MERCADO" },
  { to: "/planejador", rotulo: "Planejador Financeiro", grupo: "Planejamento" },
  { to: "/metas", rotulo: "Metas", grupo: "Planejamento" },
  { to: "/chat", rotulo: "Técnico IA", grupo: "Planejamento" },
];

/** Abas horizontais da carteira, na ordem exibida. */
export const ABAS_CARTEIRA = [
  "/dashboard",
  "/carteira",
  "/dividendos",
  "/aportes",
  "/rebalanceamento",
  "/historico-aportes",
  "/importar",
] as const;

export function secaoPorRota(pathname: string): SecaoNav | undefined {
  return SECOES.find((s) => s.to === pathname);
}
