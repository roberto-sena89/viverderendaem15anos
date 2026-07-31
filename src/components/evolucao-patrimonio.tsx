import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AreaChart as AreaChartIcon,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Download,
  History as HistoryIcon,
  LineChart as LineChartIcon,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,

  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { corClasse } from "@/lib/cores-ativos";
import { useAtivosAoVivo } from "@/lib/cotacoes-tempo-real";
import { useAportes } from "@/lib/data";
import {
  brl,
  classeDoAtivo,
  pct,
  resumoCarteira,
  valorAtual,
  type Aporte,
  type Ativo,
} from "@/lib/portfolio";

/** Classe de alocação a partir de uma categoria solta (aportes não trazem o ativo). */
const classeDaCategoria = (categoria: string) =>
  classeDoAtivo({ categoria } as Ativo);
import { cn } from "@/lib/utils";

const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const PERIODOS = [
  { id: "1m", rotulo: "1M", meses: 1 },
  { id: "3m", rotulo: "3M", meses: 3 },
  { id: "6m", rotulo: "6M", meses: 6 },
  { id: "1a", rotulo: "1A", meses: 12 },
  { id: "5a", rotulo: "5A", meses: 60 },
  { id: "max", rotulo: "Máx", meses: 0 },
  { id: "custom", rotulo: "Personalizado", meses: 0 },
] as const;

const valorAporte = (a: Aporte) => a.quantidade * a.preco + a.taxas;
/** Formata valores do eixo Y de forma compacta (R$ 1,2 mi / R$ 12 mil). */
const compacto = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (abs >= 1_000) return `R$ ${Math.round(v / 1_000)} mil`;
  return `R$ ${Math.round(v)}`;
};
const chaveMes = (d: string) => d.slice(0, 7);
const rotuloMes = (chave: string) => `${MESES_CURTO[Number(chave.slice(5, 7)) - 1]}/${chave.slice(2, 4)}`;
const rotuloMesLongo = (chave: string) =>
  `${MESES_LONGO[Number(chave.slice(5, 7)) - 1]}/${chave.slice(0, 4)}`;

function baixarCsv(nome: string, linhas: (string | number)[][]) {
  const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

interface Ponto {
  chave: string;
  rotulo: string;
  aportado: number;
  aportadoAcum: number;
  patrimonio: number;
  rendimento: number;
  rendimentoPct: number;
}

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-popover-foreground)",
  fontSize: "12px",
};

function Kpi({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 transition-colors hover:bg-muted/40">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="mt-1 truncate font-display text-base font-bold text-foreground">{valor}</p>
      {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
      <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    </div>
  );
}

/** Painel analítico da evolução patrimonial: resumo, gráfico, comparativos e distribuição. */
export function EvolucaoPatrimonio() {
  const { data: ativos = [], isLoading: carregandoAtivos } = useAtivosAoVivo();
  const { data: aportes = [], isLoading: carregandoAportes } = useAportes();

  const [periodo, setPeriodo] = useState<string>("1a");
  const [inicioCustom, setInicioCustom] = useState("");
  const [fimCustom, setFimCustom] = useState("");
  const [granularidade, setGranularidade] = useState<"mensal" | "anual">("mensal");
  const [busca, setBusca] = useState("");
  const [comparar, setComparar] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

  const resumo = useMemo(() => resumoCarteira(ativos), [ativos]);

  /** Série mensal completa desde o primeiro aporte. */
  const serie = useMemo<Ponto[]>(() => {
    if (aportes.length === 0) return [];
    const ordenados = [...aportes].sort((a, b) => a.data.localeCompare(b.data));
    const inicio = chaveMes(ordenados[0].data);
    const hoje = new Date();
    const chaves: string[] = [];
    const d = new Date(Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7)) - 1, 1);
    while (d.getFullYear() < hoje.getFullYear() || (d.getFullYear() === hoje.getFullYear() && d.getMonth() <= hoje.getMonth())) {
      chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setMonth(d.getMonth() + 1);
    }
    const porMes = new Map<string, number>();
    for (const a of ordenados) porMes.set(chaveMes(a.data), (porMes.get(chaveMes(a.data)) ?? 0) + valorAporte(a));

    const totalInvestido = resumo.totalInvestido || ordenados.reduce((s, a) => s + valorAporte(a), 0);
    const fatorFinal = totalInvestido > 0 ? (resumo.totalAtual || totalInvestido) / totalInvestido : 1;

    let acum = 0;
    return chaves.map((chave, i) => {
      const aportado = porMes.get(chave) ?? 0;
      acum += aportado;
      const t = chaves.length > 1 ? i / (chaves.length - 1) : 1;
      const fator = 1 + (fatorFinal - 1) * t;
      const patrimonio = acum * fator;
      return {
        chave,
        rotulo: rotuloMes(chave),
        aportado,
        aportadoAcum: acum,
        patrimonio,
        rendimento: patrimonio - acum,
        rendimentoPct: acum > 0 ? ((patrimonio - acum) / acum) * 100 : 0,
      };
    });
  }, [aportes, resumo]);

  /** Série recortada pelo período selecionado. */
  const recorte = useMemo(() => {
    if (serie.length === 0) return [];
    if (periodo === "custom" && (inicioCustom || fimCustom)) {
      return serie.filter((p) => (!inicioCustom || p.chave >= inicioCustom) && (!fimCustom || p.chave <= fimCustom));
    }
    const meses = PERIODOS.find((p) => p.id === periodo)?.meses ?? 0;
    if (!meses) return serie;
    return serie.slice(Math.max(0, serie.length - meses));
  }, [serie, periodo, inicioCustom, fimCustom]);

  /** Agregado por ano quando a granularidade é anual. */
  const linhas = useMemo(() => {
    if (granularidade === "mensal") {
      return recorte.map((p) => ({ ...p, id: p.chave, titulo: rotuloMesLongo(p.chave) }));
    }
    const porAno = new Map<string, Ponto & { titulo: string; id: string }>();
    for (const p of recorte) {
      const ano = p.chave.slice(0, 4);
      const atual = porAno.get(ano);
      porAno.set(ano, {
        ...p,
        id: ano,
        titulo: ano,
        rotulo: ano,
        aportado: (atual?.aportado ?? 0) + p.aportado,
      });
    }
    return [...porAno.values()];
  }, [recorte, granularidade]);

  const linhasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter((l) => l.titulo.toLowerCase().includes(q) || l.id.includes(q));
  }, [linhas, busca]);

  /** Dados do gráfico, com série de comparação opcional (período anterior sobreposto). */
  const dadosGrafico = useMemo(() => {
    const base = linhas;
    if (!comparar || base.length === 0) return base.map((l) => ({ ...l, anterior: null as number | null }));
    const idxInicio = serie.findIndex((p) => p.chave === recorte[0]?.chave);
    const anterior = serie.slice(Math.max(0, idxInicio - base.length), Math.max(0, idxInicio));
    return base.map((l, i) => ({ ...l, anterior: anterior[i]?.patrimonio ?? null }));
  }, [linhas, comparar, serie, recorte]);

  const primeiro = recorte[0];
  const ultimo = recorte[recorte.length - 1];
  const variacao = primeiro && ultimo ? ultimo.patrimonio - primeiro.patrimonio : 0;
  const variacaoPct = primeiro && primeiro.patrimonio > 0 ? (variacao / primeiro.patrimonio) * 100 : 0;
  const positivo = variacao >= 0;

  /** Distribuição atual por classe (mesma paleta da aba Rebalanceamento). */
  const distribuicao = useMemo(() => {
    const atualPorCat = new Map<string, number>();
    for (const a of ativos) {
      const classe = classeDoAtivo(a);
      atualPorCat.set(classe, (atualPorCat.get(classe) ?? 0) + valorAtual(a));
    }
    const totalAtual = [...atualPorCat.values()].reduce((s, v) => s + v, 0);

    const corte = primeiro?.chave ?? "0000-00";
    const antesPorCat = new Map<string, number>();
    for (const a of aportes) {
      if (chaveMes(a.data) < corte) {
        const classe = classeDaCategoria(a.categoria);
        antesPorCat.set(classe, (antesPorCat.get(classe) ?? 0) + valorAporte(a));
      }
    }
    const totalAntes = [...antesPorCat.values()].reduce((s, v) => s + v, 0);

    return [...atualPorCat.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        parte: totalAtual > 0 ? (valor / totalAtual) * 100 : 0,
        antes: totalAntes > 0 ? ((antesPorCat.get(categoria) ?? 0) / totalAntes) * 100 : 0,
        cor: corClasse(categoria),

      }));
  }, [ativos, aportes, primeiro]);

  /** Indicadores complementares do período. */
  const indicadores = useMemo(() => {
    const comAporte = recorte.filter((p) => p.aportado > 0);
    const maior = comAporte.reduce<Ponto | null>((m, p) => (!m || p.aportado > m.aportado ? p : m), null);
    const menor = comAporte.reduce<Ponto | null>((m, p) => (!m || p.aportado < m.aportado ? p : m), null);
    const media = comAporte.length ? comAporte.reduce((s, p) => s + p.aportado, 0) / comAporte.length : 0;

    const variacoes = recorte.map((p, i, arr) =>
      i === 0 || arr[i - 1].patrimonio <= 0 ? 0 : ((p.patrimonio - arr[i - 1].patrimonio) / arr[i - 1].patrimonio) * 100,
    );
    const melhorIdx = variacoes.indexOf(Math.max(...(variacoes.length ? variacoes : [0])));
    const piorIdx = variacoes.indexOf(Math.min(...(variacoes.length ? variacoes : [0])));

    const totalMeses = serie.length;
    const anos = Math.floor(totalMeses / 12);
    const meses = totalMeses % 12;
    const tempo = [anos ? `${anos} ${anos === 1 ? "ano" : "anos"}` : "", meses ? `${meses} ${meses === 1 ? "mês" : "meses"}` : ""]
      .filter(Boolean)
      .join(" e ") || "—";

    return { maior, menor, media, melhor: recorte[melhorIdx], melhorPct: variacoes[melhorIdx] ?? 0, pior: recorte[piorIdx], piorPct: variacoes[piorIdx] ?? 0, tempo };
  }, [recorte, serie]);

  const exportar = () => {
    baixarCsv(`evolucao-patrimonio-${granularidade}.csv`, [
      ["Período", "Patrimônio final", "Aportado no período", "Rentabilidade (R$)", "Rentabilidade (%)"],
      ...linhasFiltradas.map((l) => [l.titulo, l.patrimonio.toFixed(2), l.aportado.toFixed(2), l.rendimento.toFixed(2), l.rendimentoPct.toFixed(2)]),
    ]);
  };

  if (carregandoAtivos || carregandoAportes) return <Skeleton />;

  if (serie.length === 0) {
    return (
      <Panel title="Evolução de Patrimônio">
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <TrendingUp className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-display text-sm font-semibold">Ainda não há histórico suficiente</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Continue registrando seus aportes para visualizar sua evolução patrimonial mês a mês.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <section className="space-y-4" aria-label="Evolução de Patrimônio">
      {/* 1. Cabeçalho de resumo */}
      <Panel
        title="Evolução de Patrimônio"
        action={
          <Button variant="outline" size="sm" className="gap-2" onClick={exportar}>
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Patrimônio total atual
            </p>
            <p className="font-display text-3xl font-black tracking-tight sm:text-4xl">{brl(resumo.totalAtual, 2)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Investido: {brl(resumo.totalInvestido, 2)} · Rendimento: {brl(resumo.lucroTotal, 2)} (
              {pct(resumo.rentabilidade)})
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Variação no período
              </p>
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 font-display text-lg font-bold",
                  positivo ? "text-success" : "text-destructive",
                )}
              >
                {positivo ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                {brl(Math.abs(variacao), 2)}
              </p>
              <p className={cn("text-xs font-semibold", positivo ? "text-success" : "text-destructive")}>
                {positivo ? "+" : "−"}
                {pct(Math.abs(variacaoPct))}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Rentabilidade acumulada
              </p>
              <p
                className={cn(
                  "mt-1 font-display text-lg font-bold",
                  resumo.rentabilidade >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {resumo.rentabilidade >= 0 ? "+" : ""}
                {pct(resumo.rentabilidade)}
              </p>
              <p className="text-xs text-muted-foreground">desde o início</p>
            </div>
          </div>
        </div>
      </Panel>

      {/* 2. Seletor de período */}
      <div className="sticky top-0 z-20 -mx-1 rounded-xl border border-border bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodo(p.id)}
                aria-pressed={periodo === p.id}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  periodo === p.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar período"
                aria-label="Buscar período"
                className="h-9 pl-8 text-xs"
              />
            </div>
            <div className="flex rounded-full border border-border p-0.5" role="group" aria-label="Granularidade">
              {(["mensal", "anual"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularidade(g)}
                  aria-pressed={granularidade === g}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
                    granularidade === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <Button
              variant={comparar ? "default" : "outline"}
              size="sm"
              className="h-9 text-xs"
              onClick={() => setComparar((v) => !v)}
              aria-pressed={comparar}
            >
              Comparar
            </Button>
          </div>
        </div>
        {periodo === "custom" ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-sm">
            <Input
              type="month"
              value={inicioCustom}
              onChange={(e) => setInicioCustom(e.target.value)}
              aria-label="Início do período"
              className="h-9 text-xs"
            />
            <Input
              type="month"
              value={fimCustom}
              onChange={(e) => setFimCustom(e.target.value)}
              aria-label="Fim do período"
              className="h-9 text-xs"
            />
          </div>
        ) : null}
      </div>

      {/* 3. Gráfico principal */}
      <Panel
        title="Patrimônio x total aportado"
        hint="Barras claras: patrimônio total. Barras escuras: dinheiro investido acumulado."
      >
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[0.7rem] font-medium text-foreground">
            <span className="inline-block size-2.5 rounded-[2px] bg-primary" aria-hidden />
            Patrimônio
          </span>
          <span className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground">
            <span className="inline-block size-2.5 rounded-[2px] bg-chart-12" aria-hidden />
            Total investido
          </span>
          {comparar ? (
            <span className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground">
              <HistoryIcon className="size-3.5" aria-hidden />
              Período anterior
            </span>
          ) : null}
        </div>

        <div className="-mx-1 h-[280px] sm:-mx-2 sm:h-[360px] xl:h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dadosGrafico} margin={{ top: 18, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="rotulo"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
                minTickGap={8}
                interval="preserveStartEnd"
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickMargin={4}
                tickFormatter={compacto}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.35 }}
                contentStyle={tooltipStyle}
                formatter={(v: number, nome: string) => [brl(Number(v), 2), nome]}
                labelFormatter={(l: string) => `Período: ${l}`}
              />
              <Bar
                dataKey="patrimonio"
                name="Patrimônio"
                fill="var(--color-primary)"
                radius={[3, 3, 0, 0]}
                maxBarSize={38}
              >
                <LabelList
                  dataKey="patrimonio"
                  position="top"
                  formatter={(v: number) => compacto(Number(v))}
                  style={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
              </Bar>
              <Bar
                dataKey="aportadoAcum"
                name="Total investido"
                fill="var(--color-chart-12)"
                radius={[3, 3, 0, 0]}
                maxBarSize={38}
              >
                <LabelList
                  dataKey="aportadoAcum"
                  position="top"
                  formatter={(v: number) => compacto(Number(v))}
                  style={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
              </Bar>
              {comparar ? (
                <Line
                  type="monotone"
                  dataKey="anterior"
                  name="Período anterior"
                  stroke="var(--color-muted-foreground)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>


      {/* 4. Comparativo período a período */}
      <Panel title={granularidade === "mensal" ? "Comparativo mês a mês" : "Comparativo ano a ano"}>
        {linhasFiltradas.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhum período encontrado para a busca.</p>
        ) : (
          <>
            {/* Desktop / tablet */}
            <div className="-mx-4 hidden overflow-x-auto px-4 md:block sm:-mx-5 sm:px-5">
              <table className="w-full min-w-[46rem] table-auto text-sm">

                <thead>
                  <tr className="text-left text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 font-semibold">Período</th>
                    <th className="py-2 text-right font-semibold">Patrimônio final</th>
                    <th className="py-2 text-right font-semibold">Aportado</th>
                    <th className="py-2 text-right font-semibold">Rentab. (R$)</th>
                    <th className="py-2 text-right font-semibold">Rentab. (%)</th>
                    <th className="py-2 text-right font-semibold">vs. anterior</th>
                  </tr>
                </thead>
                <tbody>
                  {[...linhasFiltradas].reverse().map((l, i, arr) => {
                    const ant = arr[i + 1];
                    const varPct = ant && ant.patrimonio > 0 ? ((l.patrimonio - ant.patrimonio) / ant.patrimonio) * 100 : 0;
                    const pos = varPct >= 0;
                    return (
                      <tr key={l.id} className="border-t border-border/60 transition-colors hover:bg-muted/40">
                        <td className="py-2">
                          <Link
                            to="/historico-aportes"
                            className="flex min-w-0 items-center gap-2 font-medium text-foreground hover:text-primary"
                          >
                            <span
                              className={cn("h-6 w-1 shrink-0 rounded-full", pos ? "bg-success" : "bg-destructive")}
                              aria-hidden
                            />
                            <span className="truncate">{l.titulo}</span>
                            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                          </Link>
                        </td>
                        <td className="py-2 text-right tabular-nums">{brl(l.patrimonio, 2)}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{brl(l.aportado, 2)}</td>
                        <td
                          className={cn(
                            "py-2 text-right tabular-nums",
                            l.rendimento >= 0 ? "text-success" : "text-destructive",
                          )}
                        >
                          {brl(l.rendimento, 2)}
                        </td>
                        <td
                          className={cn(
                            "py-2 text-right tabular-nums",
                            l.rendimentoPct >= 0 ? "text-success" : "text-destructive",
                          )}
                        >
                          {l.rendimentoPct >= 0 ? "+" : ""}
                          {pct(l.rendimentoPct)}
                        </td>
                        <td
                          className={cn("py-2 text-right tabular-nums", pos ? "text-success" : "text-destructive")}
                        >
                          {pos ? "▲" : "▼"} {pct(Math.abs(varPct))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: lista de cards */}
            <ul className="space-y-2 md:hidden">
              {[...linhasFiltradas].reverse().map((l, i, arr) => {
                const ant = arr[i + 1];
                const varPct = ant && ant.patrimonio > 0 ? ((l.patrimonio - ant.patrimonio) / ant.patrimonio) * 100 : 0;
                const pos = varPct >= 0;
                return (
                  <li key={l.id}>
                    <Link
                      to="/historico-aportes"
                      className="block rounded-xl border border-border bg-card/60 p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn("size-2 shrink-0 rounded-full", pos ? "bg-success" : "bg-destructive")}
                            aria-hidden
                          />
                          <span className="truncate font-display text-sm font-semibold">{l.titulo}</span>
                        </span>
                        <span className={cn("text-xs font-semibold", pos ? "text-success" : "text-destructive")}>
                          {pos ? "▲" : "▼"} {pct(Math.abs(varPct))}
                        </span>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Patrimônio</dt>
                          <dd className="tabular-nums">{brl(l.patrimonio, 2)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Aportado</dt>
                          <dd className="tabular-nums">{brl(l.aportado, 2)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Rentab. (R$)</dt>
                          <dd className={cn("tabular-nums", l.rendimento >= 0 ? "text-success" : "text-destructive")}>
                            {brl(l.rendimento, 2)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Rentab. (%)</dt>
                          <dd className={cn("tabular-nums", l.rendimentoPct >= 0 ? "text-success" : "text-destructive")}>
                            {l.rendimentoPct >= 0 ? "+" : ""}
                            {pct(l.rendimentoPct)}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      {/* 5. Distribuição por categoria */}
      <Panel title="Distribuição atual do patrimônio" hint="Comparado com a composição no início do período.">
        {distribuicao.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhum ativo na carteira.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicao}
                    dataKey="valor"
                    nameKey="categoria"
                    innerRadius="60%"
                    outerRadius="90%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {distribuicao.map((d) => (
                      <Cell
                        key={d.categoria}
                        fill={d.cor}
                        opacity={categoriaFiltro && categoriaFiltro !== d.categoria ? 0.3 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(Number(v), 2)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {distribuicao.map((d) => (
                <li key={d.categoria}>
                  <button
                    type="button"
                    onClick={() => setCategoriaFiltro((c) => (c === d.categoria ? null : d.categoria))}
                    aria-pressed={categoriaFiltro === d.categoria}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
                      categoriaFiltro === d.categoria ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.cor }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium">{d.categoria}</span>
                    <span className="shrink-0 tabular-nums font-semibold">{pct(d.parte)}</span>
                    <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                      {pct(d.antes)} → {pct(d.parte)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {/* 6. Indicadores complementares */}
      <Panel title="Indicadores do período">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            rotulo="Maior aporte"
            valor={indicadores.maior ? brl(indicadores.maior.aportado, 2) : "—"}
            sub={indicadores.maior ? rotuloMesLongo(indicadores.maior.chave) : undefined}
          />
          <Kpi
            rotulo="Menor aporte"
            valor={indicadores.menor ? brl(indicadores.menor.aportado, 2) : "—"}
            sub={indicadores.menor ? rotuloMesLongo(indicadores.menor.chave) : undefined}
          />
          <Kpi rotulo="Média mensal" valor={brl(indicadores.media, 2)} sub="meses com aporte" />
          <Kpi
            rotulo="Melhor mês"
            valor={`+${pct(Math.abs(indicadores.melhorPct))}`}
            sub={indicadores.melhor ? rotuloMesLongo(indicadores.melhor.chave) : undefined}
          />
          <Kpi
            rotulo="Pior mês"
            valor={pct(indicadores.piorPct)}
            sub={indicadores.pior ? rotuloMesLongo(indicadores.pior.chave) : undefined}
          />
          <Kpi rotulo="Tempo investindo" valor={indicadores.tempo} sub="desde o primeiro aporte" />
          <Kpi rotulo="Total aportado" valor={brl(resumo.totalInvestido, 2)} sub="soma dos aportes" />
          <Kpi
            rotulo="Períodos exibidos"
            valor={String(linhasFiltradas.length)}
            sub={granularidade === "mensal" ? "meses" : "anos"}
          />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          Valores históricos estimados a partir dos aportes registrados e da valorização atual da carteira.
        </p>
      </Panel>
    </section>
  );
}
