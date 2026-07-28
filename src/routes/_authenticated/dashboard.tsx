import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronDown,
  Coins,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
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
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { AvisoSincronizacao } from "@/components/aviso-sincronizacao";
import { DeltaChip, Panel, TickerMark } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { useAportes, useAtivos, useDividendos } from "@/lib/data";
import type { Ativo } from "@/lib/portfolio";
import {
  brl,
  categorias,
  dividendos12m,
  evolucaoPatrimonio,
  pct,
  resumoCarteira,
  valorAtual,
  valorInvestido,
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




/** Linha de categoria expansível com os ativos daquele grupo. */
function GrupoCategoria({
  categoria,
  ativos,
  totalCarteira,
}: {
  categoria: string;
  ativos: Ativo[];
  totalCarteira: number;
}) {
  const [aberto, setAberto] = useState(ativos.length > 0);
  const total = ativos.reduce((s, a) => s + valorAtual(a), 0);
  const investido = ativos.reduce((s, a) => s + valorInvestido(a), 0);
  const rent = investido > 0 ? ((total - investido) / investido) * 100 : 0;
  const participacao = totalCarteira > 0 ? (total / totalCarteira) * 100 : 0;

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_repeat(5,7rem)_auto]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Landmark className="size-4 shrink-0 text-primary" />
          <span className="truncate font-display text-sm font-bold">{categoria}</span>
        </span>
        <span className="hidden text-right md:block">
          <span className="block text-[0.65rem] text-muted-foreground">Ativos</span>
          <span className="num text-sm font-semibold">{ativos.length}</span>
        </span>
        <span className="hidden text-right md:block">
          <span className="block text-[0.65rem] text-muted-foreground">Valor total</span>
          <span className="num text-sm font-semibold">{brl(total, 2)}</span>
        </span>
        <span className="hidden text-right md:block">
          <span className="block text-[0.65rem] text-muted-foreground">Investido</span>
          <span className="num text-sm font-semibold">{brl(investido, 2)}</span>
        </span>
        <span className="hidden justify-items-end md:grid">
          <span className="block text-[0.65rem] text-muted-foreground">Rentabilidade</span>
          <DeltaChip value={rent} />
        </span>
        <span className="hidden text-right md:block">
          <span className="block text-[0.65rem] text-muted-foreground">% na carteira</span>
          <span className="num text-sm font-semibold">{pct(participacao)}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto ? (
        ativos.length === 0 ? (
          <p className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum ativo nesta classe. Adicione um lançamento para começar.
          </p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {ativos.map((a) => {
              const atual = valorAtual(a);
              const invest = valorInvestido(a);
              const rentAtivo = invest > 0 ? ((atual - invest) / invest) * 100 : 0;
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_repeat(5,7rem)_1rem]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <TickerMark ticker={a.ticker} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{a.ticker}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.nome}</span>
                    </span>
                  </span>
                  <span className="num hidden text-right text-sm md:block">{a.quantidade}</span>
                  <span className="num text-right text-sm font-semibold">{brl(atual, 2)}</span>
                  <span className="num hidden text-right text-sm md:block">{brl(invest, 2)}</span>
                  <span className="hidden justify-items-end md:grid">
                    <DeltaChip value={rentAtivo} />
                  </span>
                  <span className="num hidden text-right text-sm md:block">
                    {pct(totalCarteira > 0 ? (atual / totalCarteira) * 100 : 0)}
                  </span>
                  <span className="hidden md:block" />
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}

function Dashboard() {
  const { data: ativos = [], isLoading } = useAtivos();
  const { data: aportes = [] } = useAportes();
  const { data: proventos = [] } = useDividendos();

  const resumo = resumoCarteira(ativos);
  const evolucao = evolucaoPatrimonio(aportes, resumo.totalAtual);
  const recebidos12m = dividendos12m(proventos);
  const totalProventos = proventos.reduce((s, d) => s + d.valor, 0);

  // barra empilhada: valor aplicado + ganho de capital, como no gráfico do Investidor 10
  const aplicadoFinal = Math.max(resumo.totalInvestido, 1);
  const dadosEvolucao = evolucao.map((m) => {
    const aplicado = Math.min(m.patrimonio, resumo.totalInvestido || m.patrimonio);
    return {
      mes: m.mes,
      aplicado: Math.round(aplicado),
      ganho: Math.round(resumo.lucroTotal * (aplicado / aplicadoFinal)),
    };
  });

  const porCategoria = categorias
    .map((c) => ({
      name: c,
      value: ativos.filter((a) => a.categoria === c).reduce((s, a) => s + valorAtual(a), 0),
    }))
    .filter((c) => c.value > 0);

  if (!isLoading && ativos.length === 0) {
    return (
      <AppShell title="Resumo" description="Visão geral do seu patrimônio">
      <AbasCarteira />
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
    <AppShell title="Resumo" description="Visão geral do seu patrimônio">
      <ResumoKpis />
      <AbasCarteira />
      <AvisoSincronizacao />


      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Evolução do patrimônio" hint="12 meses">
          <div className="mb-2 flex items-center justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--color-chart-1)" }} />
              Valor aplicado
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--color-chart-2)" }} />
              Ganho de capital
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosEvolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v, 2)} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="aplicado" stackId="p" fill="var(--color-chart-1)" name="Valor aplicado" />
                <Bar dataKey="ganho" stackId="p" fill="var(--color-chart-2)" name="Ganho de capital" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Ativos na carteira">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={2} stroke="none">
                  {porCategoria.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v, 2)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {porCategoria.map((c, i) => (
              <li key={c.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {c.name}
                </span>
                <span className="num font-medium">
                  {pct(resumo.totalAtual > 0 ? (c.value / resumo.totalAtual) * 100 : 0)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold">
          Meus ativos <span className="text-sm font-medium text-muted-foreground">({ativos.length})</span>
        </h2>
        {categorias.map((c) => (
          <GrupoCategoria
            key={c}
            categoria={c}
            ativos={ativos.filter((a) => a.categoria === c)}
            totalCarteira={resumo.totalAtual}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 className="size-4 text-primary" />
          Veja proventos, rentabilidade detalhada e rebalanceamento da carteira.
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/dividendos">Proventos</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/aportes">Adicionar lançamento</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

