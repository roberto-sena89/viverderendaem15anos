import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, ChevronDown, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Panel } from "@/components/panel";
import {
  CardCommodity,
  CardCommoditySkeleton,
  corVar,
  fmtDinheiro,
  fmtVar,
  type Moeda,
} from "@/components/commodities/card-commodity";
import { ModalCommodity } from "@/components/commodities/modal-commodity";
import { ComparadorCommodities } from "@/components/commodities/comparador-commodities";
import { RodapeEducativoCommodities } from "@/components/commodities/rodape-educativo-commodities";
import { gradeCommodities } from "@/lib/commodities.functions";
import {
  CATEGORIAS_COMMODITY,
  CORRELACOES,
  DESTAQUES_COMMODITY,
  mercadoCategoria,
  type CategoriaCommodity,
  type LinhaCommodity,
} from "@/lib/commodities-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { useAtivos } from "@/lib/data";
import { cn } from "@/lib/utils";

type Ordem = "buscadas" | "maior12m" | "menor12m";

const ORDENS: { id: Ordem; rotulo: string }[] = [
  { id: "buscadas", rotulo: "Mais buscadas" },
  { id: "maior12m", rotulo: "Maiores altas 12M" },
  { id: "menor12m", rotulo: "Maiores baixas 12M" },
];

const MOEDAS: { id: Moeda; rotulo: string }[] = [
  { id: "usd", rotulo: "USD" },
  { id: "brl", rotulo: "BRL" },
  { id: "ambas", rotulo: "Ambas" },
];

/** Grupos de bolsa reconhecidos nos rótulos dos contratos (ex.: "ICE / NYMEX", "SGX 62% Fe"). */
const GRUPOS_BOLSA = ["ICE", "NYMEX", "COMEX", "CBOT", "CME", "LME", "SGX"] as const;

/** Extrai os grupos de bolsa presentes no rótulo do contrato. */
function bolsasDaLinha(bolsa: string): string[] {
  const alvo = bolsa.toUpperCase();
  return GRUPOS_BOLSA.filter((g) => alvo.includes(g));
}

const MAIS_BUSCADAS = ["BRENT", "OURO", "MINERIO", "SOJA", "CAFE", "BOI", "WTI", "MILHO"];

const chaveFavorito = (codigo: string) => `CMD:${codigo}`;

/** Grade completa de commodities internacionais, em cards por categoria. */
export function PainelCommodities({
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
  const buscar = useServerFn(gradeCommodities);
  const { favoritos, alternar } = useFavoritos();
  const { data: ativos = [] } = useAtivos();

  const [moeda, setMoeda] = useState<Moeda>("usd");
  const [ordem, setOrdem] = useState<Ordem>("buscadas");
  const [categoria, setCategoria] = useState<CategoriaCommodity | "todas">("todas");
  const [bolsas, setBolsas] = useState<string[]>([]);
  const [somenteAbertas, setSomenteAbertas] = useState(false);
  const [recolhidas, setRecolhidas] = useState<Record<string, boolean>>({});
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [comparando, setComparando] = useState(false);
  const [detalhe, setDetalhe] = useState<LinhaCommodity | null>(null);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["grade-commodities"],
    queryFn: async () => {
      const r = await buscar({ data: { forcar: false } });
      aoAtualizar?.(Date.now(), r.parcial);
      return r;
    },
    refetchInterval: intervaloMs > 0 ? Math.max(intervaloMs, 15_000) : false,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    gcTime: 30 * 60_000,
  });

  const linhas = data?.linhas ?? [];
  const usdBrl = data?.usdBrl ?? 0;

  const tickersCarteira = useMemo(
    () => ativos.map((a) => a.ticker.toUpperCase()),
    [ativos],
  );

  // Bolsas presentes nos dados carregados, com a contagem de contratos de cada uma
  const bolsasDisponiveis = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const l of linhas) {
      for (const g of bolsasDaLinha(l.bolsa)) contagem.set(g, (contagem.get(g) ?? 0) + 1);
    }
    return GRUPOS_BOLSA.filter((g) => contagem.has(g)).map((g) => ({ id: g, total: contagem.get(g)! }));
  }, [linhas]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let lista = linhas.filter((l) => {
      if (apenasFavoritos && !favoritos.includes(chaveFavorito(l.codigo))) return false;
      if (categoria !== "todas" && l.categoria !== categoria) return false;
      if (somenteAbertas && !mercadoCategoria(l.categoria).aberto) return false;
      if (bolsas.length > 0) {
        const grupos = bolsasDaLinha(l.bolsa);
        if (!bolsas.some((b) => grupos.includes(b))) return false;
      }
      if (!termo) return true;
      return `${l.codigo} ${l.nome} ${l.bolsa}`.toLowerCase().includes(termo);
    });

    if (ordem === "maior12m") {
      lista = [...lista].sort((a, b) => (b.variacao12m ?? -Infinity) - (a.variacao12m ?? -Infinity));
    } else if (ordem === "menor12m") {
      lista = [...lista].sort((a, b) => (a.variacao12m ?? Infinity) - (b.variacao12m ?? Infinity));
    } else {
      lista = [...lista].sort((a, b) => {
        const ia = MAIS_BUSCADAS.indexOf(a.codigo);
        const ib = MAIS_BUSCADAS.indexOf(b.codigo);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    }
    return lista;
  }, [linhas, busca, apenasFavoritos, favoritos, categoria, ordem, bolsas, somenteAbertas]);

  const destaques = useMemo(
    () =>
      DESTAQUES_COMMODITY.map((c) => linhas.find((l) => l.codigo === c)).filter(
        (l): l is LinhaCommodity => Boolean(l),
      ),
    [linhas],
  );

  const secoes = useMemo(
    () =>
      CATEGORIAS_COMMODITY.map((c) => ({
        ...c,
        itens: filtradas.filter((l) => l.categoria === c.id),
      })).filter((c) => c.itens.length > 0),
    [filtradas],
  );

  const comparadas = useMemo(
    () => linhas.filter((l) => selecionadas.includes(l.codigo)),
    [linhas, selecionadas],
  );

  const alternarBolsa = (id: string) =>
    setBolsas((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));

  const filtrosAtivos = (categoria !== "todas" ? 1 : 0) + bolsas.length + (somenteAbertas ? 1 : 0);

  const limparFiltros = () => {
    setCategoria("todas");
    setBolsas([]);
    setSomenteAbertas(false);
  };

  const alternarSelecao = (codigo: string) =>
    setSelecionadas((s) => (s.includes(codigo) ? s.filter((x) => x !== codigo) : [...s, codigo].slice(-6)));

  const segundos = dataUpdatedAt ? Math.round((Date.now() - dataUpdatedAt) / 1000) : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 pb-16">
        {/* Faixa de destaque: as commodities que mais movem a bolsa brasileira */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading && !destaques.length
            ? Array.from({ length: 3 }).map((_, i) => <CardCommoditySkeleton key={i} />)
            : destaques.map((l) => {
                const correlacao = CORRELACOES[l.codigo];
                const mercado = mercadoCategoria(l.categoria);
                return (
                  <button
                    key={l.codigo}
                    type="button"
                    onClick={() => setDetalhe(l)}
                    className="panel bg-muted/20 p-4 text-left transition-colors hover:border-primary/40"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <p className="truncate text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                        {l.nome} · {l.bolsa}
                      </p>
                      <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                        {mercado.aberto ? "● ao vivo" : "○ fechado"}
                      </span>
                    </div>
                    <p className="font-display mt-1 truncate text-2xl leading-none tabular-nums">
                      {moeda === "brl"
                        ? fmtDinheiro(l.precoUsd === null ? null : l.precoUsd * usdBrl, "R$")
                        : fmtDinheiro(l.precoUsd, "US$")}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">/ {l.unidade}</span>
                    </p>
                    <p className={cn("mt-1 text-xs font-semibold tabular-nums", corVar(l.variacao12m))}>
                      {fmtVar(l.variacao12m)}{" "}
                      <span className="font-normal text-muted-foreground">em 12m</span>
                    </p>
                    {correlacao ? (
                      <p className="mt-2 truncate text-[0.68rem] text-muted-foreground">{correlacao.frase}</p>
                    ) : null}
                  </button>
                );
              })}
        </div>

        <Panel
          title="Commodities globais"
          hint={`${filtradas.length} contratos monitorados · dólar comercial R$ ${usdBrl.toLocaleString("pt-BR", {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          })} · ${segundos === null ? "sincronizando…" : `atualizado há ${Math.max(0, segundos)}s`}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
                {MOEDAS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMoeda(m.id)}
                    aria-pressed={moeda === m.id}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs transition-colors",
                      moeda === m.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {m.rotulo}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          }
          bodyClassName="p-4 sm:p-5 space-y-4"
        >
          {/* Ordenação e categorias */}
          <div className="flex flex-wrap items-center gap-1.5">
            {ORDENS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOrdem(o.id)}
                aria-pressed={ordem === o.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  ordem === o.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {o.rotulo}
              </button>
            ))}
            <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
            {[{ id: "todas" as const, curto: "Todas" }, ...CATEGORIAS_COMMODITY].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoria(c.id as CategoriaCommodity | "todas")}
                aria-pressed={categoria === c.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  categoria === c.id
                    ? "border-primary/60 bg-primary-soft text-accent-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {c.curto}
              </button>
            ))}
          </div>

          {/* Filtro por bolsa / pregão */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase">
              Bolsa
            </span>
            {bolsasDisponiveis.map((b) => {
              const ativa = bolsas.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => alternarBolsa(b.id)}
                  aria-pressed={ativa}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
                    ativa
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {b.id}
                  <span className={cn("ml-1 tabular-nums", ativa ? "opacity-80" : "opacity-60")}>{b.total}</span>
                </button>
              );
            })}
            <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
            <button
              type="button"
              onClick={() => setSomenteAbertas((v) => !v)}
              aria-pressed={somenteAbertas}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
                somenteAbertas
                  ? "border-positive bg-positive/15 text-positive"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <span className={cn("size-1.5 rounded-full", somenteAbertas ? "bg-positive" : "bg-muted-foreground")} />
              Pregão aberto
            </button>
            {filtrosAtivos > 0 ? (
              <button
                type="button"
                onClick={limparFiltros}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
              >
                <X className="size-3" />
                Limpar filtros ({filtrosAtivos})
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <CardCommoditySkeleton key={i} />
              ))}
            </div>
          ) : secoes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {apenasFavoritos
                ? "Nenhuma commodity favoritada ainda — toque na estrela de um card para acompanhá-la aqui."
                : filtrosAtivos > 0
                  ? "Nenhuma commodity corresponde aos filtros de categoria, bolsa ou pregão selecionados."
                  : "Nenhuma commodity encontrada para a busca."}
            </p>
          ) : (
            secoes.map((s) => {
              const aberta = !recolhidas[s.id];
              const mercado = mercadoCategoria(s.id);
              return (
                <section key={s.id} className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setRecolhidas((r) => ({ ...r, [s.id]: aberta }))}
                    aria-expanded={aberta}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border pb-1.5 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="panel-title truncate">{s.rotulo}</span>
                      <span
                        className={cn(
                          "hidden shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-medium sm:inline",
                          mercado.aberto
                            ? "bg-positive/10 text-positive"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {mercado.aberto ? "Pregão aberto" : "Fechado"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {s.itens.length}
                      <ChevronDown className={cn("size-4 transition-transform", !aberta && "-rotate-90")} />
                    </span>
                  </button>
                  {aberta ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {s.itens.map((l) => (
                        <CardCommodity
                          key={l.codigo}
                          linha={l}
                          usdBrl={usdBrl}
                          moeda={moeda}
                          favorito={favoritos.includes(chaveFavorito(l.codigo))}
                          aoFavoritar={() => alternar(chaveFavorito(l.codigo))}
                          aoAbrir={() => setDetalhe(l)}
                          selecionado={selecionadas.includes(l.codigo)}
                          aoSelecionar={() => alternarSelecao(l.codigo)}
                          tickersCarteira={tickersCarteira}
                          destaque={(DESTAQUES_COMMODITY as readonly string[]).includes(l.codigo)}
                        />
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
        </Panel>

        <RodapeEducativoCommodities />

        {/* Botão flutuante do comparador */}
        {selecionadas.length > 1 ? (
          <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background/90 p-1.5 pl-4 shadow-lg backdrop-blur-xl">
              <span className="text-xs text-muted-foreground">{selecionadas.length} selecionadas</span>
              <Button size="sm" className="h-8 rounded-full" onClick={() => setComparando(true)}>
                <BarChart3 className="size-4" />
                Comparar selecionadas ({selecionadas.length})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full"
                onClick={() => setSelecionadas([])}
              >
                Limpar
              </Button>
            </div>
          </div>
        ) : null}

        <ComparadorCommodities
          linhas={comparadas}
          usdBrl={usdBrl}
          aberto={comparando && comparadas.length > 1}
          aoFechar={() => setComparando(false)}
        />

        <ModalCommodity
          linha={detalhe}
          usdBrl={usdBrl}
          moeda={moeda}
          aberto={detalhe !== null}
          aoFechar={() => setDetalhe(null)}
        />
      </div>
    </TooltipProvider>
  );
}
