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
    <nav aria-label="Seções da carteira" className="border-b border-border pb-3">
      <ul className="grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-border/60 bg-muted/40 p-1.5 backdrop-blur-sm sm:flex sm:w-fit sm:flex-wrap sm:justify-start">
        {ABAS_CARTEIRA.map((to) => {
          const Icone = ICONES[to] ?? LayoutDashboard;
          const rotulo = secaoPorRota(to)?.rotulo ?? to;
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                activeOptions={{ exact: true }}
                title={rotulo}
                className="t-aba group flex h-full min-w-0 items-center justify-start gap-2 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-background/70 hover:text-foreground data-[status=active]:bg-background data-[status=active]:font-semibold data-[status=active]:text-foreground data-[status=active]:shadow-[var(--shadow-lift)]"
              >
                <Icone className="size-4 shrink-0 transition-colors group-data-[status=active]:text-primary sm:size-[18px]" />
                <span className="min-w-0 truncate sm:whitespace-nowrap">{rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
