import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Panel, TickerMark } from "@/components/panel";
import { estadoPregao } from "@/lib/cotacoes-tempo-real";
import { panoramaMercado } from "@/lib/market.functions";
import type { ItemVariacao, PeriodoPanorama } from "@/lib/market.server";


const PERIODOS: PeriodoPanorama[] = ["1D", "7D", "30D", "6M", "1A", "5A"];

const num = (v: number, casas = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const pctSinal = (v: number) => `${v > 0 ? "+" : ""}${num(v)}%`;

function ListaVariacao({
  titulo,
  itens,
  tipo,
  carregando,
}: {
  titulo: string;
  itens: ItemVariacao[];
  tipo: "alta" | "baixa";
  carregando: boolean;
}) {
  const cor = tipo === "alta" ? "text-primary" : "text-destructive";
  const Icone = tipo === "alta" ? TrendingUp : TrendingDown;

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-display text-base font-semibold">{titulo}</h3>
        <Icone className={`size-4 shrink-0 ${cor}`} />
      </div>

      {carregando && itens.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no momento.</p>
      ) : (
        <ul className="space-y-1">
          {itens.map((item) => (
            <li key={item.ticker}>
              <Link
                to="/cotacoes"
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {item.logo ? (
                    <img
                      src={item.logo}
                      alt={`Logo ${item.ticker}`}
                      loading="lazy"
                      className="size-6 shrink-0 rounded-md bg-muted object-contain"
                    />
                  ) : (
                    <TickerMark ticker={item.ticker} />
                  )}
                  <span className="truncate text-sm font-semibold">{item.ticker}</span>
                </span>
                <span className={`num text-sm font-semibold tabular-nums ${cor}`}>
                  {pctSinal(item.variacaoPercent)}
                </span>
                <span className="num w-20 text-right text-sm tabular-nums text-muted-foreground">
                  {item.preco === null ? "—" : `R$ ${num(item.preco)}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PainelPanoramaMercado() {
  const [periodo, setPeriodo] = useState<PeriodoPanorama>("1D");
  const buscar = useServerFn(panoramaMercado);

  // Reavalia o pregão a cada minuto para trocar a cadência sem recarregar.
  const [pregao, setPregao] = useState(() => estadoPregao());
  useEffect(() => {
    const id = setInterval(() => setPregao(estadoPregao()), 60_000);
    return () => clearInterval(id);
  }, []);

  const intervalo = pregao.aberto ? 30_000 : 5 * 60_000;

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["panorama-mercado", periodo],
    queryFn: () => buscar({ data: { periodo } }),
    staleTime: pregao.aberto ? 15_000 : 5 * 60_000,
    refetchInterval: intervalo,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const indice = data?.indice;
  const variacao = indice?.variacaoPercent ?? null;
  const positivo = (variacao ?? 0) >= 0;

  // Flash verde/vermelho quando os pontos do índice mudam.
  const anterior = useRef<number | null>(null);
  const [flash, setFlash] = useState<"alta" | "baixa" | null>(null);
  const pontos = indice?.pontos ?? null;
  useEffect(() => {
    if (pontos === null) return;
    const antes = anterior.current;
    anterior.current = pontos;
    if (antes === null || antes === pontos) return;
    setFlash(pontos > antes ? "alta" : "baixa");
    const id = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(id);
  }, [pontos]);

  const hora = data?.atualizadoEm
    ? new Date(data.atualizadoEm).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <Panel>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold">Ibovespa</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                pregao.aberto ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${pregao.aberto ? "animate-pulse bg-primary" : "bg-muted-foreground"}`}
                aria-hidden="true"
              />
              {pregao.aberto ? "Ao vivo • pregão aberto" : `Fechado • abre ${pregao.proximaAbertura}`}
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label="Atualizar panorama de mercado agora"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Atualizar
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p
              className={`num rounded-md text-2xl font-bold tabular-nums ${flash ? `flash-${flash}` : ""}`}
              aria-live="polite"
            >
              {indice?.pontos === null || indice?.pontos === undefined ? "—" : `${num(indice.pontos)} pontos`}
            </p>
            {variacao !== null ? (
              <span
                className={`num rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  positivo ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                }`}
              >
                {pctSinal(variacao)}
              </span>
            ) : null}
          </div>


          <p className="mt-1 text-xs text-muted-foreground">
            Fechamento anterior: {indice?.fechamentoAnterior ? num(indice.fechamentoAnterior) : "—"} • Abertura:{" "}
            {indice?.abertura ? num(indice.abertura) : "—"}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {PERIODOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                aria-pressed={periodo === p}
                className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors ${
                  periodo === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-4 h-48">
            {data?.serie?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.serie} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="grad-ibov" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="rotulo"
                    tickLine={false}
                    axisLine={false}
                    fontSize={13}
                    minTickGap={24}
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={13}
                    width={54}
                    stroke="var(--color-muted-foreground)"
                    tickFormatter={(v: number) => num(v / 1000, 1) + "K"}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "12px",
                      fontSize: "13px",
                    }}
                    formatter={(v: number) => [`${num(v)} pts`, "Ibovespa"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    fill="url(#grad-ibov)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-lg bg-muted/50" />
            )}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" />
            {hora
              ? `Atualizado em ${hora} • ${pregao.aberto ? "atualização automática a cada 30s" : "a cada 5min fora do pregão"}`
              : "Carregando dados de mercado…"}

          </p>
        </div>

        <ListaVariacao titulo="Maiores Altas" itens={data?.altas ?? []} tipo="alta" carregando={isFetching} />
        <ListaVariacao titulo="Maiores Baixas" itens={data?.baixas ?? []} tipo="baixa" carregando={isFetching} />
      </div>
    </Panel>
  );
}
