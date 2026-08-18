import {
  TrendingUp,
  Building2,
  Landmark,
  Globe,
  PieChart,
  Leaf,
  Wallet,
  Coins,
  Bitcoin,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const ICONES_CATEGORIAS: Record<string, LucideIcon> = {
  Ações: TrendingUp,
  FIIS: Building2,
  FIIs: Building2,
  "Tesouro Direto": Landmark,
  Tesouro: Landmark,
  BDR: Globe,
  "ETF Brasil": BarChart3,
  "ETF (Global)": Globe,
  "ETF EUA": Globe,
  Fiagro: Leaf,
  "Fundos de Investimentos": PieChart,
  "Renda Fixa": Wallet,
  Stocks: TrendingUp,
  REITs: Building2,
  Criptomoedas: Bitcoin,
  Cripto: Bitcoin,
  Default: Coins,
};

export function getIconeCategoria(categoria: string): LucideIcon {
  return ICONES_CATEGORIAS[categoria] || ICONES_CATEGORIAS["Default"];
}
