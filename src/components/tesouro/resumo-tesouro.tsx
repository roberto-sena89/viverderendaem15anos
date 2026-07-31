import { CalendarClock, Landmark, LineChart, Percent } from "lucide-react";
import type { RespostaTesouro } from "@/lib/tesouro-base";

export const fmtNum = (v: number | null | undefined, casas = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const fmtBRL = (v: number | null | undefined, casas = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
      });

export const fmtPct = (v: number | null | undefined, casas = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : `${fmtNum(v, casas)}%`;

export const fmtData = (iso: string | null | undefined) =>
  !iso ? "—" : new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");

export const fmtDataCurta = (iso: string | null | undefined) =>
  !iso
    ? "—"
    : new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

/** Painel de resumo do mercado de juros que baliza os títulos públicos. */
export function ResumoTesouro({ dados }: { dados: RespostaTesouro | undefined }) {
  const linhas = dados?.linhas ?? [];
  const taxasReais = linhas
    .filter((l) => l.indexador === "IPCA" && l.taxaCompra !== null && l.anosAteVencimento >= 1)
    .map((l) => l.taxaCompra!);
  const maiorReal = taxasReais.length ? Math.max(...taxasReais) : null;
  const prefixados = linhas.filter(
    (l) => l.indexador === "PRE" && l.taxaCompra !== null && l.anosAteVencimento >= 1,
  );
  const maiorPre = prefixados.length ? Math.max(...prefixados.map((l) => l.taxaCompra!)) : null;

  const cards = [
    {
      icone: Percent,
      rotulo: "Meta Selic",
      valor: fmtPct(dados?.selic),
      detalhe: dados?.proximoCopom
        ? `Próximo Copom em ${fmtData(dados.proximoCopom)}`
        : "Definida pelo Copom",
    },
    {
      icone: LineChart,
      rotulo: "IPCA (12 meses)",
      valor: fmtPct(dados?.ipca12m),
      detalhe: dados?.ipcaReferencia
        ? `Última divulgação: ${dados.ipcaReferencia}`
        : "IBGE via Banco Central",
    },
    {
      icone: Landmark,
      rotulo: "Maior juro real",
      valor: maiorReal !== null ? `IPCA + ${fmtNum(maiorReal)}%` : "—",
      detalhe: "Melhor taxa entre os títulos IPCA+",
    },
    {
      icone: CalendarClock,
      rotulo: "Maior prefixado",
      valor: fmtPct(maiorPre),
      detalhe: `${linhas.length} títulos disponíveis hoje`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.rotulo} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <c.icone className="size-3.5" aria-hidden />
            {c.rotulo}
          </div>
          <p className="mt-1.5 truncate text-lg font-semibold tabular-nums">{c.valor}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.detalhe}</p>
        </div>
      ))}
    </div>
  );
}
