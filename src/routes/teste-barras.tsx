import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/teste-barras")({
  head: () => ({
    meta: [
      { title: "Teste de barras" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TesteBarras,
});

const compacto = (v: number) =>
  v >= 1000 ? `R$${Math.round(v / 1000)}mil` : `R$${Math.round(v)}`;

function serie(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    rotulo: `${String((i % 12) + 1).padStart(2, "0")}/2${5 + Math.floor(i / 12)}`,
    patrimonio: 10000 + i * 1500,
    aportadoAcum: 9000 + i * 1200,
  }));
}

function Grafico({ n }: { n: number }) {
  const dados = serie(n);
  return (
    <div data-teste={n} className="mb-8">
      <p className="mb-1 text-sm">{n} períodos</p>
      <div className="w-full overflow-hidden sm:overflow-x-auto">
        <div
          className="h-[380px] w-full sm:min-w-[var(--mw)]"
          style={{ ["--mw" as string]: `${Math.max(320, dados.length * 44)}px` } as Record<string, string>}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dados} margin={{ top: 24, right: 12, left: 4, bottom: 8 }} barGap={-2} barCategoryGap="10%" maxBarSize={34}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="rotulo"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={dados.length > 10 ? -35 : 0}
                textAnchor={dados.length > 10 ? "end" : "middle"}
                height={dados.length > 10 ? 48 : 28}
                tickMargin={8}
              />
              <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={compacto} />
              <Bar dataKey="patrimonio" fill="#10b981" isAnimationActive={false}>
                <LabelList dataKey="patrimonio" position="top" offset={6} formatter={(v: number) => compacto(Number(v))} style={{ fontSize: 10 }} />
              </Bar>
              <Bar dataKey="aportadoAcum" fill="#065f46" isAnimationActive={false}>
                <LabelList dataKey="aportadoAcum" position="top" offset={6} formatter={(v: number) => compacto(Number(v))} style={{ fontSize: 10 }} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TesteBarras() {
  return (
    <main className="p-6">
      {[2, 6, 12, 24, 60].map((n) => (
        <Grafico key={n} n={n} />
      ))}
    </main>
  );
}
