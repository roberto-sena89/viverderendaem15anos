import { Link } from "@tanstack/react-router";
import { BarChart3, Newspaper, Radar, Trophy } from "lucide-react";
import { ABAS_MERCADO, secaoPorRota } from "@/lib/navegacao";

const ICONES: Record<string, typeof BarChart3> = {
  "/cotacoes": BarChart3,
  "/rankings": Trophy,
  "/noticias": Newspaper,
  "/radar": Radar,
};

/** Barra horizontal com as seções do grupo Mercado. */
export function AbasMercado() {
  return (
    <nav aria-label="Seções de mercado" className="border-b border-border">
      <ul className="scrollbar-none flex min-w-0 items-stretch gap-1 overflow-x-auto">
        {ABAS_MERCADO.map((to) => {
          const Icone = ICONES[to] ?? BarChart3;
          const rotulo = secaoPorRota(to)?.rotulo ?? to;
          return (
            <li key={to} className="min-w-0 shrink-0">
              <Link
                to={to}
                activeOptions={{ exact: true }}
                className="t-aba flex h-full min-w-0 items-center justify-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-center text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:font-semibold data-[status=active]:text-foreground"
              >
                <Icone className="size-5 shrink-0" />
                <span className="whitespace-nowrap">{rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
