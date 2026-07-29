import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Calendar, ChevronDown, CircleDollarSign, Landmark, PiggyBank, Wallet } from "lucide-react";
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

import { DialogTransacao } from "@/components/dialog-transacao";
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
import { corCategoria } from "@/lib/cores-ativos";
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
      { title: "Resumo · Investidor em 15 Anos" },
      { name: "description", content: "Patrimônio, rentabilidade, dividendos e evolução da carteira em tempo real." },
      { property: "og:title", content: "Resumo · Investidor em 15 Anos" },
      { property: "og:description", content: "Acompanhe patrimônio, rentabilidade e dividendos da sua carteira." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/dashboard" }],
  }),
  component: Dashboard,
});

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
  const [aberto, setAberto] = useState(false);
  const total = ativos.reduce((s, a) => s + valorAtual(a), 0);
  const investido = ativos.reduce((s, a) => s + valorInvestido(a), 0);
  const lucro = total - investido;
  const rent = investido > 0 ? (lucro / investido) * 100 : 0;
  const participacao = totalCarteira > 0 ? (total / totalCarteira) * 100 : 0;
  const cor = corCategoria(categoria);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,14rem)_repeat(5,minmax(0,1fr))_1.25rem]"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="h-7 w-1 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-bold whitespace-pre-line">{categoria}</span>
            <span className="block text-[0.68rem] text-muted-foreground">
              {ativos.length} {ativos.length === 1 ? "ativo" : "ativos"}
            </span>
          </span>
        </span>
        <span className="hidden text-right md:block">
          <span className="num block text-sm font-semibold">{brl(total, 2)}</span>
          <span className="block text-[0.65rem] text-muted-foreground">saldo</span>
        </span>
        <span className="hidden text-right md:block">
          <span className="num block text-sm">{brl(investido, 2)}</span>
          <span className="block text-[0.65rem] text-muted-foreground">investido</span>
        </span>
        <span className="hidden text-right md:block">
          <span
            className={`num block text-sm font-semibold ${lucro > 0 ? "text-success" : lucro < 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {lucro > 0 ? "+" : ""}
            {brl(lucro, 2)}
          </span>
          <span className="block text-[0.65rem] text-muted-foreground">lucro</span>
        </span>
        <span className="hidden justify-items-end md:grid">
          <DeltaChip value={rent} />
          <span className="block text-[0.65rem] text-muted-foreground">rentab.</span>
        </span>
        <span className="hidden md:block">
          <span className="num block text-right text-sm font-semibold">{pct(participacao)}</span>
          <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.min(100, participacao)}%`, backgroundColor: cor }}
            />
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto ? (
        ativos.length === 0 ? (
          <p className="border-t border-border/60 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
            Nenhum ativo nesta classe.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 border-t border-border/60 bg-muted/20">
            {ativos.map((a) => {
              const atual = valorAtual(a);
              const invest = valorInvestido(a);
              const lucroA = atual - invest;
              const rentAtivo = invest > 0 ? (lucroA / invest) * 100 : 0;
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 md:grid-cols-[minmax(0,14rem)_repeat(5,minmax(0,1fr))_1.25rem]"
                >
                  <span className="flex min-w-0 items-center gap-2.5 pl-3.5">
                    <TickerMark ticker={a.ticker} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{a.ticker}</span>
                      <span className="num block truncate text-[0.68rem] text-muted-foreground">
                        {a.quantidade} × {brl(a.precoMedio, 2)}
                      </span>
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="num block text-sm font-semibold">{brl(atual, 2)}</span>
                    <span className="num block text-[0.65rem] text-muted-foreground">
                      atual {brl(a.precoAtual, 2)}
                    </span>
                  </span>
                  <span className="num hidden text-right text-sm md:block">{brl(invest, 2)}</span>
                  <span
                    className={`num hidden text-right text-sm font-medium md:block ${lucroA > 0 ? "text-success" : lucroA < 0 ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {lucroA > 0 ? "+" : ""}
                    {brl(lucroA, 2)}
                  </span>
                  <span className="hidden justify-items-end md:grid">
                    <DeltaChip value={rentAtivo} />
                  </span>
                  <span className="num hidden text-right text-sm text-muted-foreground md:block">
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
  { valor: "inicio", rotulo: "Desde o início" },
  { valor: "12", rotulo: "12 Meses" },
  { valor: "24", rotulo: "2 Anos" },
  { valor: "60", rotulo: "5 Anos" },
  { valor: "120", rotulo: "10 Anos" },
  { valor: "custom", rotulo: "Data personalizada" },
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
        <Icone className="size-8 shrink-0 text-muted-foreground" />
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
  const [inicioCustom, setInicioCustom] = useState("");
  const [fimCustom, setFimCustom] = useState("");
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

  const evolucaoFiltrada =
    periodo === "custom"
      ? evolucao.filter(
          (m) => (!inicioCustom || m.chave >= inicioCustom) && (!fimCustom || m.chave <= fimCustom),
        )
      : periodo === "inicio"
        ? evolucao
        : evolucao.slice(-Number(periodo));

  // barra empilhada: valor aplicado + ganho de capital, como no gráfico do Investidor 10
  const aplicadoFinal = Math.max(resumoEvolucao.totalInvestido, 1);
  const dadosEvolucao = evolucaoFiltrada.map((m) => {
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


      {carteiraVazia ? (
        <div className="surface-card flex flex-wrap items-center gap-3 p-4">
          <PiggyBank className="size-8 shrink-0 text-muted-foreground" />
          <DialogTransacao>
            <Button
              size="sm"
              className="font-display text-[12px] font-semibold uppercase tracking-wide"
            >
              REGISTRAR INVESTIMENTO
            </Button>
          </DialogTransacao>
        </div>
      ) : null}

      <ResumoKpis />



      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Evolução do Patrimônio"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <FiltroSelect
                valor={periodo}
                onChange={setPeriodo}
                icone={Calendar}
                opcoes={PERIODOS}
                rotuloAcessivel="Período do gráfico de evolução"
              />
              {periodo === "custom" ? (
                <div className="flex items-center gap-1">
                  <input
                    type="month"
                    aria-label="Mês inicial"
                    value={inicioCustom}
                    onChange={(e) => setInicioCustom(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <input
                    type="month"
                    aria-label="Mês final"
                    value={fimCustom}
                    onChange={(e) => setFimCustom(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                  />
                </div>
              ) : null}
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
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative h-56 min-w-[13rem] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porCategoria}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      cornerRadius={4}
                      stroke="var(--color-card)"
                      strokeWidth={2}
                    >
                      {porCategoria.map((_, i) => (
                        <Cell key={i} fill={corCategoria(porCategoria[i].name)} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v, 2)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <p className="text-[0.6rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      Total
                    </p>
                    <p className="num font-display text-base font-bold">{brl(totalComposicao, 2)}</p>
                  </div>
                </div>
              </div>
              <ul className="min-w-[15rem] flex-1 space-y-1.5 text-xs">
                {porCategoria.map((c, i) => {
                  const cor = corCategoria(c.name);
                  const percentual = totalComposicao > 0 ? (c.value / totalComposicao) * 100 : 0;
                  return (
                    <li
                      key={c.name}
                      className="flex items-center gap-3 rounded-md border border-transparent bg-muted/40 px-2.5 py-2 transition-colors hover:border-border hover:bg-muted"
                      style={{ borderLeft: `3px solid ${cor}` }}
                    >
                      <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                        <span className="truncate whitespace-pre-line">{c.name}</span>
                      </span>
                      <span className="ml-auto flex shrink-0 items-baseline gap-2">
                        <span className="num text-[0.68rem] text-muted-foreground">{brl(c.value, 2)}</span>
                        <span className="num w-12 text-right font-semibold" style={{ color: cor }}>
                          {pct(percentual)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Panel>
      </div>


      <section className="panel overflow-hidden">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-bold tracking-wide uppercase">
            Meus ativos <span className="text-muted-foreground normal-case">({ativos.length})</span>
          </h2>
          <p className="num text-xs text-muted-foreground">
            {categoriasComAtivos.length} classes · {brl(resumo.totalAtual, 2)}
          </p>
        </header>

        <div className="hidden grid-cols-[minmax(0,14rem)_repeat(5,minmax(0,1fr))_1.25rem] gap-x-4 border-b border-border bg-muted/30 px-4 py-2 text-[0.62rem] font-semibold tracking-wider text-muted-foreground uppercase md:grid">
          <span>Classe / ativo</span>
          <span className="text-right">Saldo</span>
          <span className="text-right">Investido</span>
          <span className="text-right">Lucro (R$)</span>
          <span className="text-right">Rentab.</span>
          <span className="text-right">% Carteira</span>
          <span />
        </div>

        {categoriasComAtivos.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum ativo cadastrado ainda.
          </p>
        ) : (
          categoriasComAtivos.map((c) => (
            <GrupoCategoria
              key={c}
              categoria={c}
              ativos={ativos.filter((a) => a.categoria === c)}
              totalCarteira={resumo.totalAtual}
            />
          ))
        )}
      </section>
    </AppShell>
  );
}

