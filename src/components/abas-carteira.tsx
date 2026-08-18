import {
  Coins,
  FileUp,
  LayoutDashboard,
  ListOrdered,
  PiggyBank,
  Scale,
  Wallet,
} from "lucide-react";
import { BarraAbas, type ItemAba } from "@/components/barra-abas";
import { ABAS_CARTEIRA } from "@/lib/navegacao";

const ICONES: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/carteira": Wallet,
  "/dividendos": Coins,
  "/aportes": PiggyBank,
  "/rebalanceamento": Scale,
  "/historico-aportes": ListOrdered,
  "/importar": FileUp,
};

const ITENS: ItemAba[] = ABAS_CARTEIRA.map((to) => ({
  to,
  icon: ICONES[to] ?? LayoutDashboard,
}));

/** Barra de abas da carteira, no padrão Investidor 10. */
export function AbasCarteira() {
  return <BarraAbas ariaLabel="Seções da carteira" itens={ITENS} />;
}
