import { Bot, Target, Telescope } from "lucide-react";
import { BarraAbas, type ItemAba } from "@/components/barra-abas";
import { ABAS_PLANEJAMENTO } from "@/lib/navegacao";

const ICONES: Record<string, typeof Target> = {
  "/planejador": Telescope,
  "/metas": Target,
  "/chat": Bot,
};

const ITENS: ItemAba[] = ABAS_PLANEJAMENTO.map((to) => ({
  to,
  icon: ICONES[to] ?? Target,
}));

/** Barra horizontal com as seções do grupo Planejamento. */
export function AbasPlanejamento() {
  return <BarraAbas ariaLabel="Seções de planejamento" itens={ITENS} />;
}
