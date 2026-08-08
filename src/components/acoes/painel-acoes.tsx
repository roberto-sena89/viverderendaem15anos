import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ResumoAcoes } from "@/components/acoes/resumo-acoes";
import {
  FAIXAS_ACAO_PADRAO,
  FiltrosAcoes,
  type FaixasAcao,
  type RankingAcao,
} from "@/components/acoes/filtros-acoes";
import {
  COLUNAS_ACAO,
  GRUPOS_COLUNA,
  TabelaAcoes,
  type ColunaAcaoId,
  type OrdemAcao,
  type OrdemColunaAcao,
} from "@/components/acoes/tabela-acoes";
import { ComparadorAcoes } from "@/components/acoes/comparador-acoes";
import { ModalAcao } from "@/components/acoes/modal-acao";
import { RodapeEducativoAcoes } from "@/components/acoes/rodape-educativo-acoes";
import { gradeAcoes, historicoAcoesGrade } from "@/lib/acoes.functions";
import type { HistoricoAcao, LinhaAcao, SetorAcao } from "@/lib/acoes-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { useAtivos } from "@/lib/data";
import { estadoPregao } from "@/lib/cotacoes-tempo-real";
import { mesclarPrecosAcoes, useAcoesAoVivo } from "@/lib/acoes-tempo-real";
import { useValorAtrasado } from "@/lib/fiis-virtualizacao";
import { EstadoVazio } from "@/components/estado-vazio";

const CHAVE_COLUNAS = "acoes:colunas";
const COLUNAS_PADRAO: ColunaAcaoId[] = [
  "valorMercado",
  "pl",
  "pvp",
  "dy12",
  "roe",
  "margemLiquida",
  "var12m",
  "setor",
];
const TAMANHOS = [25, 50, 100];

const ORDEM_RANKING: Record<RankingAcao, OrdemAcao> = {
  valorMercado: { coluna: "valorMercado", desc: true },
  dy: { coluna: "dy12", desc: true },
  graham: { coluna: "upsideGraham", desc: true },
  margemLiquida: { coluna: "margemLiquida", desc: true },
  pontuacao: { coluna: "pontuacao", desc: true },
  var12m: { coluna: "var12m", desc: true },
};

function valorOrdem(
  l: LinhaAcao,
  h: HistoricoAcao | undefined,
  c: OrdemColunaAcao,
): number | string | null {
  switch (c) {
    case "ticker":
      return l.ticker;
    case "setor":
      return l.setor;
    case "subsetor":
      return l.subsetor;
    case "segmento":
      return l.segmento;
    case "bazin":
      return l.precoTetoBazin;
    case "graham":
      return l.precoJustoGraham;
    case "dy5a":
      return h?.dy5a ?? null;
    case "var30d":
      return h?.var30d ?? null;
    case "var12m":
      return h?.var12m ?? null;
    case "var60m":
      return h?.var60m ?? null;
    default:
      return (l as unknown as Record<string, number | null>)[c] ?? null;
  }
}

type Props = { intervaloMs: number; busca: string };

/** Grade completa das ações listadas na B3: filtros, comparador e tempo real. */
export function PainelAcoes({ intervaloMs, busca }: Props) {
  const [buscaLocal, setBuscaLocal] = useState("");
  const [ranking, setRanking] = useState<RankingAcao>("valorMercado");
  const [setores, setSetores] = useState<SetorAcao[]>([]);
  const [subsetor, setSubsetor] = useState("todos");
  const [segmento, setSegmento] = useState("todos");
  const [faixas, setFaixas] = useState<FaixasAcao>(FAIXAS_ACAO_PADRAO);
  const [ordem, setOrdem] = useState<OrdemAcao>(ORDEM_RANKING.valorMercado);
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(50);
  const [colunas, setColunas] = useState<ColunaAcaoId[]>(COLUNAS_PADRAO);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [comparando, setComparando] = useState(false);
  const [detalhe, setDetalhe] = useState<LinhaAcao | null>(null);
  const [pregao, setPregao] = useState(() => estadoPregao());

  const { favoritos, alternar } = useFavoritos();
  const { data: ativos = [] } = useAtivos();

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE_COLUNAS);
      if (bruto) {
        const lista = JSON.parse(bruto) as ColunaAcaoId[];
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

  const alternarColuna = (id: ColunaAcaoId) => {
    setColunas((atual) => {
      const proximo = atual.includes(id) ? atual.filter((c) => c !== id) : [...atual, id];
      try {
        window.localStorage.setItem(CHAVE_COLUNAS, JSON.stringify(proximo));
      } catch {
        /* preferências indisponíveis */
      }
      return proximo;
    });
  };

  // WebSocket (Supabase Realtime) como canal primário de preço/variação.
  const aoVivo = useAcoesAoVivo(intervaloMs > 0, pregao.aberto);

  const grade = useQuery({
    queryKey: ["acoes", "grade"],
    queryFn: () => gradeAcoes({ data: {} }),
    // Fallback: 15s no pregão quando o WebSocket não está disponível.
    refetchInterval: aoVivo.intervaloPolling > 0 ? aoVivo.intervaloPolling : false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const linhas = useMemo(
    () => mesclarPrecosAcoes(grade.data?.linhas ?? [], aoVivo.precos),
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

  const subsetores = useMemo(() => {
    const set = new Set<string>();
    for (const l of linhas) {
      if (!l.subsetor) continue;
      if (setores.length && !setores.includes(l.setor)) continue;
      set.add(l.subsetor);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [linhas, setores]);

  const segmentos = useMemo(() => {
    const set = new Set<string>();
    for (const l of linhas) {
      if (!l.segmento) continue;
      if (setores.length && !setores.includes(l.setor)) continue;
      if (subsetor !== "todos" && l.subsetor !== subsetor) continue;
      set.add(l.segmento);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [linhas, setores, subsetor]);

  const termo = `${busca} ${buscaLocal}`.trim().toLowerCase();

  const filtradas = useMemo(() => {
    return linhas.filter((l) => {
      if (termo && !`${l.ticker} ${l.nome}`.toLowerCase().includes(termo)) return false;
      if (setores.length && !setores.includes(l.setor)) return false;
      if (subsetor !== "todos" && l.subsetor !== subsetor) return false;
      if (segmento !== "todos" && l.segmento !== segmento) return false;
      if (
        l.dy12 !== null &&
        (l.dy12 < faixas.dy[0] || (faixas.dy[1] < 20 && l.dy12 > faixas.dy[1]))
      )
        return false;
      if (l.pl !== null && (l.pl < faixas.pl[0] || (faixas.pl[1] < 40 && l.pl > faixas.pl[1])))
        return false;
      if (
        l.pvp !== null &&
        (l.pvp < faixas.pvp[0] || (faixas.pvp[1] < 10 && l.pvp > faixas.pvp[1]))
      )
        return false;
      if (
        l.roe !== null &&
        (l.roe < faixas.roe[0] || (faixas.roe[1] < 50 && l.roe > faixas.roe[1]))
      )
        return false;
      if (
        l.margemLiquida !== null &&
        (l.margemLiquida < faixas.margem[0] ||
          (faixas.margem[1] < 60 && l.margemLiquida > faixas.margem[1]))
      )
        return false;
      return true;
    });
  }, [linhas, favoritos, termo, setores, subsetor, segmento, faixas]);

  // Histórico apenas das ações visíveis, para não sobrecarregar as fontes.
  const [historico, setHistorico] = useState(new Map<string, HistoricoAcao>());

  const ordenadasBase = useMemo(() => {
    const copia = [...filtradas];
    copia.sort((a, b) => {
      const va = valorOrdem(a, historico.get(a.ticker), ordem.coluna);
      const vb = valorOrdem(b, historico.get(b.ticker), ordem.coluna);
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
  }, [filtradas, ordem, historico]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadasBase.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaAtual * porPagina;
  const visiveis = ordenadasBase.slice(inicio, inicio + porPagina);

  // Indicadores históricos: só das ações na viewport, em um único lote por
  // rodada, sem repetir pedidos já atendidos ou em voo.
  const [naTela, setNaTela] = useState<string[]>([]);
  const pedidos = useRef(new Set<string>());
  const aoVisiveis = useCallback((tickers: string[]) => setNaTela(tickers), []);
  const chaveNaTela = useValorAtrasado(naTela.join(","), 350);

  const lote = useMemo(() => {
    const lista = chaveNaTela ? chaveNaTela.split(",") : [];
    const pendentes: string[] = [];
    for (const t of lista) {
      if (!t || historico.has(t) || pedidos.current.has(t) || pendentes.includes(t)) continue;
      pendentes.push(t);
      if (pendentes.length >= 30) break;
    }
    return pendentes;
  }, [chaveNaTela, historico]);

  useEffect(() => {
    for (const t of lote) pedidos.current.add(t);
  }, [lote]);

  const historicoQuery = useQuery({
    queryKey: ["acoes", "historico", lote.join(",")],
    queryFn: () => historicoAcoesGrade({ data: { tickers: lote } }),
    enabled: lote.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!historicoQuery.data?.length) return;
    setHistorico((atual) => {
      const mapa = new Map(atual);
      for (const h of historicoQuery.data) mapa.set(h.ticker, h);
      return mapa;
    });
  }, [historicoQuery.data]);

  useEffect(() => {
    setPagina(0);
  }, [termo, setores, subsetor, segmento, faixas, porPagina, ranking]);

  const aoOrdenar = useCallback((c: OrdemColunaAcao) => {
    setOrdem((atual) =>
      atual.coluna === c ? { coluna: c, desc: !atual.desc } : { coluna: c, desc: true },
    );
  }, []);

  const aoSelecionar = useCallback((t: string) => {
    setSelecionados((atual) =>
      atual.includes(t) ? atual.filter((x) => x !== t) : atual.length >= 4 ? atual : [...atual, t],
    );
  }, []);

  const trocarRanking = (r: RankingAcao) => {
    setRanking(r);
    setOrdem(ORDEM_RANKING[r]);
    if (r === "dy") setFaixas((f) => ({ ...f, dy: [0.1, f.dy[1]] }));
  };

  const limpar = () => {
    setSetores([]);
    setSubsetor("todos");
    setSegmento("todos");
    setFaixas(FAIXAS_ACAO_PADRAO);
    setBuscaLocal("");
    setRanking("valorMercado");
    setOrdem(ORDEM_RANKING.valorMercado);
  };

  const liquidas = filtradas.filter((l) => (l.liquidez ?? 0) > 1_000_000);
  const comDia = liquidas.filter((l) => l.variacaoPercent !== null);
  const maiorAlta = comDia.reduce<LinhaAcao | null>(
    (m, l) => (!m || (l.variacaoPercent ?? 0) > (m.variacaoPercent ?? 0) ? l : m),
    null,
  );
  const maiorBaixa = comDia.reduce<LinhaAcao | null>(
    (m, l) => (!m || (l.variacaoPercent ?? 0) < (m.variacaoPercent ?? 0) ? l : m),
    null,
  );
  const maiorDy = liquidas
    .filter((l) => l.dy12 !== null && l.dy12 < 30)
    .reduce<LinhaAcao | null>((m, l) => (!m || (l.dy12 ?? 0) > (m.dy12 ?? 0) ? l : m), null);

  const linhasComparadas = selecionados
    .map((t) => linhas.find((l) => l.ticker === t))
    .filter((l): l is LinhaAcao => Boolean(l));

  const painelFiltros = (
    <FiltrosAcoes
      ranking={ranking}
      aoTrocarRanking={trocarRanking}
      setores={setores}
      aoAlternarSetor={(s) => {
        setSetores((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
        setSubsetor("todos");
        setSegmento("todos");
      }}
      subsetor={subsetor}
      aoTrocarSubsetor={(s) => {
        setSubsetor(s);
        setSegmento("todos");
      }}
      subsetores={subsetores}
      segmento={segmento}
      aoTrocarSegmento={setSegmento}
      segmentos={segmentos}
      faixas={faixas}
      aoTrocarFaixas={setFaixas}
      aoLimpar={limpar}
      total={filtradas.length}
    />
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="pilha-secao pb-20">
        <ResumoAcoes
          ibovespa={grade.data?.ibovespa ?? null}
          maiorAlta={maiorAlta}
          maiorBaixa={maiorBaixa}
          maiorDy={maiorDy}
          aoSelecionar={setDetalhe}
        />

        <Panel
          title="Todas as ações listadas na B3"
          hint={
            grade.data
              ? `${linhas.length.toLocaleString("pt-BR")} papéis monitorados · preços ${
                  pregao.aberto ? "ao vivo durante o pregão" : "do último fechamento"
                }${grade.data.parcial ? " · alguns indicadores indisponíveis no momento" : ""}`
              : "Carregando a base completa de ações…"
          }
          bodyClassName="p-0"
          action={
            <div className="flex flex-wrap items-center gap-bloco">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={buscaLocal}
                  onChange={(e) => setBuscaLocal(e.target.value)}
                  placeholder="Filtrar por ticker, empresa…"
                  aria-label="Buscar ação"
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
                    <SheetTitle>Filtrar ações</SheetTitle>
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
                  className="w-[min(94vw,52rem)] overflow-hidden p-0"
                >
                  <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
                    <DropdownMenuLabel className="p-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Indicadores · {colunas.length}/{COLUNAS_ACAO.length}
                    </DropdownMenuLabel>
                    <div className="flex shrink-0 gap-3 text-xs">
                      <button
                        type="button"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault();
                          setColunas(COLUNAS_PADRAO);
                        }}
                      >
                        Padrão
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault();
                          setColunas([]);
                        }}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* chips compactos: cabem sem qualquer rolagem */}
                  <div className="flex flex-col gap-bloco px-4 pt-1 pb-4">
                    {GRUPOS_COLUNA.map((grupo) => (
                      <div key={grupo} className="flex flex-wrap items-center gap-1.5">
                        <span className="w-24 shrink-0 truncate text-[0.65rem] tracking-wide text-muted-foreground uppercase">
                          {grupo}
                        </span>
                        {COLUNAS_ACAO.filter((c) => c.grupo === grupo).map((c) => {
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
                    aoVivo.canal === "websocket"
                      ? "animate-pulse bg-primary"
                      : "bg-muted-foreground"
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
                aria-label="Atualizar cotações das ações"
              >
                <RefreshCw className={`size-4 ${grade.isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          }
        >
          <div className="hidden border-b border-border p-cartao lg:block">{painelFiltros}</div>

          <TabelaAcoes
            linhas={visiveis}
            historico={historico}
            colunas={colunas}
            ordem={ordem}
            aoOrdenar={aoOrdenar}
            favoritos={favoritos}
            aoFavoritar={alternar}
            posicoes={posicoes}
            selecionados={selecionados}
            aoSelecionar={aoSelecionar}
            aoAbrir={setDetalhe}
            carregando={grade.isLoading}
            inicioRanking={inicio}
            aoVisiveis={aoVisiveis}
          />

          {!grade.isLoading && !visiveis.length ? (
            <EstadoVazio
              icone={LineChart}
              titulo="Nenhuma ação encontrada"
              descricao="Nenhuma ação corresponde aos filtros aplicados. Ajuste os critérios ou limpe os filtros."
              acao={
                <Button variant="outline" size="sm" onClick={limpar}>
                  Limpar filtros
                </Button>
              }
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-bloco border-t border-border p-bloco text-sm">
            <span className="text-muted-foreground">
              Exibindo{" "}
              <strong className="text-foreground tabular-nums">
                {ordenadasBase.length ? inicio + 1 : 0}–
                {Math.min(inicio + porPagina, ordenadasBase.length)}
              </strong>{" "}
              de <strong className="text-foreground tabular-nums">{ordenadasBase.length}</strong>{" "}
              ações
            </span>
            <div className="flex items-center gap-2">
              <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v))}>
                <SelectTrigger className="h-8 w-[120px] text-xs" aria-label="Ações por página">
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

        <RodapeEducativoAcoes />

        {selecionados.length ? (
          <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(560px,calc(100%-2rem))] flex-wrap items-center gap-bloco rounded-xl border border-border bg-card/95 p-cartao shadow-lg backdrop-blur">
            <Star className="size-4 text-primary" aria-hidden />
            <span className="text-sm">
              <strong className="tabular-nums">{selecionados.length}</strong> selecionadas:{" "}
              <span className="text-muted-foreground">{selecionados.join(", ")}</span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setComparando(true)}
                disabled={selecionados.length < 2}
              >
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

        <ComparadorAcoes
          linhas={linhasComparadas}
          historico={historico}
          aberto={comparando}
          aoFechar={() => setComparando(false)}
        />

        <ModalAcao
          linha={detalhe}
          historico={detalhe ? historico.get(detalhe.ticker) : undefined}
          aberto={Boolean(detalhe)}
          aoFechar={() => setDetalhe(null)}
        />
      </div>
    </TooltipProvider>
  );
}
