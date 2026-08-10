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
      <ul className="scrollbar-none grid min-w-0 grid-cols-2 items-stretch gap-1 sm:flex sm:snap-x sm:snap-mandatory sm:overflow-x-auto">
        {ABAS_MERCADO.map((to) => {
          const Icone = ICONES[to] ?? BarChart3;
          const rotulo = secaoPorRota(to)?.rotulo ?? to;
          return (
            <li key={to} className="min-w-0 sm:shrink-0 sm:snap-start">
              <Link
                to={to}
                activeOptions={{ exact: true }}
                title={rotulo}
                className="t-aba flex h-full min-w-0 items-center justify-center gap-2 border-b-2 border-transparent px-2 py-2.5 text-center text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:font-semibold data-[status=active]:text-foreground sm:px-3"
              >
                <Icone className="size-4 shrink-0 sm:size-5" />
                <span className="min-w-0 truncate sm:whitespace-nowrap">{rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>

    </nav>
  );
}
