import { Link } from "@tanstack/react-router";
import { BarChart3, Coins, LayoutGrid, LineChart, PieChart, Scale } from "lucide-react";

const ABAS = [
  { to: "/dashboard", rotulo: "Resumo", icone: LayoutGrid },
  { to: "/carteira", rotulo: "Carteira", icone: PieChart },
  { to: "/dividendos", rotulo: "Proventos", icone: Coins },
  { to: "/aportes", rotulo: "Patrimônio", icone: BarChart3 },
  { to: "/estatisticas", rotulo: "Rentabilidade", icone: LineChart },
  { to: "/rebalanceamento", rotulo: "Análise", icone: Scale },
] as const;

/** Barra de abas da carteira, no padrão Investidor 10. */
export function AbasCarteira() {
  return (
    <nav
      aria-label="Seções da carteira"
      className="-mx-1 overflow-x-auto border-b border-border"
    >
      <ul className="flex min-w-max items-center gap-1 px-1">
        {ABAS.map(({ to, rotulo, icone: Icone }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:font-semibold data-[status=active]:text-foreground"
            >
              <Icone className="size-4" />
              {rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
