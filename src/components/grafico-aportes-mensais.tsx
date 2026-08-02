import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { brl } from "@/lib/portfolio";

export type PontoAporte = { chave: string; rotulo: string; total: number };

function rotuloCurto(chave: string) {
  const [ano, mes] = chave.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(mes) - 1] ?? mes}/${ano.slice(2)}`;
}

function compacto(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

/**
 * Evolução dos aportes mês a mês (barras) e do valor total acumulado (linha),
 * calculada sobre o histórico completo — independe da paginação da tabela.
 */
export function GraficoAportesMensais({ meses }: { meses: PontoAporte[] }) {
  const dados = useMemo(() => {
    const asc = [...meses].sort((a, b) => a.chave.localeCompare(b.chave));
    let acumulado = 0;
    return asc.map((m) => {
      acumulado += m.total;
      return { rotulo: rotuloCurto(m.chave), completo: m.rotulo, aporte: m.total, acumulado };
    });
  }, [meses]);

  if (dados.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.82rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          Evolução dos aportes
        </p>
        <div className="legenda-grafico text-foreground">
          <span className="chip-legenda serie-aplicado">
            <span className="ponto-legenda" aria-hidden />
            Aporte do mês
          </span>
          <span className="chip-legenda serie-ganho">
            <span className="traco-legenda" aria-hidden />
            Total acumulado
          </span>
        </div>


      </div>

      <div className="mt-2 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dados} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklab, var(--foreground) 18%, transparent)" vertical={false} />
            <XAxis
              dataKey="rotulo"
              tick={{ fontSize: 12, fill: "var(--foreground)", fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              minTickGap={12}
            />
            <YAxis
              yAxisId="esq"
              tickFormatter={compacto}
              tick={{ fontSize: 12, fill: "var(--foreground)", fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <YAxis
              yAxisId="dir"
              orientation="right"
              tickFormatter={compacto}
              tick={{ fontSize: 12, fill: "var(--foreground)", fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, var(--muted) 55%, transparent)" }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(_l: unknown, p: readonly { payload?: { completo?: string } }[] = []) =>
                p?.[0]?.payload?.completo ?? ""
              }
              formatter={(v, n) => [brl(Number(v), 2), n === "aporte" ? "Aporte do mês" : "Total acumulado"]}
            />
            <Bar
              yAxisId="esq"
              dataKey="aporte"
              name="aporte"
              fill="var(--color-serie-investido)"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Line
              yAxisId="dir"
              type="monotone"
              dataKey="acumulado"
              name="acumulado"
              stroke="var(--color-serie-ganho)"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: "var(--color-serie-ganho)", strokeWidth: 0 }}
              activeDot={{ r: 4.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
