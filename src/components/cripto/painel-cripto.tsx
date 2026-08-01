import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ResumoCripto } from "@/components/cripto/resumo-cripto";
import {
  FiltrosCripto,
  FAIXAS_PADRAO,
  RANKINGS,
  type FaixasCripto,
  type RankingCripto,
} from "@/components/cripto/filtros-cripto";
import { TabelaCripto, type ColunaOrdem, type OrdemCripto, type PosicaoCarteira } from "@/components/cripto/tabela-cripto";
import { CardsCripto } from "@/components/cripto/cards-cripto";
import { SkeletonLinhasCripto } from "@/components/cripto/skeleton-linhas-cripto";
import { ModalCripto } from "@/components/cripto/modal-cripto";
import { ComparadorCripto, ConversorCripto } from "@/components/cripto/conversor-cripto";
import { gradeCripto } from "@/lib/cripto.functions";
import type { CategoriaCripto, LinhaCripto } from "@/lib/cripto-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { useAtivos } from "@/lib/data";

/** Cripto negocia 24/7: mantemos uma atualização mínima mesmo no modo manual. */
const INTERVALO_MINIMO = 30_000;

/** Quantidade inicial de moedas exibidas e passo do botão "Mostrar mais". */
const PAGINA = 25;

const ORDEM_POR_RANKING: Record<RankingCripto, OrdemCripto> = {
  capitalizacao: { coluna: "capitalizacao", desc: true },
  altas1h: { coluna: "variacao1h", desc: true },
  altas24h: { coluna: "variacao24h", desc: true },
  altas7d: { coluna: "variacao7d", desc: true },
  altas30d: { coluna: "variacao30d", desc: true },
  volume24h: { coluna: "volume24h", desc: true },
  baixas24h: { coluna: "variacao24h", desc: false },
  queridas: { coluna: "capitalizacao", desc: true },
};

export function PainelCripto({
  intervaloMs,
  busca,
  apenasFavoritos,
  aoAtualizar,
}: {
  intervaloMs: number;
  busca: string;
  apenasFavoritos: boolean;
  aoAtualizar?: (quando: number, parcial: boolean) => void;
}) {
  const buscar = useServerFn(gradeCripto);
  const { favoritos, alternar } = useFavoritos();
  const { data: ativos = [] } = useAtivos();

  const [ranking, setRanking] = useState<RankingCripto>("capitalizacao");
  const [ordem, setOrdem] = useState<OrdemCripto>(ORDEM_POR_RANKING.capitalizacao);
  const [categorias, setCategorias] = useState<CategoriaCripto[]>([]);
  const [faixas, setFaixas] = useState<FaixasCripto>(FAIXAS_PADRAO);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [detalhe, setDetalhe] = useState<LinhaCripto | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const intervalo = intervaloMs > 0 ? Math.max(intervaloMs, 15_000) : INTERVALO_MINIMO;

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["grade-cripto"],
    queryFn: () => buscar({ data: { forcar: false } }),
    refetchInterval: intervalo,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    gcTime: 30 * 60_000,
  });

  useEffect(() => {
    if (dataUpdatedAt && data) aoAtualizar?.(dataUpdatedAt, data.parcial);
  }, [dataUpdatedAt, data, aoAtualizar]);

  const posicoes = useMemo(() => {
    const mapa = new Map<string, PosicaoCarteira>();
    for (const a of ativos) {
      mapa.set(a.ticker.toUpperCase(), { precoMedio: a.precoMedio, quantidade: a.quantidade });
    }
    return mapa;
  }, [ativos]);

  const usdBrl = data?.usdBrl ?? 0;

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = (data?.linhas ?? []).filter((l) => {
      if (apenasFavoritos && !favoritos.includes(l.ticker)) return false;
      if (termo && !`${l.ticker} ${l.nome}`.toLowerCase().includes(termo)) return false;
      if (categorias.length > 0 && !categorias.includes(l.categoria)) return false;
      if ((l.capitalizacao ?? 0) < faixas.capMin * 1e6) return false;
      const dentro = (v: number | null, [min, max]: [number, number]) =>
        v === null ? min <= -100 : v >= min && v <= max;
      if (!dentro(l.variacao24h, faixas.var24h)) return false;
      if (!dentro(l.variacao30d, faixas.var30d)) return false;
      if (!dentro(l.variacao12m, faixas.var12m)) return false;
      if (ranking === "queridas" && !favoritos.includes(l.ticker)) return false;
      return true;
    });

    const fator = ordem.desc ? -1 : 1;
    return [...base].sort((a, b) => {
      if (ordem.coluna === "ticker") return -fator * a.ticker.localeCompare(b.ticker);
      const va = (a[ordem.coluna] as number | null) ?? (ordem.desc ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
      const vb = (b[ordem.coluna] as number | null) ?? (ordem.desc ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
      return fator * (va - vb);
    });
  }, [data, busca, apenasFavoritos, favoritos, categorias, faixas, ordem, ranking]);

  const [visiveis, setVisiveis] = useState(PAGINA);
  /** Quantas linhas-fantasma mostrar enquanto o próximo lote entra na grade. */
  const [carregandoMais, setCarregandoMais] = useState(0);

  // Volta para a primeira página sempre que filtros/ordenação mudam
  useEffect(() => {
    setVisiveis(PAGINA);
    setCarregandoMais(0);
  }, [busca, apenasFavoritos, categorias, faixas, ordem, ranking]);

  // Limpa qualquer lote pendente ao desmontar
  useEffect(() => () => setCarregandoMais(0), []);

  const linhasVisiveis = useMemo(() => linhas.slice(0, visiveis), [linhas, visiveis]);
  const restantes = linhas.length - linhasVisiveis.length;

  /** Revela mais moedas exibindo skeletons por um instante (percepção de carregamento). */
  const carregarMais = (quantidade: number) => {
    if (carregandoMais > 0) return;
    const lote = Math.min(quantidade, restantes);
    if (lote <= 0) return;
    setCarregandoMais(lote);
    window.setTimeout(() => {
      setVisiveis((v) => v + lote);
      setCarregandoMais(0);
    }, 400);
  };

  const comparadas = useMemo(
    () => (data?.linhas ?? []).filter((l) => selecionados.includes(l.id)),
    [data, selecionados],
  );

  const ordenar = (coluna: ColunaOrdem) =>
    setOrdem((o) => (o.coluna === coluna ? { coluna, desc: !o.desc } : { coluna, desc: true }));




  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        <ResumoCripto
          linhas={data?.linhas ?? []}
          usdBrl={usdBrl}
          capitalizacaoTotal={data?.capitalizacaoTotal ?? 0}
          dominanciaBtc={data?.dominanciaBtc ?? null}
          aoAbrir={setDetalhe}
        />

        {/* Conversor fixo no topo (abaixo do cabeçalho) para comparar com a grade ao rolar */}
        <div className="sticky top-[4.25rem] z-10 -mx-1 rounded-xl bg-background/80 px-1 py-1 backdrop-blur-xl sm:top-[5.75rem]">
          <ConversorCripto linhas={data?.linhas ?? []} usdBrl={usdBrl} />
        </div>


        <div className={`panel rounded-xl p-3 ${mostrarFiltros ? "" : "hidden lg:block"}`}>
          <FiltrosCripto
            categorias={categorias}
            alternarCategoria={(c) =>
              setCategorias((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))
            }
            faixas={faixas}
            definirFaixas={setFaixas}
            aoLimpar={() => {
              setCategorias([]);
              setFaixas(FAIXAS_PADRAO);
            }}
          />
        </div>

        <ComparadorCripto
          linhas={comparadas}
          usdBrl={usdBrl}
          aoRemover={(id) => setSelecionados((s) => s.filter((x) => x !== id))}
        />


        <div className="panel overflow-hidden rounded-xl">
          {/* Cabeçalho da grade: título + contagem à esquerda, ações à direita */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold tracking-tight sm:text-base">
                Ranking de criptomoedas
              </h2>
              <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] font-semibold tabular-nums text-muted-foreground">
                {linhas.length} moeda{linhas.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 lg:hidden"
                onClick={() => setMostrarFiltros((v) => !v)}
              >
                Filtros
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => refetch()}>
                <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          </div>

          {/* Rankings: rolagem horizontal no mobile, quebra natural no desktop */}
          <div className="border-b border-border bg-muted/20 px-3 py-2 sm:px-4">
            <div
              role="tablist"
              aria-label="Rankings de criptomoedas"
              className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
            >
              {RANKINGS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={ranking === r.id}
                  onClick={() => {
                    setRanking(r.id);
                    setOrdem(ORDEM_POR_RANKING[r.id]);
                  }}
                  className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    ranking === r.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {r.rotulo}
                </button>
              ))}
            </div>
          </div>


          <div className="min-w-0">
            {linhas.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Nenhuma criptomoeda corresponde aos filtros aplicados.
              </p>
            ) : (
              <>
                <div className="hidden md:block">
                  <TabelaCripto
                    linhas={linhasVisiveis}
                    usdBrl={usdBrl}
                    ordem={ordem}
                    aoOrdenar={ordenar}
                    favoritos={favoritos}
                    aoFavoritar={alternar}
                    posicoes={posicoes}
                    aoAbrir={setDetalhe}
                  />
                </div>
                <div className="md:hidden">
                  <CardsCripto
                    linhas={linhasVisiveis}
                    usdBrl={usdBrl}
                    favoritos={favoritos}
                    aoFavoritar={alternar}
                    posicoes={posicoes}
                    aoAbrir={setDetalhe}
                  />
                </div>

                {/* Skeletons do próximo lote: evita área vazia durante a expansão */}
                {carregandoMais > 0 && <SkeletonLinhasCripto quantidade={carregandoMais} />}

                {/* Paginação incremental */}
                <div className="flex flex-col items-center gap-2 border-t border-border px-3 py-3 sm:flex-row sm:justify-between sm:px-4">
                  <p
                    className="text-xs text-muted-foreground tabular-nums"
                    aria-live="polite"
                    aria-busy={carregandoMais > 0}
                  >
                    {carregandoMais > 0
                      ? `Carregando mais ${carregandoMais} moedas…`
                      : `Mostrando ${linhasVisiveis.length} de ${linhas.length} moedas`}
                  </p>
                  {restantes > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={carregandoMais > 0}
                        onClick={() => carregarMais(PAGINA)}
                      >
                        {carregandoMais > 0 && <Loader2 className="size-3.5 animate-spin" />}
                        {carregandoMais > 0
                          ? "Carregando…"
                          : `Mostrar mais ${Math.min(PAGINA, restantes)}`}
                      </Button>
                      {restantes > PAGINA && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            disabled={carregandoMais > 0}
                            onClick={() => carregarMais(PAGINA * 4)}
                          >
                            +{Math.min(PAGINA * 4, restantes)}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            disabled={carregandoMais > 0}
                            onClick={() => carregarMais(restantes)}
                          >
                            Ver todas
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  {restantes === 0 && visiveis > PAGINA && carregandoMais === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => setVisiveis(PAGINA)}
                    >
                      Mostrar menos
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

        </div>

        <p className="text-xs text-muted-foreground">
          Fonte: {data?.fonte ?? "CoinGecko"} · mercado cripto aberto 24 horas por dia, 7 dias por
          semana. Valores em reais convertidos pelo dólar comercial.
        </p>

        <ModalCripto
          linha={detalhe}
          usdBrl={usdBrl}
          aberto={detalhe !== null}
          aoFechar={() => setDetalhe(null)}
        />
      </div>
    </TooltipProvider>
  );
}
