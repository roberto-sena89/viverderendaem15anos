import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Calendar, ChevronDown, CircleDollarSign, Landmark, Wallet } from "lucide-react";
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
import { ResumoKpis } from "@/components/resumo-kpis";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAportes, useAtivos, useDividendos } from "@/lib/data";
import type { Ativo } from "@/lib/portfolio";
import {
  brl,
  categorias,
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

const PERIODOS = [
  { valor: "3", rotulo: "3 Meses" },
  { valor: "6", rotulo: "6 Meses" },
  { valor: "12", rotulo: "12 Meses" },
];

function FiltroSelect({
  valor,
  onChange,
  icone: Icone,
  opcoes,
  rotuloAcessivel,
}: {
  valor: string;
  onChange: (v: string) => void;
  icone: typeof Calendar;
  opcoes: { valor: string; rotulo: string }[];
  rotuloAcessivel: string;
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger aria-label={rotuloAcessivel} className="h-9 w-[9.5rem] gap-2 text-xs">
        <Icone className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor} className="text-xs">
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Dashboard() {
  const { data: ativos = [], isLoading } = useAtivos();
  const { data: aportes = [] } = useAportes();
  const { data: proventos = [] } = useDividendos();
  void proventos;

  const [periodo, setPeriodo] = useState("12");
  const [tipoEvolucao, setTipoEvolucao] = useState("todos");
  const [tipoComposicao, setTipoComposicao] = useState("todos");

  const opcoesTipo = [
    { valor: "todos", rotulo: "Todos os tipos" },
    ...categorias.map((c) => ({ valor: c, rotulo: c })),
  ];

  const ativosEvolucao = tipoEvolucao === "todos" ? ativos : ativos.filter((a) => a.categoria === tipoEvolucao);
  const resumo = resumoCarteira(ativos);
  const resumoEvolucao = resumoCarteira(ativosEvolucao);
  const evolucao = evolucaoPatrimonio(aportes, resumoEvolucao.totalAtual);

  // barra empilhada: valor aplicado + ganho de capital, como no gráfico do Investidor 10
  const aplicadoFinal = Math.max(resumoEvolucao.totalInvestido, 1);
  const dadosEvolucao = evolucao.slice(-Number(periodo)).map((m) => {
    const aplicado = Math.min(m.patrimonio, resumoEvolucao.totalInvestido || m.patrimonio);
    return {
      mes: m.mes,
      aplicado: Math.round(aplicado),
      ganho: Math.round(resumoEvolucao.lucroTotal * (aplicado / aplicadoFinal)),
    };
  });

  const ativosComposicao =
    tipoComposicao === "todos" ? ativos : ativos.filter((a) => a.categoria === tipoComposicao);
  const totalComposicao = ativosComposicao.reduce((s, a) => s + valorAtual(a), 0);
  const porCategoria = categorias
    .map((c) => ({
      name: c,
      value: ativosComposicao.filter((a) => a.categoria === c).reduce((s, a) => s + valorAtual(a), 0),
    }))
    .filter((c) => c.value > 0);

  const carteiraVazia = !isLoading && ativos.length === 0;

  return (
    <AppShell title="Resumo" description="Visão geral do seu patrimônio">
      <AbasCarteira />
      <AvisoSincronizacao />

      {carteiraVazia ? (
        <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Wallet className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold">Sua carteira está vazia</p>
              <p className="text-xs text-muted-foreground">
                Registre seu primeiro aporte ou cadastre um ativo para preencher os gráficos abaixo.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link to="/aportes">Registrar aporte</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/carteira">Cadastrar ativo</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <ResumoKpis />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Evolução do Patrimônio"
          action={
            <div className="flex items-center gap-2">
              <FiltroSelect
                valor={periodo}
                onChange={setPeriodo}
                icone={Calendar}
                opcoes={PERIODOS}
                rotuloAcessivel="Período do gráfico de evolução"
              />
              <FiltroSelect
                valor={tipoEvolucao}
                onChange={setTipoEvolucao}
                icone={CircleDollarSign}
                opcoes={opcoesTipo}
                rotuloAcessivel="Tipo de ativo na evolução"
              />
            </div>
          }
        >
          <div className="mb-3 flex items-center justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "var(--color-chart-1)" }} />
              Valor aplicado
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "var(--color-chart-2)" }} />
              Ganho de Capital
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosEvolucao} margin={{ left: 12, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis
                  tickFormatter={(v: number) => brl(v, 2)}
                  tickLine={false}
                  axisLine={false}
                  width={92}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v, 2)} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="aplicado" stackId="p" fill="var(--color-chart-1)" name="Valor aplicado" />
                <Bar dataKey="ganho" stackId="p" fill="var(--color-chart-2)" name="Ganho de Capital" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Ativos na Carteira"
          action={
            <FiltroSelect
              valor={tipoComposicao}
              onChange={setTipoComposicao}
              icone={CircleDollarSign}
              opcoes={opcoesTipo}
              rotuloAcessivel="Tipo de ativo na composição"
            />
          }
        >
          {porCategoria.length === 0 ? (
            <p className="grid h-52 place-items-center text-center text-sm text-muted-foreground">
              Sem ativos para exibir neste filtro.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-52 min-w-[12rem] flex-1">
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
              <ul className="space-y-2 text-xs">
                {porCategoria.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="num ml-auto font-medium">
                      {pct(totalComposicao > 0 ? (c.value / totalComposicao) * 100 : 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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

