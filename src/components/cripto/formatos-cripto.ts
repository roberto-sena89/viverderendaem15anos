import type { LinhaCripto } from "@/lib/cripto-base";

/** Preço com casas decimais adaptativas: de fração de centavo a centenas de milhares. */
export function fmtPreco(v: number | null, simbolo: string) {
  if (v === null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const casas = abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : abs >= 0.0001 ? 6 : 8;
  return `${simbolo} ${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
}

export const fmtPct = (v: number | null, casas = 2) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

export const fmtCompacto = (v: number | null, simbolo = "US$") => {
  if (v === null || !Number.isFinite(v) || v === 0) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e12)
    return `${simbolo} ${(v / 1e12).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} T`;
  if (abs >= 1e9)
    return `${simbolo} ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} B`;
  if (abs >= 1e6)
    return `${simbolo} ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} M`;
  if (abs >= 1e3)
    return `${simbolo} ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `${simbolo} ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};

export const fmtQuantidade = (v: number | null) =>
  v === null || !Number.isFinite(v) ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

/**
 * Cor da variação. Stablecoins usam cor neutra: oscilar centavos em torno do
 * dólar não é "queda" no sentido usual das demais criptomoedas.
 */
export function corVar(v: number | null, stable = false) {
  if (v === null || !Number.isFinite(v)) return "text-muted-foreground";
  if (stable && Math.abs(v) < 1) return "text-muted-foreground";
  return v > 0 ? "text-positive" : v < 0 ? "text-negative" : "text-muted-foreground";
}

export const precoBrl = (l: LinhaCripto, usdBrl: number) =>
  l.precoUsd === null ? null : l.precoUsd * usdBrl;
