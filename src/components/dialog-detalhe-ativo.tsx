import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cotacaoAtivo, historicoAtivo } from "@/lib/market.functions";

const PERIODOS = [
  { valor: "1y", rotulo: "1 ano" },
  { valor: "5y", rotulo: "5 anos" },
  { valor: "10y", rotulo: "10 anos" },
] as const;

type Periodo = (typeof PERIODOS)[number]["valor"];

function moedaFmt(valor: number | null | undefined, moeda = "BRL") {
  if (valor === null || valor === undefined) return "—";
  const prefixo = moeda === "BRL" ? "R$ " : `${moeda} `;
  return `${prefixo}${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pctFmt(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(2).replace(".", ",")}%`;
}

function Indicador({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: string;
  tom?: "alta" | "baixa";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[0.78rem] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
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

/** Modal com preço, variação, histórico e indicadores de um ativo. */
export function DialogDetalheAtivo({
  simbolo,
  rotulo,
  aberto,
  onOpenChange,
}: {
  simbolo: string;
  rotulo?: string;
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const cotacaoFn = useServerFn(cotacaoAtivo);
  const historicoFn = useServerFn(historicoAtivo);
  const [periodo, setPeriodo] = useState<Periodo>("5y");

  const cotacao = useQuery({
    queryKey: ["cotacao-detalhe", simbolo],
    queryFn: () => cotacaoFn({ data: { simbolo } }),
    enabled: aberto && !!simbolo,
    // Sincroniza sozinho enquanto a janela estiver aberta (inclui ativos
    // internacionais, que negociam fora do pregão da B3).
    staleTime: 10 * 1000,
    refetchInterval: aberto ? 20_000 : false,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const historico = useQuery({
    queryKey: ["historico-detalhe", simbolo, periodo],
    queryFn: () => historicoFn({ data: { simbolo, periodo } }),
    enabled: aberto && !!simbolo,
    staleTime: 10 * 60 * 1000,
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

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{rotulo ?? c?.simbolo ?? simbolo}</DialogTitle>
          <DialogDescription>{c?.nome ?? h?.nome ?? "Detalhes do ativo"}</DialogDescription>
        </DialogHeader>

        {cotacao.isLoading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando cotação…
          </p>
        ) : cotacao.isError ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Não foi possível carregar a cotação deste ativo agora.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <p className="num text-3xl font-bold">{moedaFmt(c?.preco, moeda)}</p>
            <p
              className={`flex items-center gap-1 pb-1 text-sm font-semibold ${
                positivo ? "text-success" : "text-destructive"
              }`}
            >
              <Icone className="size-4" />
              {pctFmt(c?.variacaoDiaPercent)}
              <span className="text-muted-foreground">({moedaFmt(c?.variacaoDia, moeda)})</span>
            </p>
          </div>
        )}

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

        <div className="h-52">
          {historico.isLoading ? (
            <p className="grid h-full place-items-center text-sm text-muted-foreground">
              Carregando histórico…
            </p>
          ) : historico.isError || serie.length === 0 ? (
            <p className="grid h-full place-items-center text-sm text-muted-foreground">
              Histórico indisponível para este ativo.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ left: 4, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="grad-detalhe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="data"
                  tickLine={false}
                  axisLine={false}
                  fontSize={13}
                  minTickGap={28}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tickFormatter={(v: number) => moedaFmt(v, moeda)}
                  tickLine={false}
                  axisLine={false}
                  width={86}
                  fontSize={13}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    color: "var(--color-popover-foreground)",
                    fontSize: "13px",
                  }}
                  formatter={(v: number) => moedaFmt(v, moeda)}
                />
                <Area
                  type="monotone"
                  dataKey="fechamento"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#grad-detalhe)"
                  name="Fechamento"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Indicador
            rotulo="Retorno no período"
            valor={pctFmt(h?.resumo.retornoTotalPercent)}
            tom={(h?.resumo.retornoTotalPercent ?? 0) >= 0 ? "alta" : "baixa"}
          />
          <Indicador
            rotulo="Retorno ao ano"
            valor={pctFmt(h?.resumo.retornoAnualizadoPercent)}
            tom={(h?.resumo.retornoAnualizadoPercent ?? 0) >= 0 ? "alta" : "baixa"}
          />
          <Indicador rotulo="Volatilidade" valor={pctFmt(h?.resumo.volatilidadeAnualPercent)} />
          <Indicador
            rotulo="Queda máxima"
            valor={pctFmt(h?.resumo.drawdownMaximoPercent)}
            tom="baixa"
          />
          <Indicador rotulo="Máx. 52 semanas" valor={moedaFmt(c?.maxima52s, moeda)} />
          <Indicador rotulo="Mín. 52 semanas" valor={moedaFmt(c?.minima52s, moeda)} />
          <Indicador rotulo="Máx. do período" valor={moedaFmt(h?.resumo.maximo, moeda)} />
          <Indicador rotulo="Mín. do período" valor={moedaFmt(h?.resumo.minimo, moeda)} />
        </div>

        {c?.bolsa ? (
          <p className="text-[0.82rem] text-muted-foreground">
            Fonte de mercado · {c.bolsa}
            {c.atualizadoEm
              ? ` · atualizado em ${new Date(c.atualizadoEm).toLocaleString("pt-BR")}`
              : ""}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
