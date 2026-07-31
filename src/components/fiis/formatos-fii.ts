import type { LinhaFii } from "@/lib/fiis-base";

export const fmtMoeda = (v: number | null) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtPct = (v: number | null, casas = 2) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

export const fmtPctSimples = (v: number | null, casas = 2) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

export const fmtNumero = (v: number | null, casas = 2) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Compacta valores grandes: 10.960.000.000 -> "10,96 B". */
export const fmtCompacto = (v: number | null) => {
  if (v === null || !Number.isFinite(v) || v === 0) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} B`;
  if (abs >= 1e6) return `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} M`;
  if (abs >= 1e3) return `${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
};

export const corVar = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "text-muted-foreground"
    : v > 0
      ? "text-positive"
      : v < 0
        ? "text-negative"
        : "text-muted-foreground";

/** Nome curto e legível a partir da razão social completa do fundo. */
export function nomeCurto(l: LinhaFii) {
  const bruto = l.nome
    .replace(/\s*-?\s*(FUNDO DE INVESTIMENTO IMOBILI[ÁA]RIO|FII|FIAGRO|FUNDO DE INVESTIMENTO)\b.*$/i, "")
    .replace(/\s*-\s*RESPONSABILIDADE LIMITADA.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const texto = bruto || l.nome;
  return texto
    .toLowerCase()
    .replace(/(^|\s|\/)([a-zà-ú])/g, (_, a, b) => a + b.toUpperCase())
    .slice(0, 42);
}
