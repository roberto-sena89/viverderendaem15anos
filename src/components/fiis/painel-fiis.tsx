import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  GitCompare,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { ResumoFiis } from "@/components/fiis/resumo-fiis";
import {
  FAIXAS_PADRAO,
  FiltrosFiis,
  type FaixasFii,
  type Ranking,
} from "@/components/fiis/filtros-fiis";
import { COLUNAS, TabelaFiis, type ColunaId, type Ordem, type OrdemColuna } from "@/components/fiis/tabela-fiis";
import { ComparadorFiis } from "@/components/fiis/comparador-fiis";
import { ModalFii } from "@/components/fiis/modal-fii";
import { RodapeEducativoFiis } from "@/components/fiis/rodape-educativo-fiis";
import { gradeFiis, historicoFiisGrade } from "@/lib/fiis.functions";
import type { HistoricoFii, LinhaFii, TipoFii } from "@/lib/fiis-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { useAtivos } from "@/lib/data";
import { estadoPregao } from "@/lib/cotacoes-tempo-real";
import { mesclarPrecos, useFiisAoVivo } from "@/lib/fiis-tempo-real";
import { useValorAtrasado } from "@/lib/fiis-virtualizacao";

const CHAVE_COLUNAS = "fiis:colunas";
const COLUNAS_PADRAO: ColunaId[] = ["patrimonio", "pvp", "dy12", "liquidez", "tipo", "var12m", "segmento"];
const TAMANHOS = [25, 50, 100];

const ORDEM_RANKING: Record<Ranking, Ordem> = {
  patrimonio: { coluna: "patrimonio", desc: true },
  dy: { coluna: "dy12", desc: true },
  queridos: { coluna: "liquidez", desc: true },
  liquidez: { coluna: "liquidez", desc: true },
  pvp: { coluna: "pvp", desc: false },
  var12m: { coluna: "var12m", desc: true },
};

function valorOrdem(l: LinhaFii, h: HistoricoFii | undefined, c: OrdemColuna): number | string | null {
  switch (c) {
    case "ticker":
      return l.ticker;
    case "tipo":
      return l.tipo;
    case "segmento":
      return l.segmento;
    case "dy5a":
      return h?.dy5a ?? null;
    case "var12m":
      return h?.var12m ?? null;
    case "var24m":
      return h?.var24m ?? null;
    case "var60m":
      return h?.var60m ?? null;
    default:
      return (l as unknown as Record<string, number | null>)[c] ?? null;
  }
}

type Props = { intervaloMs: number; busca: string; apenasFavoritos: boolean };

/** Grade completa dos FIIs listados na B3, com filtros, comparador e tempo real. */
export function PainelFiis({ intervaloMs, busca, apenasFavoritos }: Props) {
  const [buscaLocal, setBuscaLocal] = useState("");
  const [ranking, setRanking] = useState<Ranking>("patrimonio");
  const [tipos, setTipos] = useState<TipoFii[]>([]);
  const [segmento, setSegmento] = useState("todos");
  const [faixas, setFaixas] = useState<FaixasFii>(FAIXAS_PADRAO);
  const [ordem, setOrdem] = useState<Ordem>(ORDEM_RANKING.patrimonio);
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(50);
  const [colunas, setColunas] = useState<ColunaId[]>(COLUNAS_PADRAO);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [comparando, setComparando] = useState(false);
  const [detalhe, setDetalhe] = useState<LinhaFii | null>(null);
  const [pregao, setPregao] = useState(() => estadoPregao());

  const { favoritos, alternar } = useFavoritos();
  const { data: ativos = [] } = useAtivos();

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE_COLUNAS);
      if (bruto) {
        const lista = JSON.parse(bruto) as ColunaId[];
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

  const alternarColuna = (id: ColunaId) => {
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
  const aoVivo = useFiisAoVivo(intervaloMs > 0, pregao.aberto);

  const grade = useQuery({
    queryKey: ["fiis", "grade"],
    queryFn: () => gradeFiis({ data: {} }),
    // Fallback: 15s no pregão quando o WebSocket não está disponível.
    refetchInterval: aoVivo.intervaloPolling > 0 ? aoVivo.intervaloPolling : false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const linhas = useMemo(
    () => mesclarPrecos(grade.data?.linhas ?? [], aoVivo.precos),
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

  const termo = `${busca} ${buscaLocal}`.trim().toLowerCase();

  const filtradas = useMemo(() => {
    return linhas.filter((l) => {
      if (apenasFavoritos && !favoritos.includes(l.ticker)) return false;
      if (termo && !`${l.ticker} ${l.nome}`.toLowerCase().includes(termo)) return false;
      if (tipos.length && !tipos.includes(l.tipo)) return false;
      if (segmento !== "todos" && l.segmento !== segmento) return false;
      if (l.dy12 !== null && (l.dy12 < faixas.dy[0] || (faixas.dy[1] < 30 && l.dy12 > faixas.dy[1]))) return false;
      if (l.pvp !== null && (l.pvp < faixas.pvp[0] || (faixas.pvp[1] < 3 && l.pvp > faixas.pvp[1]))) return false;
      const liqMi = (l.liquidez ?? 0) / 1e6;
      if (liqMi < faixas.liquidez[0] || (faixas.liquidez[1] < 20 && liqMi > faixas.liquidez[1])) return false;
      return true;
    });
  }, [linhas, apenasFavoritos, favoritos, termo, tipos, segmento, faixas]);

  // Histórico apenas da página visível, para não sobrecarregar as fontes.
  const [historico, setHistorico] = useState(new Map<string, HistoricoFii>());

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

  // Indicadores históricos: só dos fundos que estão na viewport, agrupados em
  // um único lote por rodada e nunca repetidos (cache local + guarda de voo).
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
    queryKey: ["fiis", "historico", lote.join(",")],
    queryFn: () => historicoFiisGrade({ data: { tickers: lote } }),
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
  }, [termo, tipos, segmento, faixas, apenasFavoritos, porPagina, ranking]);

  const aoOrdenar = useCallback((c: OrdemColuna) => {
    setOrdem((atual) => (atual.coluna === c ? { coluna: c, desc: !atual.desc } : { coluna: c, desc: true }));
  }, []);

  const aoSelecionar = useCallback((t: string) => {
    setSelecionados((atual) =>
      atual.includes(t) ? atual.filter((x) => x !== t) : atual.length >= 4 ? atual : [...atual, t],
    );
  }, []);

  const trocarRanking = (r: Ranking) => {
    setRanking(r);
    setOrdem(ORDEM_RANKING[r]);
    if (r === "queridos") setFaixas((f) => ({ ...f, liquidez: [1, f.liquidez[1]] }));
  };

  const limpar = () => {
    setTipos([]);
    setSegmento("todos");
    setFaixas(FAIXAS_PADRAO);
    setBuscaLocal("");
    setRanking("patrimonio");
    setOrdem(ORDEM_RANKING.patrimonio);
  };

  const comDia = filtradas.filter((l) => l.variacaoPercent !== null);
  const maiorAlta = comDia.reduce<LinhaFii | null>(
    (m, l) => (!m || (l.variacaoPercent ?? 0) > (m.variacaoPercent ?? 0) ? l : m),
    null,
  );
  const maiorBaixa = comDia.reduce<LinhaFii | null>(
    (m, l) => (!m || (l.variacaoPercent ?? 0) < (m.variacaoPercent ?? 0) ? l : m),
    null,
  );
  const maiorDy = filtradas
    .filter((l) => l.dy12 !== null && l.dy12 < 40 && (l.liquidez ?? 0) > 200_000)
    .reduce<LinhaFii | null>((m, l) => (!m || (l.dy12 ?? 0) > (m.dy12 ?? 0) ? l : m), null);

  const linhasComparadas = selecionados
    .map((t) => linhas.find((l) => l.ticker === t))
    .filter((l): l is LinhaFii => Boolean(l));

  const painelFiltros = (
    <FiltrosFiis
      ranking={ranking}
      aoTrocarRanking={trocarRanking}
      tipos={tipos}
      aoAlternarTipo={(t) => setTipos((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]))}
      segmento={segmento}
      aoTrocarSegmento={setSegmento}
      faixas={faixas}
      aoTrocarFaixas={setFaixas}
      aoLimpar={limpar}
      total={filtradas.length}
    />
  );

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4 pb-20">
      <ResumoFiis
        ifix={grade.data?.ifix ?? null}
        maiorAlta={maiorAlta}
        maiorBaixa={maiorBaixa}
        maiorDy={maiorDy}
        aoSelecionar={setDetalhe}
      />

      <Panel
        title="Fundos imobiliários listados na B3"
        hint={
          grade.data
            ? `${linhas.length.toLocaleString("pt-BR")} fundos monitorados · preços ${
                pregao.aberto ? "ao vivo durante o pregão" : "do último fechamento"
              }${grade.data.parcial ? " · alguns indicadores indisponíveis no momento" : ""}`
            : "Carregando a base completa de fundos…"
        }
        bodyClassName="p-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buscaLocal}
                onChange={(e) => setBuscaLocal(e.target.value)}
                placeholder="Filtrar por ticker, nome…"
                aria-label="Buscar fundo imobiliário"
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
                  <SheetTitle>Filtrar fundos</SheetTitle>
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
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Exibir indicadores</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="space-y-1 p-1">
                  {COLUNAS.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={colunas.includes(c.id)}
                        onCheckedChange={() => alternarColuna(c.id)}
                        aria-label={c.rotulo}
                      />
                      {c.rotulo}
                    </label>
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
              aria-label="Atualizar cotações dos FIIs"
            >
              <RefreshCw className={`size-4 ${grade.isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>

          </div>
        }
      >
        <div className="hidden border-b border-border p-4 lg:block">{painelFiltros}</div>

        <TabelaFiis
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
        />

        {!grade.isLoading && !visiveis.length ? (
          <p className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Building2 className="size-6" aria-hidden />
            Nenhum fundo corresponde aos filtros aplicados.
            <Button variant="outline" size="sm" onClick={limpar}>
              Limpar filtros
            </Button>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 text-sm">
          <span className="text-muted-foreground">
            Exibindo{" "}
            <strong className="text-foreground tabular-nums">
              {ordenadasBase.length ? inicio + 1 : 0}–{Math.min(inicio + porPagina, ordenadasBase.length)}
            </strong>{" "}
            de <strong className="text-foreground tabular-nums">{ordenadasBase.length}</strong> fundos
          </span>
          <div className="flex items-center gap-2">
            <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v))}>
              <SelectTrigger className="h-8 w-[110px] text-xs" aria-label="Fundos por página">
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

      <RodapeEducativoFiis />

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
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setSelecionados([])} aria-label="Limpar seleção">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <ComparadorFiis
        linhas={linhasComparadas}
        historico={historico}
        aberto={comparando}
        aoFechar={() => setComparando(false)}
      />

      <ModalFii
        linha={detalhe}
        historico={detalhe ? historico.get(detalhe.ticker) : undefined}
        aberto={Boolean(detalhe)}
        aoFechar={() => setDetalhe(null)}
      />
    </div>
    </TooltipProvider>
  );
}
