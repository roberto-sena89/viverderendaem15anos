import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { corVar, fmtPercent } from "@/components/cotacoes/formatos";
import { detalhePanorama } from "@/lib/detalhe-panorama.functions";
import type { LinhaResumo } from "@/lib/panorama-mercado.functions";

const PERIODOS = [
  { id: "1M", dias: 30 },
  { id: "3M", dias: 90 },
  { id: "6M", dias: 180 },
  { id: "1A", dias: 365 },
  { id: "5A", dias: 365 * 5 },
] as const;

type PeriodoId = (typeof PERIODOS)[number]["id"];

/**
 * Detalhamento premium de um ativo do panorama: performance por janela,
 * variação no período selecionado e mini-gráfico histórico.
 */
export function ModalDetalhePanorama({
  linha,
  aberto,
  aoFechar,
  aoAbrirAba,
  rotuloCategoria,
}: {
  linha: LinhaResumo | null;
  aberto: boolean;
  aoFechar: () => void;
  aoAbrirAba?: (id: string, filtro?: string) => void;
  rotuloCategoria?: string;
}) {
  const [periodo, setPeriodo] = useState<PeriodoId>("1A");
  const buscar = useServerFn(detalhePanorama);
  const simbolo = linha?.simbolo ?? null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["detalhe-panorama", simbolo],
    queryFn: () => buscar({ data: { simbolo: simbolo as string } }),
    enabled: aberto && Boolean(simbolo),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  const dias = PERIODOS.find((p) => p.id === periodo)?.dias ?? 365;

  const recorte = useMemo(() => {
    const serie = data?.serie ?? [];
    if (serie.length < 2) return { pontos: [] as number[], variacao: null as number | null };
    const limite = new Date(serie[serie.length - 1].data).getTime() - dias * 24 * 3600 * 1000;
    const filtrada = serie.filter((p) => new Date(p.data).getTime() >= limite);
    const usada = filtrada.length >= 2 ? filtrada : serie;
    const primeiro = usada[0].fechamento;
    const ultimo = usada[usada.length - 1].fechamento;
    return {
      pontos: usada.map((p) => p.fechamento),
      variacao: primeiro > 0 ? ((ultimo - primeiro) / primeiro) * 100 : null,
    };
  }, [data, dias]);

  if (!linha) return null;

  const serieGrafico = recorte.pontos.length >= 2 ? recorte.pontos : linha.spark;
  const variacaoPeriodo = recorte.variacao ?? linha.variacao;
  const positivo = (variacaoPeriodo ?? 0) >= 0;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-[42rem] overflow-y-auto p-cartao sm:max-w-[42rem]">
        <DialogHeader>
          <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 text-left">
            <span className="t-h3 min-w-0 truncate">{linha.ticker}</span>
            {rotuloCategoria ? (
              <span className="t-label shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                {rotuloCategoria}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="t-body-sm texto-seguro text-left">
            {linha.nome}
          </DialogDescription>
        </DialogHeader>

        <div className="container-panorama pilha-secao px-0">
          {/* preço + variações */}
          <div className="flex flex-wrap items-end justify-between gap-bloco">
            <div className="min-w-0">
              <p className="t-label">Cotação atual</p>
              <p className="t-metric truncate">{linha.valor}</p>
              <p className={`t-num ${corVar(linha.variacao)}`}>
                {fmtPercent(linha.variacao)} no dia
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="t-label">Variação em {periodo}</p>
              <p className={`t-metric-sm truncate ${corVar(variacaoPeriodo)}`}>
                {fmtPercent(variacaoPeriodo)}
              </p>
            </div>
          </div>


          {/* seletor de período */}
          {simbolo ? (
            <div
              role="tablist"
              aria-label="Período do gráfico"
              className="flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1"
            >
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  role="tab"
                  type="button"
                  aria-selected={periodo === p.id}
                  onClick={() => setPeriodo(p.id)}
                  className={`t-caption min-w-12 flex-1 rounded-lg px-2 py-1.5 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                    periodo === p.id
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.id}
                </button>
              ))}
            </div>
          ) : null}

          {/* mini-gráfico */}
          <div className="relative rounded-xl border border-border/60 bg-background/40 p-3">
            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : serieGrafico.length >= 2 ? (
              <Sparkline
                serie={serieGrafico}
                positivo={positivo}
                largura={640}
                altura={160}
                className="h-40 w-full"
              />
            ) : (
              <p className="t-body-sm py-12 text-center text-muted-foreground">
                {isError
                  ? "Não foi possível carregar o histórico agora."
                  : "Histórico indisponível para este ativo."}
              </p>
            )}
            {isLoading ? (
              <Loader2
                className="absolute top-3 right-3 size-4 animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : null}
          </div>

          {/* performance por janela */}
          {data?.janelas?.length ? (
            <div>
              <p className="t-card-title mb-2 text-muted-foreground">Performance histórica</p>
              <dl className="grade-metricas">
                {data.janelas.map((j) => (
                  <div key={j.rotulo} className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                    <dt className="t-label truncate">
                      {j.rotulo}
                    </dt>
                    <dd className={`t-num-sm font-semibold ${corVar(j.variacaoPercent)}`}>
                      {fmtPercent(j.variacaoPercent)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {/* estatísticas de risco/retorno */}
          {data ? (
            <dl className="grade-metricas">
              <Info rotulo="Retorno a.a. (5 anos)" valor={fmtPercent(data.estatisticas.retornoAnualizadoPercent)} />
              <Info rotulo="Volatilidade anual" valor={fmtPercent(data.estatisticas.volatilidadeAnualPercent)} />
              <Info rotulo="Maior queda" valor={fmtPercent(data.estatisticas.drawdownMaximoPercent)} />
              <Info
                rotulo="Faixa 5 anos"
                valor={
                  data.estatisticas.minimo !== null && data.estatisticas.maximo !== null
                    ? `${num(data.estatisticas.minimo)} – ${num(data.estatisticas.maximo)}`
                    : "—"
                }
              />
            </dl>
          ) : null}

          {/* métricas próprias da categoria */}
          {linha.detalhes.length ? (
            <div>
              <p className="t-card-title mb-2 text-muted-foreground">Indicadores</p>
              <dl className="grade-metricas">
                {linha.detalhes.slice(0, 6).map((m) => (
                  <Info key={m.rotulo} rotulo={m.rotulo} valor={m.valor} />
                ))}
              </dl>
            </div>
          ) : null}

          {aoAbrirAba ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                aoFechar();
                aoAbrirAba(linha.destino, linha.ticker);
              }}
            >
              Abrir na grade completa <ArrowUpRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const num = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="t-label truncate">{rotulo}</dt>
      <dd className="t-num truncate font-medium">{valor}</dd>
    </div>
  );
}
