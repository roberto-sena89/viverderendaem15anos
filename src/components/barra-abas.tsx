import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { secaoPorRota } from "@/lib/navegacao";

export interface ItemAba {
  to: string;
  icon: LucideIcon;
}

/**
 * Barra horizontal de abas entre seções de um grupo.
 *
 * Adaptativa por breakpoint:
 * - < sm: grid com 2 colunas (aproveita a largura no celular);
 * - ≥ sm: flex em linha com wrap (abas não esticam);
 * - alvos de toque via `alvo-toque-linha` (44px em ponteiro grosso, 32px em mouse).
 */
export function BarraAbas({ itens, ariaLabel }: { itens: ItemAba[]; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className="border-b border-border pb-3">
      <ul className="grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-border/60 bg-muted/40 p-1.5 backdrop-blur-sm sm:flex sm:w-fit sm:flex-wrap sm:justify-start">
        {itens.map(({ to, icon: Icone }) => {
          const rotulo = secaoPorRota(to)?.rotulo ?? to;
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                activeOptions={{ exact: true }}
                title={rotulo}
                className="t-aba alvo-toque-linha group flex h-full min-w-0 items-center justify-start gap-2 rounded-xl px-3 py-2 text-muted-foreground transition-all hover:bg-background/70 hover:text-foreground data-[status=active]:bg-background data-[status=active]:font-semibold data-[status=active]:text-foreground data-[status=active]:shadow-[var(--shadow-lift)]"
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
