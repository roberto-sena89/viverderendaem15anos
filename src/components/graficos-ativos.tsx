import { useState, type FormEvent } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, RefreshCw, Search, TrendingDown, TrendingUp } from "lucide-react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cotacaoAtivo, historicoAtivo } from "@/lib/market.functions";

const PERIODOS = [
  { valor: "1y", rotulo: "1A" },
  { valor: "5y", rotulo: "5A" },
  { valor: "10y", rotulo: "10A" },
] as const;

type Periodo = (typeof PERIODOS)[number]["valor"];

const PADROES = ["^BVSP", "BOVA11.SA", "IVVB11.SA", "PETR4.SA", "VALE3.SA", "MXRF11.SA"];

const APELIDOS: Record<string, string> = {
  "^BVSP": "IBOV",
};

function moedaFmt(valor: number | null | undefined, moeda = "BRL") {
  if (valor === null || valor === undefined) return "—";
  const prefixo = moeda === "BRL" ? "R$ " : `${moeda} `;
  return `${prefixo}${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pctFmt(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(2).replace(".", ",")}%`;
}

function rotulo(simbolo: string) {
  return APELIDOS[simbolo] ?? simbolo.replace(".SA", "");
}

function Indicador({ label, valor, tom }: { label: string; valor: string; tom?: "alta" | "baixa" }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[0.78rem] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={`num text-sm font-semibold ${
          tom === "alta" ? "text-success" : tom === "baixa" ? "text-destructive" : ""
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

/** Gráfico profissional por ativo, com seleção de ativo, período e atualização automática. */
export function GraficosAtivos() {
  const cotacaoFn = useServerFn(cotacaoAtivo);
  const historicoFn = useServerFn(historicoAtivo);
  const [simbolos, setSimbolos] = useState<string[]>(PADROES);
  const [ativo, setAtivo] = useState(PADROES[0]);
  const [periodo, setPeriodo] = useState<Periodo>("5y");
  const [texto, setTexto] = useState("");

  const cotacao = useQuery({
    queryKey: ["grafico-cotacao", ativo],
    queryFn: () => cotacaoFn({ data: { simbolo: ativo } }),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const historico = useQuery({
    queryKey: ["grafico-historico", ativo, periodo],
    queryFn: () => historicoFn({ data: { simbolo: ativo, periodo } }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const c = cotacao.data;
  const h = historico.data;
  const moeda = c?.moeda ?? h?.moeda ?? "BRL";
  const positivo = (c?.variacaoDiaPercent ?? 0) >= 0;
  const Icone = positivo ? TrendingUp : TrendingDown;

  const serie = (h?.serie ?? []).map((p) => ({
    data: p.data.slice(0, 7),
    fechamento: p.fechamento,
  }));

  function adicionar(e: FormEvent) {
    e.preventDefault();
    const termo = texto.trim().toUpperCase();
    if (!termo) return;
    const simbolo = /^[A-Z]{4}\d{1,2}$/.test(termo) ? `${termo}.SA` : termo;
    setSimbolos((atuais) => (atuais.includes(simbolo) ? atuais : [...atuais, simbolo]));
    setAtivo(simbolo);
    setTexto("");
  }

  return (
    <Panel
      title="Gráficos por ativo"
      hint="Preço atualizado automaticamente a cada 30 segundos"
      action={
        cotacao.isFetching ? (
          <RefreshCw className="size-4 animate-spin text-muted-foreground" />
        ) : null
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {simbolos.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setAtivo(s)}
            aria-pressed={ativo === s}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              ativo === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {rotulo(s)}
          </button>
        ))}
        <form onSubmit={adicionar} className="ml-auto flex gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Adicionar ativo"
            aria-label="Adicionar ativo ao gráfico"
            className="h-8 w-40 text-xs"
          />
          <Button type="submit" size="sm" className="h-8 shrink-0" aria-label="Adicionar ativo">
            <Search className="size-3.5" />
          </Button>
        </form>
      </div>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{c?.nome ?? rotulo(ativo)}</p>
            <p className="num text-2xl font-bold">
              {cotacao.isLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                moedaFmt(c?.preco, moeda)
              )}
            </p>
          </div>
          <p
            className={`flex items-center gap-1 pb-1.5 text-sm font-semibold ${
              positivo ? "text-success" : "text-destructive"
            }`}
          >
            <Icone className="size-4" />
            {pctFmt(c?.variacaoDiaPercent)}
            <span className="text-muted-foreground">({moedaFmt(c?.variacaoDia, moeda)})</span>
          </p>
        </div>
        <div className="flex gap-1">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              onClick={() => setPeriodo(p.valor)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                periodo === p.valor
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {historico.isLoading ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">
            Carregando histórico…
          </p>
        ) : historico.isError || serie.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">
            Histórico indisponível para {rotulo(ativo)}.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="grad-ativo-mercado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="data"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                minTickGap={28}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                tickFormatter={(v: number) => moedaFmt(v, moeda)}
                tickLine={false}
                axisLine={false}
                width={86}
                fontSize={11}
                stroke="var(--color-muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  color: "var(--color-popover-foreground)",
                  fontSize: "12px",
                }}
                formatter={(v: number) => moedaFmt(v, moeda)}
              />
              <Area
                type="monotone"
                dataKey="fechamento"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                fill="url(#grad-ativo-mercado)"
                name="Fechamento"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Indicador
          label="Retorno no período"
          valor={pctFmt(h?.resumo.retornoTotalPercent)}
          tom={(h?.resumo.retornoTotalPercent ?? 0) >= 0 ? "alta" : "baixa"}
        />
        <Indicador
          label="Retorno ao ano"
          valor={pctFmt(h?.resumo.retornoAnualizadoPercent)}
          tom={(h?.resumo.retornoAnualizadoPercent ?? 0) >= 0 ? "alta" : "baixa"}
        />
        <Indicador label="Volatilidade" valor={pctFmt(h?.resumo.volatilidadeAnualPercent)} />
        <Indicador label="Queda máxima" valor={pctFmt(h?.resumo.drawdownMaximoPercent)} tom="baixa" />
        <Indicador label="Máx. 52 semanas" valor={moedaFmt(c?.maxima52s, moeda)} />
        <Indicador label="Mín. 52 semanas" valor={moedaFmt(c?.minima52s, moeda)} />
        <Indicador label="Máx. do período" valor={moedaFmt(h?.resumo.maximo, moeda)} />
        <Indicador label="Mín. do período" valor={moedaFmt(h?.resumo.minimo, moeda)} />
      </div>
    </Panel>
  );
}
