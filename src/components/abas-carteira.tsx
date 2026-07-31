import { Link } from "@tanstack/react-router";
import { Coins, LayoutDashboard, ListOrdered, PiggyBank, Scale, Wallet } from "lucide-react";
import { ABAS_CARTEIRA, secaoPorRota } from "@/lib/navegacao";

const ICONES: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/carteira": Wallet,
  "/dividendos": Coins,
  "/aportes": PiggyBank,
  "/rebalanceamento": Scale,
  "/historico-aportes": ListOrdered,
};

/** Barra de abas da carteira, no padrão Investidor 10. */
export function AbasCarteira() {
  return (
    <nav
      aria-label="Seções da carteira"
      className="border-b border-border"
    >
      <ul className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap sm:items-center">
        {ABAS_CARTEIRA.map((to) => {
          const Icone = ICONES[to] ?? LayoutDashboard;
          const rotulo = secaoPorRota(to)?.rotulo ?? to;
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                activeOptions={{ exact: true }}
                className="flex h-full min-w-0 flex-col items-center justify-start gap-1 border-b-2 border-transparent px-1.5 py-2 text-center text-[11px] leading-tight font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:font-semibold data-[status=active]:text-foreground sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm"
              >
                <Icone className="size-5 shrink-0 sm:size-6" />
                <span className="block w-full break-words sm:whitespace-nowrap">{rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
