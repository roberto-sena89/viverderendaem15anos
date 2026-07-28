import { Link } from "@tanstack/react-router";
import { Coins, LayoutGrid, LineChart, PiggyBank, Scale, Wallet } from "lucide-react";
import { ABAS_CARTEIRA, secaoPorRota } from "@/lib/navegacao";

const ICONES: Record<string, typeof LayoutGrid> = {
  "/dashboard": LayoutGrid,
  "/carteira": Wallet,
  "/dividendos": Coins,
  "/aportes": PiggyBank,
  "/estatisticas": LineChart,
  "/rebalanceamento": Scale,
};

/** Barra de abas da carteira, no padrão Investidor 10. */
export function AbasCarteira() {
  return (
    <nav
      aria-label="Seções da carteira"
      className="-mx-1 overflow-x-auto border-b border-border"
    >
      <ul className="flex min-w-max items-center gap-1 px-1">
        {ABAS_CARTEIRA.map((to) => {
          const Icone = ICONES[to];
          const rotulo = secaoPorRota(to)?.rotulo ?? to;
          return (
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
          );
        })}
      </ul>
    </nav>
  );
}
