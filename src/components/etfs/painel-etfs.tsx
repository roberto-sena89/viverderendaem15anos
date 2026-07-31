import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  GitCompare,
  LineChart,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Panel } from "@/components/panel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ResumoEtfs } from "@/components/etfs/resumo-etfs";
import {
  FAIXAS_ETF_PADRAO,
  FiltrosEtfs,
  GESTORA_TODAS,
  type FaixasEtf,
  type RankingEtf,
} from "@/components/etfs/filtros-etfs";
import {
  COLUNAS_ETF,
  GRUPOS_COLUNA_ETF,
  TabelaEtfs,
  type ColunaEtfId,
  type OrdemColunaEtf,
  type OrdemEtf,
} from "@/components/etfs/tabela-etfs";
import { ComparadorEtfs } from "@/components/etfs/comparador-etfs";
import { ModalEtf } from "@/components/etfs/modal-etf";
import { RodapeEducativoEtfs } from "@/components/etfs/rodape-educativo-etfs";
import { CotacaoAoVivoBrapi } from "@/components/etfs/market-card";
import { gradeEtfs } from "@/lib/etfs.functions";
import type { ClasseEtf, LinhaEtf, MercadoEtf } from "@/lib/etfs-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { useAtivos } from "@/lib/data";
import { estadoPregao } from "@/lib/cotacoes-tempo-real";
import { mesclarPrecosEtfs, useEtfsAoVivo } from "@/lib/etfs-tempo-real";

const CHAVE_COLUNAS = "etfs:colunas";
const COLUNAS_PADRAO: ColunaEtfId[] = [
  "capitalizacao",
  "dy12",
  "var12m",
  "var60m",
  "cotistas",
  "classe",
];
const TAMANHOS = [25, 50, 100];

const ORDEM_RANKING: Record<RankingEtf, OrdemEtf> = {
  capitalizacao: { coluna: "capitalizacao", desc: true },
  cotistas: { coluna: "cotistas", desc: true },
  dy: { coluna: "dy12", desc: true },
  var30d: { coluna: "var30d", desc: true },
  var12m: { coluna: "var12m", desc: true },
  var60m: { coluna: "var60m", desc: true },
};

function valorOrdem(l: LinhaEtf, c: OrdemColunaEtf): number | string | null {
  switch (c) {
    case "ticker":
      return l.ticker;
    case "classe":
      return l.classe;
    case "gestora":
      return l.gestora;
    case "mercado":
      return l.mercado;
    default:
      return (l as unknown as Record<string, number | null>)[c] ?? null;
  }
}

type Props = { intervaloMs: number; busca: string; apenasFavoritos: boolean };

/** Grade completa dos ETFs listados na B3 (e internacionais) com tempo real. */
export function PainelEtfs({ intervaloMs, busca, apenasFavoritos }: Props) {
  const [buscaLocal, setBuscaLocal] = useState("");
  const [ranking, setRanking] = useState<RankingEtf>("capitalizacao");
  const [classes, setClasses] = useState<ClasseEtf[]>([]);
  const [mercado, setMercado] = useState<MercadoEtf | "todos">("todos");
  const [gestora, setGestora] = useState<string>(GESTORA_TODAS);
  const [faixas, setFaixas] = useState<FaixasEtf>(FAIXAS_ETF_PADRAO);
  const [ordem, setOrdem] = useState<OrdemEtf>(ORDEM_RANKING.capitalizacao);
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(50);
  const [colunas, setColunas] = useState<ColunaEtfId[]>(COLUNAS_PADRAO);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [comparando, setComparando] = useState(false);
  const [detalhe, setDetalhe] = useState<LinhaEtf | null>(null);
  const [pregao, setPregao] = useState(() => estadoPregao());

  const { favoritos, alternar } = useFavoritos();
  const { data: ativos = [] } = useAtivos();

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE_COLUNAS);
      if (bruto) {
        const lista = JSON.parse(bruto) as ColunaEtfId[];
        if (Array.isArray(lista) && lista.length) setColunas(lista);
      }
    } catch {
      /* preferências indisponíveis */
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setPregao(estadoPregao()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const guardarColunas = (proximo: ColunaEtfId[]) => {
    setColunas(proximo);
    try {
      window.localStorage.setItem(CHAVE_COLUNAS, JSON.stringify(proximo));
    } catch {
      /* preferências indisponíveis */
    }
  };

  const alternarColuna = (id: ColunaEtfId) =>
    guardarColunas(colunas.includes(id) ? colunas.filter((c) => c !== id) : [...colunas, id]);

  // WebSocket (Supabase Realtime) como canal primário de preço/variação.
  const aoVivo = useEtfsAoVivo(intervaloMs > 0, pregao.aberto);

  const grade = useQuery({
    queryKey: ["etfs", "grade"],
    queryFn: () => gradeEtfs({ data: {} }),
    refetchInterval: aoVivo.intervaloPolling > 0 ? aoVivo.intervaloPolling : false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const linhas = useMemo(
    () => mesclarPrecosEtfs(grade.data?.linhas ?? [], aoVivo.precos),
    [grade.data, aoVivo.precos],
  );

  const posicoes = useMemo(() => {
    const mapa = new Map<string, { precoMedio: number; quantidade: number }>();
    for (const a of ativos) {
      mapa.set(a.ticker.toUpperCase().replace(/\.SA$/, ""), {
        precoMedio: a.precoMedio,
        quantidade: a.quantidade,
      });
    }
    return mapa;
  }, [ativos]);

  const gestoras = useMemo(() => {
    const set = new Set<string>();
    for (const l of linhas) if (l.gestora) set.add(l.gestora);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [linhas]);

  const termo = `${busca} ${buscaLocal}`.trim().toLowerCase();

  const filtradas = useMemo(() => {
    const minPatrimonio = faixas.patrimonioMin * 1_000_000;
    return linhas.filter((l) => {
      if (apenasFavoritos && !favoritos.includes(l.ticker)) return false;
      if (termo && !`${l.ticker} ${l.nome}`.toLowerCase().includes(termo)) return false;
      if (classes.length && !classes.includes(l.classe)) return false;
      if (mercado !== "todos" && l.mercado !== mercado) return false;
      if (gestora !== GESTORA_TODAS && l.gestora !== gestora) return false;
      if (minPatrimonio > 0 && (l.capitalizacao ?? 0) < minPatrimonio) return false;
      if (l.dy12 !== null && (l.dy12 < faixas.dy[0] || (faixas.dy[1] < 20 && l.dy12 > faixas.dy[1])))
        return false;
      if (
        l.var12m !== null &&
        (l.var12m < faixas.var12m[0] || (faixas.var12m[1] < 120 && l.var12m > faixas.var12m[1]))
      )
        return false;
      return true;
    });
  }, [linhas, apenasFavoritos, favoritos, termo, classes, mercado, gestora, faixas]);

  const ordenadas = useMemo(() => {
    const copia = [...filtradas];
    copia.sort((a, b) => {
      const va = valorOrdem(a, ordem.coluna);
      const vb = valorOrdem(b, ordem.coluna);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "string" || typeof vb === "string") {
        const cmp = String(va).localeCompare(String(vb), "pt-BR");
        return ordem.desc ? -cmp : cmp;
      }
      return ordem.desc ? vb - va : va - vb;
    });
    return copia;
  }, [filtradas, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaAtual * porPagina;
  const paginaTickers = useMemo(
    () => ordenadas.slice(inicio, inicio + porPagina).map((l) => l.ticker),
    [ordenadas, inicio, porPagina],
  );

  // Cotações BRAPI dos ETFs visíveis, atualizadas a cada 5s.
  const brapi = usePrecosBrapiEtfs(paginaTickers, pregao.aberto && intervaloMs > 0);

  const visiveis = useMemo(
    () => mesclarPrecosEtfs(ordenadas.slice(inicio, inicio + porPagina), brapi.precos),
    [ordenadas, inicio, porPagina, brapi.precos],
  );

  useEffect(() => {
    setPagina(0);
  }, [termo, classes, mercado, gestora, faixas, apenasFavoritos, porPagina, ranking]);

  const aoOrdenar = useCallback((c: OrdemColunaEtf) => {
    setOrdem((atual) =>
      atual.coluna === c ? { coluna: c, desc: !atual.desc } : { coluna: c, desc: true },
    );
  }, []);

  const trocarRanking = (r: RankingEtf) => {
    setRanking(r);
    setOrdem(ORDEM_RANKING[r]);
  };

  const limpar = () => {
    setClasses([]);
    setMercado("todos");
    setGestora(GESTORA_TODAS);
    setFaixas(FAIXAS_ETF_PADRAO);
    setBuscaLocal("");
    setRanking("capitalizacao");
    setOrdem(ORDEM_RANKING.capitalizacao);
  };

  const liquidos = filtradas.filter((l) => (l.volume ?? 0) > 0);
  const comDia = (liquidos.length ? liquidos : filtradas).filter((l) => l.variacaoPercent !== null);
  const maiorAlta = comDia.reduce<LinhaEtf | null>(
    (m, l) => (!m || (l.variacaoPercent ?? 0) > (m.variacaoPercent ?? 0) ? l : m),
    null,
  );
  const maiorBaixa = comDia.reduce<LinhaEtf | null>(
    (m, l) => (!m || (l.variacaoPercent ?? 0) < (m.variacaoPercent ?? 0) ? l : m),
    null,
  );
  const maiorPatrimonio = filtradas.reduce<LinhaEtf | null>(
    (m, l) => (!m || (l.capitalizacao ?? 0) > (m.capitalizacao ?? 0) ? l : m),
    null,
  );
  const maiorDy = filtradas
    .filter((l) => l.dy12 !== null && l.dy12 < 30)
    .reduce<LinhaEtf | null>((m, l) => (!m || (l.dy12 ?? 0) > (m.dy12 ?? 0) ? l : m), null);

  const linhasComparadas = selecionados
    .map((t) => linhas.find((l) => l.ticker === t))
    .filter((l): l is LinhaEtf => Boolean(l));

  const painelFiltros = (
    <FiltrosEtfs
      ranking={ranking}
      aoTrocarRanking={trocarRanking}
      classes={classes}
      aoAlternarClasse={(c) =>
        setClasses((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]))
      }
      mercado={mercado}
      aoTrocarMercado={setMercado}
      gestora={gestora}
      aoTrocarGestora={setGestora}
      gestoras={gestoras}
      faixas={faixas}
      aoTrocarFaixas={setFaixas}
      aoLimpar={limpar}
      total={filtradas.length}
    />
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4 pb-20">
        <ResumoEtfs
          ibovespa={grade.data?.ibovespa ?? null}
          maiorAlta={maiorAlta}
          maiorBaixa={maiorBaixa}
          maiorPatrimonio={maiorPatrimonio}
          maiorDy={maiorDy}
          aoSelecionar={setDetalhe}
        />

        {/* Cotação ao vivo (BRAPI) com busca de qualquer ativo da B3 */}
        <CotacaoAoVivoBrapi inicial={detalhe?.ticker ?? "IVVB11"} />

        <Panel
          title="Todos os ETFs listados na B3"
          hint={
            grade.data
              ? `${linhas.length.toLocaleString("pt-BR")} fundos monitorados · preços ${
                  pregao.aberto ? "ao vivo durante o pregão" : "do último fechamento"
                }${grade.data.parcial ? " · alguns indicadores indisponíveis no momento" : ""}`
              : "Carregando a base completa de ETFs…"
          }
          bodyClassName="p-0"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={buscaLocal}
                  onChange={(e) => setBuscaLocal(e.target.value)}
                  placeholder="Filtrar por ticker, fundo…"
                  aria-label="Buscar ETF"
                  className="h-9 w-[210px] pl-8 text-sm"
                />
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="size-4" />
                    Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filtrar ETFs</SheetTitle>
                  </SheetHeader>
                  <div className="p-4 pt-0">{painelFiltros}</div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3 className="size-4" />
                    Colunas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-[min(94vw,42rem)] overflow-hidden p-0"
                >
                  <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
                    <DropdownMenuLabel className="p-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Indicadores · {colunas.length}/{COLUNAS_ETF.length}
                    </DropdownMenuLabel>
                    <div className="flex shrink-0 gap-3 text-xs">
                      <button
                        type="button"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault();
                          guardarColunas(COLUNAS_PADRAO);
                        }}
                      >
                        Padrão
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault();
                          guardarColunas([]);
                        }}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* chips compactos: cabem sem qualquer rolagem */}
                  <div className="flex flex-col gap-2 px-4 pt-1 pb-4">
                    {GRUPOS_COLUNA_ETF.map((grupo) => (
                      <div key={grupo} className="flex flex-wrap items-center gap-1.5">
                        <span className="w-24 shrink-0 truncate text-[0.65rem] tracking-wide text-muted-foreground uppercase">
                          {grupo}
                        </span>
                        {COLUNAS_ETF.filter((c) => c.grupo === grupo).map((c) => {
                          const on = colunas.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              aria-pressed={on}
                              onClick={(e) => {
                                e.preventDefault();
                                alternarColuna(c.id);
                              }}
                              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                on
                                  ? "border-primary/40 bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {c.rotulo}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <span
                title={
                  aoVivo.canal === "websocket"
                    ? "Preços recebidos por WebSocket, sem recarregar a página"
                    : aoVivo.canal === "conectando"
                      ? "Conectando ao canal em tempo real…"
                      : `Atualização periódica a cada ${Math.round(aoVivo.intervaloPolling / 1000)}s`
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  aoVivo.canal === "websocket"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    aoVivo.canal === "websocket" ? "animate-pulse bg-primary" : "bg-muted-foreground"
                  }`}
                  aria-hidden
                />
                {aoVivo.canal === "websocket"
                  ? "Tempo real"
                  : aoVivo.canal === "conectando"
                    ? "Conectando…"
                    : aoVivo.intervaloPolling > 0
                      ? `Atualiza ${Math.round(aoVivo.intervaloPolling / 1000)}s`
                      : "Manual"}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => grade.refetch()}
                disabled={grade.isFetching}
                aria-label="Atualizar cotações dos ETFs"
              >
                <RefreshCw className={`size-4 ${grade.isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          }
        >
          <div className="hidden border-b border-border p-4 lg:block">{painelFiltros}</div>

          <TabelaEtfs
            linhas={visiveis}
            colunas={colunas}
            ordem={ordem}
            aoOrdenar={aoOrdenar}
            favoritos={favoritos}
            aoFavoritar={alternar}
            posicoes={posicoes}
            aoAbrir={setDetalhe}
            carregando={grade.isLoading}
            inicioRanking={inicio}
          />

          {!grade.isLoading && !visiveis.length ? (
            <p className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <LineChart className="size-6" aria-hidden />
              Nenhum ETF corresponde aos filtros aplicados.
              <Button variant="outline" size="sm" onClick={limpar}>
                Limpar filtros
              </Button>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 text-sm">
            <span className="text-muted-foreground">
              Exibindo{" "}
              <strong className="text-foreground tabular-nums">
                {ordenadas.length ? inicio + 1 : 0}–{Math.min(inicio + porPagina, ordenadas.length)}
              </strong>{" "}
              de <strong className="text-foreground tabular-nums">{ordenadas.length}</strong> ETFs
            </span>
            <div className="flex items-center gap-2">
              <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v))}>
                <SelectTrigger className="h-8 w-[120px] text-xs" aria-label="ETFs por página">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAMANHOS.map((t) => (
                    <SelectItem key={t} value={String(t)}>
                      {t} por página
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={paginaAtual === 0}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {paginaAtual + 1} / {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaAtual >= totalPaginas - 1}
                aria-label="Próxima página"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </Panel>

        <RodapeEducativoEtfs />

        {selecionados.length ? (
          <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(560px,calc(100%-2rem))] flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
            <Star className="size-4 text-primary" aria-hidden />
            <span className="text-sm">
              <strong className="tabular-nums">{selecionados.length}</strong> selecionados:{" "}
              <span className="text-muted-foreground">{selecionados.join(", ")}</span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" onClick={() => setComparando(true)} disabled={selecionados.length < 2}>
                <GitCompare className="size-4" />
                Comparar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setSelecionados([])}
                aria-label="Limpar seleção"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <ComparadorEtfs
          linhas={linhasComparadas}
          aberto={comparando}
          aoFechar={() => setComparando(false)}
        />

        <ModalEtf linha={detalhe} aberto={Boolean(detalhe)} aoFechar={() => setDetalhe(null)} />
      </div>
    </TooltipProvider>
  );
}
