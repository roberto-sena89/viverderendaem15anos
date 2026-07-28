import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { useAportes, useAtivos, useDividendos } from "@/lib/data";
import { brl, dividendos12m, evolucaoPatrimonio, pct, resumoCarteira } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/estatisticas")({
  head: () => ({
    meta: [
      { title: "Rentabilidade · Investidor em 15 Anos" },
      { name: "description", content: "CAGR, drawdown, rentabilidade real, dividendos e evolução do patrimônio da sua carteira." },
      { property: "og:title", content: "Rentabilidade · Investidor em 15 Anos" },
      { property: "og:description", content: "Indicadores avançados de performance da carteira de investimentos." },
    ],
  }),
  component: Estatisticas,
});

function Estatisticas() {
  const { data: carteira = [] } = useAtivos();
  const { data: aportes = [] } = useAportes();
  const { data: proventos = [] } = useDividendos();

  const { totalAtual, lucroTotal, rentabilidade } = resumoCarteira(carteira);
  const evolucao = evolucaoPatrimonio(aportes, totalAtual);

  const inicio = evolucao[0]?.patrimonio ?? 0;
  const cagr = inicio > 0 ? (totalAtual / inicio - 1) * 100 : 0;
  const inflacao = 4.5;
  const rentReal = ((1 + rentabilidade / 100) / (1 + inflacao / 100) - 1) * 100;

  let pico = 0;
  let drawdown = 0;
  for (const p of evolucao) {
    pico = Math.max(pico, p.patrimonio);
    if (pico > 0) drawdown = Math.min(drawdown, (p.patrimonio / pico - 1) * 100);
  }

  return (
    <AppShell title="Rentabilidade" description="Performance detalhada da carteira">
      <AbasCarteira />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="CAGR (12m)" value={pct(cagr)} tone={cagr >= 0 ? "positive" : "negative"} />
        <StatCard label="Rentabilidade acumulada" value={pct(rentabilidade)} tone={rentabilidade >= 0 ? "positive" : "negative"} />
        <StatCard label="Rentabilidade real" value={pct(rentReal)} hint={`Descontada inflação de ${pct(inflacao)}`} />
        <StatCard label="Máximo drawdown" value={pct(drawdown)} tone={drawdown < 0 ? "negative" : "default"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lucro total" value={brl(lucroTotal)} tone={lucroTotal >= 0 ? "positive" : "negative"} />
        <StatCard label="Dividendos 12m" value={brl(dividendos12m(proventos))} />
        <StatCard label="Patrimônio" value={brl(totalAtual)} />
        <StatCard label="Aportes (12m)" value={brl(evolucao.reduce((s, m) => s + m.aportes, 0))} />
      </div>

      <div className="surface-card p-6">
        <p className="panel-title">Patrimônio acumulado</p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolucao}>
              <defs>
                <linearGradient id="stat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
              <YAxis
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--color-muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(v: number) => brl(v)}
              />
              <Area type="monotone" dataKey="patrimonio" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#stat)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppShell>
  );
}
