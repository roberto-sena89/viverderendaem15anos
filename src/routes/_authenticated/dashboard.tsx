import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAportes, useAtivos, useDividendos, useMetas } from "@/lib/data";
import {
  brl,
  dividendos12m,
  dividendosMensais,
  evolucaoPatrimonio,
  pct,
  resumoCarteira,
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
  const { data: ativos = [], isLoading } = useAtivos();
  const { data: aportes = [] } = useAportes();
  const { data: proventos = [] } = useDividendos();
  const { data: metas = [] } = useMetas();

  const resumo = resumoCarteira(ativos);
  const evolucao = evolucaoPatrimonio(aportes, resumo.totalAtual);
  const proventosMes = dividendosMensais(proventos);
  const recebidos12m = dividendos12m(proventos);

  const porCategoria = Object.entries(
    ativos.reduce<Record<string, number>>((acc, a) => {
      acc[a.categoria] = (acc[a.categoria] ?? 0) + valorAtual(a);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const metaFinanceira = metas.length
    ? Math.max(...metas.filter((m) => m.alvo > resumo.totalAtual).map((m) => m.alvo), 0) ||
      Math.max(...metas.map((m) => m.alvo))
    : 0;
  const progressoMeta = metaFinanceira > 0 ? (resumo.totalAtual / metaFinanceira) * 100 : 0;
  const anosParaMeta =
    metaFinanceira > 0 && resumo.totalAtual > 0
      ? Math.log(metaFinanceira / resumo.totalAtual) / Math.log(1.11)
      : 0;

  if (!isLoading && ativos.length === 0) {
    return (
      <AppShell title="Dashboard" description="Visão geral do seu patrimônio">
        <div className="surface-card grid place-items-center gap-3 p-16 text-center">
          <Wallet className="size-8 text-muted-foreground" />
          <p className="font-display text-lg font-semibold">Sua carteira está vazia</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Registre seu primeiro aporte ou cadastre um ativo para começar a acompanhar patrimônio,
            rentabilidade e dividendos.
          </p>
          <div className="mt-2 flex gap-2">
            <Button asChild>
              <Link to="/aportes">Registrar aporte</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/carteira">Cadastrar ativo</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard" description="Visão geral do seu patrimônio">
      <AvisoSincronizacao />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard label="Patrimônio" value={brl(resumo.totalAtual)} icon={Wallet} hint="Atualizado agora" />
        <StatCard label="Valor investido" value={brl(resumo.totalInvestido)} icon={PiggyBank} hint={`Lucro de ${brl(resumo.lucroTotal)}`} />
        <StatCard label="Rentabilidade" value={pct(resumo.rentabilidade)} icon={TrendingUp} tone={resumo.rentabilidade >= 0 ? "positive" : "negative"} hint="Desde o início" />
        <StatCard label="Dividendos 12m" value={brl(recebidos12m)} icon={Coins} hint={`DY estimado de ${pct(resumo.dyCarteira)}`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Proventos recebidos" value={brl(proventos.reduce((s, d) => s + d.valor, 0))} />
        <StatCard label="Aportes 12m" value={brl(evolucao.reduce((s, m) => s + m.aportes, 0))} />
        <StatCard label="Renda passiva mensal" value={brl(recebidos12m / 12)} />
        <StatCard label="Tempo para a próxima meta" value={metaFinanceira ? `${anosParaMeta.toFixed(1)} anos` : "—"} icon={Target} />
      </div>

      {metaFinanceira > 0 ? (
        <div className="surface-card p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Próxima meta financeira</p>
              <p className="text-xs text-muted-foreground">
                {brl(resumo.totalAtual)} de {brl(metaFinanceira)}
              </p>
            </div>
            <p className="font-display text-xl font-semibold text-primary">{pct(progressoMeta)}</p>
          </div>
          <Progress value={progressoMeta} className="mt-4 h-2.5" />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-6 lg:col-span-2">
          <p className="text-sm font-medium">Evolução patrimonial (12 meses)</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucao}>
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
                <span className="font-medium">
                  {pct(resumo.totalAtual > 0 ? (c.value / resumo.totalAtual) * 100 : 0)}
                </span>
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
              <BarChart data={proventosMes}>
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
              <BarChart data={evolucao}>
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
