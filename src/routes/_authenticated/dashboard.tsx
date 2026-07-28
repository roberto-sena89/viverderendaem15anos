import { createFileRoute } from "@tanstack/react-router";
import { Coins, PiggyBank, Target, TrendingUp, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Progress } from "@/components/ui/progress";
import {
  brl,
  carteira,
  dividendos12m,
  dividendosMensais,
  dyCarteira,
  evolucaoPatrimonio,
  lucroTotal,
  metaFinanceira,
  pct,
  rentabilidade,
  totalAtual,
  totalInvestido,
  valorAtual,
} from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Investidor em 15 Anos" },
      { name: "description", content: "Patrimônio, rentabilidade, dividendos e evolução da carteira em tempo real." },
      { property: "og:title", content: "Dashboard · Investidor em 15 Anos" },
      { property: "og:description", content: "Acompanhe patrimônio, rentabilidade e dividendos da sua carteira." },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-popover-foreground)",
  fontSize: "12px",
};

function Dashboard() {
  const porCategoria = Object.entries(
    carteira.reduce<Record<string, number>>((acc, a) => {
      acc[a.categoria] = (acc[a.categoria] ?? 0) + valorAtual(a);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const progressoMeta = (totalAtual / metaFinanceira) * 100;
  const anosParaMeta = Math.log(metaFinanceira / totalAtual) / Math.log(1.11);

  return (
    <AppShell title="Dashboard" description="Visão geral do seu patrimônio">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Patrimônio" value={brl(totalAtual)} icon={Wallet} hint="Atualizado hoje" />
        <StatCard label="Valor investido" value={brl(totalInvestido)} icon={PiggyBank} hint={`Lucro de ${brl(lucroTotal)}`} />
        <StatCard label="Rentabilidade" value={pct(rentabilidade)} icon={TrendingUp} tone="positive" hint="Desde o início" />
        <StatCard label="Dividendos 12m" value={brl(dividendos12m)} icon={Coins} hint={`DY de ${pct(dyCarteira)}`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rentabilidade mensal" value={pct(0.92)} tone="positive" />
        <StatCard label="Rentabilidade anual" value={pct(14.3)} tone="positive" />
        <StatCard label="Renda passiva mensal" value={brl(dividendos12m / 12)} />
        <StatCard label="Tempo para independência" value={`${anosParaMeta.toFixed(1)} anos`} icon={Target} />
      </div>

      <div className="surface-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Meta financeira</p>
            <p className="text-xs text-muted-foreground">
              {brl(totalAtual)} de {brl(metaFinanceira)}
            </p>
          </div>
          <p className="font-display text-xl font-semibold text-primary">{pct(progressoMeta)}</p>
        </div>
        <Progress value={progressoMeta} className="mt-4 h-2.5" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-6 lg:col-span-2">
          <p className="text-sm font-medium">Evolução patrimonial</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucaoPatrimonio}>
                <defs>
                  <linearGradient id="patr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
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
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} />
                <Area type="monotone" dataKey="patrimonio" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#patr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-6">
          <p className="text-sm font-medium">Composição da carteira</p>
          <div className="mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">
                  {porCategoria.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2 text-xs">
            {porCategoria.map((c, i) => (
              <li key={c.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {c.name}
                </span>
                <span className="font-medium">{pct((c.value / totalAtual) * 100)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-6">
          <p className="text-sm font-medium">Dividendos por mês</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dividendosMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="valor" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-6">
          <p className="text-sm font-medium">Aportes mensais</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolucaoPatrimonio}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="aportes" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
