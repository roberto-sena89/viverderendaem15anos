import { BarChart3, Newspaper, Radar, Trophy } from "lucide-react";
import { BarraAbas, type ItemAba } from "@/components/barra-abas";
import { ABAS_MERCADO } from "@/lib/navegacao";

const ICONES: Record<string, typeof BarChart3> = {
  "/cotacoes": BarChart3,
  "/rankings": Trophy,
  "/noticias": Newspaper,
  "/radar": Radar,
};

const ITENS: ItemAba[] = ABAS_MERCADO.map((to) => ({
  to,
  icon: ICONES[to] ?? BarChart3,
}));

/** Barra horizontal com as seções do grupo Mercado. */
export function AbasMercado() {
  return <BarraAbas ariaLabel="Seções de mercado" itens={ITENS} />;
}
