import type { LinhaCotacao } from "@/lib/grade-mercado.functions";

export const fmtPreco = (v: number | null, moeda: string) => {
  if (v === null || !Number.isFinite(v)) return "—";
  const casas = Math.abs(v) < 1 ? 4 : 2;
  const simbolo = moeda === "BRL" ? "R$" : moeda === "USD" ? "US$" : `${moeda} `;
  return `${simbolo} ${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
};

export const fmtVar = (v: number | null) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtPercent = (v: number | null) => (v === null ? "—" : `${fmtVar(v)}%`);

export const fmtVolume = (v: number | null) => {
  if (v === null || !Number.isFinite(v) || v === 0) return "—";
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} B`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} M`;
  if (v >= 1e3) return `${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
};

export const corVar = (v: number | null) =>
  v === null
    ? "text-muted-foreground"
    : v > 0
      ? "text-positive"
      : v < 0
        ? "text-negative"
        : "text-muted-foreground";

/** Posição do preço atual dentro da faixa mínima/máxima do dia (0–100). */
export function posicaoFaixa(l: LinhaCotacao): number | null {
  if (l.preco === null || l.minimo === null || l.maximo === null) return null;
  const faixa = l.maximo - l.minimo;
  if (faixa <= 0) return 50;
  return Math.min(100, Math.max(0, ((l.preco - l.minimo) / faixa) * 100));
}
