import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LinhaCommodity } from "@/lib/commodities-base";
import { corVar, fmtDinheiro, fmtVar } from "@/components/commodities/card-commodity";
import { cn } from "@/lib/utils";
import { TextoTruncado } from "@/components/texto-truncado";

const CORES = ["#22c55e", "#f59e0b", "#38bdf8", "#f43f5e", "#a78bfa", "#facc15"];

/**
 * Comparação lado a lado. As unidades e ordens de grandeza são muito diferentes
 * entre commodities (barril x tonelada x saca), então o gráfico usa performance
 * normalizada: todas partem de 0% no início da janela de 30 pregões.
 */
export function ComparadorCommodities({
  linhas,
  usdBrl,
  aberto,
  aoFechar,
}: {
  linhas: LinhaCommodity[];
  usdBrl: number;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const serie = useMemo(() => {
    const tamanho = Math.min(...linhas.map((l) => l.spark.length).filter((n) => n > 1), 30);
    if (!Number.isFinite(tamanho) || tamanho < 2) return [];
    return Array.from({ length: tamanho }, (_, i) => {
      const ponto: Record<string, number | string> = { dia: `D-${tamanho - 1 - i}` };
      for (const l of linhas) {
        const janela = l.spark.slice(-tamanho);
        const base = janela[0];
        const atual = janela[i];
        if (base && atual) ponto[l.codigo] = ((atual - base) / base) * 100;
      }
      return ponto;
    });
  }, [linhas]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => (v ? undefined : aoFechar())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comparar commodities ({linhas.length})</DialogTitle>
        </DialogHeader>

        <div className="pilha-secao">
          <div className="panel p-cartao">
            <p className="panel-title mb-2">Performance normalizada (30 pregões, % desde o início)</p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" minTickGap={24} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="var(--color-muted-foreground)"
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.65rem",
                      fontSize: "0.75rem",
                    }}
                    formatter={(v: number, nome: string) => [`${v.toFixed(2)}%`, nome]}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.7rem" }} />
                  {linhas.map((l, i) => (
                    <Line
                      key={l.codigo}
                      type="monotone"
                      dataKey={l.codigo}
                      name={l.nome}
                      stroke={CORES[i % CORES.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-secao sm:grid-cols-2 lg:grid-cols-3">
            {linhas.map((l, i) => (
              <div key={l.codigo} className="panel p-bloco">
                <p className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ background: CORES[i % CORES.length] }}
                    aria-hidden
                  />
                  <TextoTruncado as="span" className="t-ticker min-w-0" texto={l.nome}>{l.nome}</TextoTruncado>
                </p>
                <p className="font-display mt-1 text-base tabular-nums">
                  {fmtDinheiro(l.precoUsd, "US$")}
                  <span className="ml-1 text-[0.7rem] font-normal text-muted-foreground">/ {l.unidade}</span>
                </p>
                <p className="t-num-sm text-muted-foreground">
                  {fmtDinheiro(l.precoUsd === null ? null : l.precoUsd * usdBrl, "R$")}
                </p>
                <div className="t-caption mt-bloco grid grid-cols-3 gap-1 border-t border-border pt-bloco text-center">
                  {[
                    { r: "Dia", v: l.variacaoDia },
                    { r: "30d", v: l.variacao30d },
                    { r: "12m", v: l.variacao12m },
                  ].map((x) => (
                    <div key={x.r}>
                      <p className="text-muted-foreground uppercase">{x.r}</p>
                      <p className={cn("font-semibold tabular-nums", corVar(x.v))}>{fmtVar(x.v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
