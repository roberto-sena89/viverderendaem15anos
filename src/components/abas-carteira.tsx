import { Link } from "@tanstack/react-router";
import {
  Coins,
  FileUp,
  LayoutDashboard,
  ListOrdered,
  PiggyBank,
  Scale,
  Wallet,
} from "lucide-react";
import { ABAS_CARTEIRA, secaoPorRota } from "@/lib/navegacao";

const ICONES: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/carteira": Wallet,
  "/dividendos": Coins,
  "/aportes": PiggyBank,
  "/rebalanceamento": Scale,
  "/historico-aportes": ListOrdered,
  "/importar": FileUp,
};

/** Barra de abas da carteira, no padrão Investidor 10. */
export function AbasCarteira() {
  return (
    <nav aria-label="Seções da carteira" className="border-b border-border">
      <ul className="scrollbar-none grid grid-cols-2 gap-x-1 gap-y-0.5 sm:flex sm:flex-wrap sm:items-center">
        {ABAS_CARTEIRA.map((to) => {
          const Icone = ICONES[to] ?? LayoutDashboard;
          const rotulo = secaoPorRota(to)?.rotulo ?? to;
          return (
            <li key={to} className="min-w-0 sm:shrink">
              <Link
                to={to}
                activeOptions={{ exact: true }}
                title={rotulo}
                className="t-aba flex h-full min-w-0 items-center gap-1.5 border-b-2 border-transparent px-2 py-2.5 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:font-semibold data-[status=active]:text-foreground sm:gap-2 sm:px-3"
              >
                <Icone className="size-5 shrink-0 sm:size-6" />
                <span className="min-w-0 truncate sm:whitespace-nowrap">{rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>

    </nav>
  );
}
