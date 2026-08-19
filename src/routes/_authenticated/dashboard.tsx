import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, CircleDollarSign, Plus, Wallet } from "lucide-react";
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
import { ResumoCategorias } from "@/components/dashboard/resumo-categorias";
import { AppShell } from "@/components/app-shell";
import { StatusCotacoes } from "@/components/status-cotacoes";
import { BotaoExportarCarteira } from "@/components/botao-exportar-carteira";
import { CarteiraGrupos } from "@/components/carteira-grupos";
import { DialogTransacao } from "@/components/dialog-transacao";
import { EstadoVazio } from "@/components/estado-vazio";
import { PainelAnaliseRisco } from "@/components/painel-analise-risco";
import { DetalheEvolucaoMensal } from "@/components/detalhe-evolucao-mensal";
import { Panel } from "@/components/panel";
import { ResumoKpis } from "@/components/resumo-kpis";
import { SaudeCarteira } from "@/components/saude-carteira";
import { TooltipEvolucao } from "@/components/tooltip-evolucao";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAtivosAoVivo } from "@/lib/cotacoes-tempo-real";
import { useAportes, useDividendos } from "@/lib/data";
import { classeDoAtivo } from "@/lib/portfolio";
import { corCategoria } from "@/lib/cores-ativos";
import { cn } from "@/lib/utils";
import {
  brl,
  categorias,
  evolucaoPatrimonio,
  pct,
  resumoCarteira,
  valorAtual,
} from "@/lib/portfolio";
import { urlAbsoluta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Resumo · Investidor em 15 Anos" },
      {
        name: "description",
        content: "Patrimônio, rentabilidade, dividendos e evolução da carteira em tempo real.",
      },
      { property: "og:title", content: "Resumo · Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Acompanhe patrimônio, rentabilidade e dividendos da sua carteira.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: urlAbsoluta("/dashboard") }],
  }),
  component: Dashboard,
});

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-popover-foreground)",
  fontSize: "13px",
};

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
      <SelectTrigger
        aria-label={rotuloAcessivel}
        className="h-9 w-full gap-2 text-xs sm:w-[9.5rem]"
      >
        <Icone className="hidden size-8 shrink-0 text-muted-foreground sm:block" />
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

const SECOES = [
  { id: "resumo", rotulo: "Resumo" },
  { id: "saude", rotulo: "Saúde" },
  { id: "analise", rotulo: "Análise" },
  { id: "evolucao", rotulo: "Evolução" },
  { id: "ativos", rotulo: "Ativos" },
] as const;

/** Pílulas de âncora com scrollspy para navegar pela página longa. */
function NavegacaoSecoes() {
  const [ativa, setAtiva] = useState<string>("resumo");

  useEffect(() => {
    const alvos = SECOES.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setAtiva(e.target.id);
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    alvos.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <nav
      aria-label="Seções desta página"
      className="scrollbar-none flex w-full max-w-full min-w-0 flex-wrap gap-1.5 sm:flex-nowrap sm:snap-x sm:overflow-x-auto"
    >
      {SECOES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() =>
            document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          aria-current={ativa === s.id ? "true" : undefined}
          className={cn(
            "alvo-toque-linha shrink-0 snap-start rounded-full px-2.5 py-1.5 text-[0.7rem] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3 sm:text-xs",

            ativa === s.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {s.rotulo}
        </button>
      ))}
    </nav>
  );
}

function Dashboard() {
  const { data: ativos = [] } = useAtivosAoVivo();
  const { data: aportes = [] } = useAportes();
  const { data: proventos = [] } = useDividendos();
  void proventos;

  const [periodo, setPeriodo] = useState("12");
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [inicioCustom, setInicioCustom] = useState("");
  const [fimCustom, setFimCustom] = useState("");
  const [tipoEvolucao, setTipoEvolucao] = useState("todos");
  const [tipoComposicao, setTipoComposicao] = useState("todos");

  const opcoesTipo = [
    { valor: "todos", rotulo: "Todos os tipos" },
    ...categorias.map((c) => ({ valor: c, rotulo: c })),
  ];

  const ativosEvolucao =
    tipoEvolucao === "todos" ? ativos : ativos.filter((a) => a.categoria === tipoEvolucao);
  const resumo = resumoCarteira(ativos);
  // mesma classificação usada na aba "Carteira" (CarteiraGrupos), para os dois painéis
  // exibirem sempre a mesma contagem de classes e o mesmo patrimônio.
  const categoriasComAtivos = [...new Set(ativos.map((a) => classeDoAtivo(a)))];
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
      mes: `${m.mes}/${m.chave.slice(2, 4)}`,
      aplicado: Math.round(aplicado),
      ganho: Math.round(resumoEvolucao.lucroTotal * (aplicado / aplicadoFinal)),
    };
  });

  const ativosComposicao =
    tipoComposicao === "todos" ? ativos : ativos.filter((a) => a.categoria === tipoComposicao);
  const totalComposicao = ativosComposicao.reduce((s, a) => s + valorAtual(a), 0);
  // "Renda Fixa" é a categoria principal; "Tesouro Direto" entra como sub-categoria dela.
  const SUBCATEGORIAS_RF = ["Tesouro Direto", "Tesouro"];
  const soma = (cats: string[]) =>
    ativosComposicao
      .filter((a) => cats.includes(a.categoria))
      .reduce((s, a) => s + valorAtual(a), 0);

  const porCategoria = categorias
    .filter((c) => !SUBCATEGORIAS_RF.includes(c))
    .map((c) => {
      if (c === "Renda Fixa") {
        return {
          name: "Renda Fixa - CDB, LCI, LCA (Tesouro SELIC, IPCA+, Prefixado)",
          cor: corCategoria("Renda Fixa"),
          value: soma(["Renda Fixa", ...SUBCATEGORIAS_RF]),
          subs: [
            {
              name: "Tesouro Direto",
              cor: corCategoria("Tesouro Direto"),
              value: soma(SUBCATEGORIAS_RF),
            },
          ].filter((s) => s.value > 0),
        };
      }
      return {
        name: c,
        cor: corCategoria(c),
        value: soma([c]),
        subs: [] as { name: string; cor: string; value: number }[],
      };
    })
    .filter((c) => c.value > 0);

  return (
    <AppShell title="Resumo" description="Visão geral do seu patrimônio">
      <StatusCotacoes />
      <AbasCarteira />
      <NavegacaoSecoes />
      <section id="resumo" className="scroll-mt-32 sm:scroll-mt-40">
        <ResumoKpis />
        <ResumoCategorias />
      </section>

      <section id="saude" className="scroll-mt-32 sm:scroll-mt-40">
        <SaudeCarteira carteira={ativos} />
      </section>

      <section id="analise" className="scroll-mt-32 sm:scroll-mt-40">
        <PainelAnaliseRisco carteira={ativos} aportes={aportes} />
      </section>

      <section id="evolucao" className="scroll-mt-32 text-[12px] sm:scroll-mt-40">
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="min-w-0">
            <Panel
              className="h-full"
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
                    <div className="flex w-full items-center gap-1 sm:w-auto">
                      <input
                        type="month"
                        aria-label="Mês inicial"
                        value={inicioCustom}
                        onChange={(e) => setInicioCustom(e.target.value)}
                        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">até</span>
                      <input
                        type="month"
                        aria-label="Mês final"
                        value={fimCustom}
                        onChange={(e) => setFimCustom(e.target.value)}
                        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
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
              {(() => {
                const ultimo = dadosEvolucao[dadosEvolucao.length - 1];
                const totalAplicado = ultimo?.aplicado ?? 0;
                const totalGanho = ultimo?.ganho ?? 0;
                const variacao = totalAplicado > 0 ? (totalGanho / totalAplicado) * 100 : 0;
                return (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDetalheAberto(true)}
                      title="Ver detalhamento mês a mês"
                      className="chip-legenda serie-aplicado flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-2 text-[length:var(--card-legenda)] font-medium text-foreground">
                        <span className="ponto-legenda serie-aplicado" aria-hidden />
                        Valor aplicado
                      </span>
                      <strong className="text-[length:var(--card-metrica)] font-semibold tabular-nums">
                        {brl(totalAplicado, 2)}
                      </strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetalheAberto(true)}
                      title="Ver detalhamento mês a mês"
                      className="chip-legenda serie-ganho flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-2 text-[length:var(--card-legenda)] font-medium text-foreground">
                        <span className="ponto-legenda serie-ganho" aria-hidden />
                        Ganho de Capital
                      </span>
                      <span className="flex flex-wrap items-baseline gap-2">
                        <strong className={`text-[length:var(--card-metrica)] font-semibold tabular-nums ${totalGanho >= 0 ? "text-positive" : "text-negative"}`}>
                          {brl(totalGanho, 2)}
                        </strong>
                        <span className={`text-[length:var(--card-legenda)] font-medium tabular-nums ${variacao >= 0 ? "text-positive" : "text-negative"}`}>
                          {variacao >= 0 ? "+" : ""}
                          {variacao.toFixed(2).replace(".", ",")}%
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })()}

              <DetalheEvolucaoMensal
                aberto={detalheAberto}
                onOpenChange={setDetalheAberto}
                dados={dadosEvolucao}
              />

              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosEvolucao}
                    margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
                    barGap={0}
                    barCategoryGap="35%"
                    maxBarSize={14}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)" }}
                      tickMargin={8}
                    />
                    <YAxis
                      tickFormatter={(v: number) => brl(v, 2)}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={78}
                      tickMargin={4}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)", opacity: 0.22 }}
                      wrapperStyle={{ outline: "none", zIndex: 30 }}
                      offset={16}
                      content={<TooltipEvolucao rotuloPeriodo="Mês" serie={dadosEvolucao} />}
                    />
                    <Bar
                      dataKey="aplicado"
                      stackId="p"
                      fill="var(--color-serie-investido)"
                      name="Valor aplicado"
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="ganho"
                      stackId="p"
                      fill="var(--color-serie-ganho)"
                      name="Ganho de Capital"
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="min-w-0">
            <Panel
              className="h-full"
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
                <div className="flex flex-col items-stretch gap-4">
                  <div className="relative h-56 w-full min-w-0" aria-hidden="true" inert>
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
                            <Cell key={i} fill={porCategoria[i].cor} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v, 2)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <p className="text-[0.85rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                          Total
                        </p>
                        <p className="num font-display text-base font-bold">
                          {brl(totalComposicao, 2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <ul className="w-full min-w-0 space-y-1.5 text-xs">
                    {porCategoria.map((c) => {
                      const cor = c.cor;
                      const percentual =
                        totalComposicao > 0 ? (c.value / totalComposicao) * 100 : 0;
                      return (
                        <li key={c.name} className="space-y-1.5">
                          <div
                            className="flex items-center gap-3 rounded-md border border-transparent bg-muted/40 px-2.5 py-2 transition-colors hover:border-border hover:bg-muted"
                            style={{ borderLeft: `3px solid ${cor}` }}
                          >
                            <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: cor }}
                              />
                              <span className="truncate whitespace-pre-line">{c.name}</span>
                            </span>
                            <span className="ml-auto flex shrink-0 items-baseline gap-2">
                              <span className="num text-[0.875rem] text-muted-foreground">
                                {brl(c.value, 2)}
                              </span>
                              <span
                                className="num w-12 text-right font-semibold"
                                style={{ color: cor }}
                              >
                                {pct(percentual)}
                              </span>
                            </span>
                          </div>
                          {c.subs.length > 0 && (
                            <ul className="ml-4 space-y-1.5 border-l border-border pl-3">
                              {c.subs.map((s) => {
                                const corSub = s.cor;
                                const pctSub =
                                  totalComposicao > 0 ? (s.value / totalComposicao) * 100 : 0;
                                return (
                                  <li
                                    key={s.name}
                                    className="flex items-center gap-3 rounded-md bg-muted/20 px-2.5 py-1.5"
                                  >
                                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                                      <span
                                        className="size-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: corSub }}
                                      />
                                      <span className="truncate">{s.name}</span>
                                    </span>
                                    <span className="ml-auto flex shrink-0 items-baseline gap-2">
                                      <span className="num text-[0.8rem] text-muted-foreground">
                                        {brl(s.value, 2)}
                                      </span>
                                      <span
                                        className="num w-12 text-right font-semibold"
                                        style={{ color: corSub }}
                                      >
                                        {pct(pctSub)}
                                      </span>
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Panel>
          </div>
        </div>
      </section>

      <section
        id="ativos"
        className="panel scroll-mt-32 overflow-hidden text-[12px] sm:scroll-mt-40"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="panel-title min-w-0 truncate">
            Meus ativos <span className="text-muted-foreground normal-case">({ativos.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            <p className="num shrink-0 text-right text-xs text-muted-foreground">
              <span className="hidden sm:inline">{categoriasComAtivos.length} classes · </span>
              {brl(resumo.totalAtual, 2)}
            </p>
            <BotaoExportarCarteira ativos={ativos} dividendos={proventos} />
          </div>
        </header>

        {ativos.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EstadoVazio
              icone={Wallet}
              titulo="Nenhum ativo cadastrado ainda"
              descricao="Adicione um lançamento (compra, venda ou provento) ou importe sua carteira da B3 para começar a acompanhar."
              acao={
                <>
                  <DialogTransacao>
                    <Button>
                      <Plus className="size-4" />
                      Adicionar lançamento
                    </Button>
                  </DialogTransacao>
                  <Button asChild variant="outline">
                    <Link to="/importar">Importar da B3</Link>
                  </Button>
                </>
              }
            />
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <CarteiraGrupos ativos={ativos} minimal />
          </div>
        )}
      </section>
    </AppShell>
  );
}
