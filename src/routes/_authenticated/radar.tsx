/**
 * Radar de Oportunidades — triagem de todas as Ações e FIIs da B3.
 *
 * Compara o preço atual com a própria história (desde o lançamento) e cruza
 * com notícias de alto impacto para sugerir comprar / manter / vender, com
 * briefing executivo, contexto macro e o veredito do Técnico IA.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { AbasMercado } from "@/components/abas-mercado";
import { AppShell } from "@/components/app-shell";
import { TabelaRadar } from "@/components/radar/tabela-radar";
import { RankingRadar } from "@/components/radar/ranking-radar";
import { ModalRadar } from "@/components/radar/modal-radar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { aplicarPosicoes, useRadarPosicoes, useRadarVisao } from "@/lib/radar";
import { radarAnaliseIA, radarCompletarCache, radarVisao } from "@/lib/radar.functions";
import { AVISO_DIA_PCT } from "@/lib/radar-base";
import { exportarRadar, type FormatoExportacaoRadar } from "@/lib/radar-exportacao";
import { useAtivos } from "@/lib/data";
import type { LinhaRadarBase } from "@/lib/radar.server";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Download,
  
  Loader2,
  Radar,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/radar")({
  // Pré-busca a visão de Ações antes da pintura: na primeira visita o SSR
  // monta o HTML já com os dados (sem skeleton), e nas navegações seguintes
  // o router reusa o cache do TanStack Query enquanto estiver fresco.
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["radar", "visao", "acao"],
      queryFn: () => radarVisao({ data: { categoria: "acao" } }),
      staleTime: 3 * 60 * 1000,
    });
    // Aquece a visão de FIIs em segundo plano (sem bloquear a pintura): na
    // primeira visita a aba FIIs esbarra em grade fria (~10s no isolado);
    // com SWR aquecido ela responde quase de imediato ao trocar de aba.
    void radarVisao({ data: { categoria: "fii" } })
      .then(() => undefined)
      .catch(() => undefined);
  },
  head: () => ({
    meta: [
      { title: "Radar de Oportunidades · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Triagem de todas as ações e FIIs da B3: posição do preço na própria história, janela de 52 semanas, dividend yield, notícias de alto impacto e veredito do Técnico IA.",
      },
      {
        property: "og:title",
        content: "Radar de Oportunidades · Investidor em 15 Anos",
      },
      {
        property: "og:description",
        content:
          "Sugestões de compra nas mínimas históricas e alertas de venda em choques — sempre com base em dados, nunca em promessas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/radar" }],
  }),
  component: PaginaRadar,
});

const TAMANHO_PAGINA = 50;

/** Percentil máximo para o ativo entrar no "foco de compra" do topo. */
const FOCO_COMPRA_PERCENTIL_MAX = 45;
/** Tamanho do lote de análises do Técnico IA (top pelo score). */
const ALVO_LOTE_IA = 20;
const TOP_ALERTAS = 5;

/** Top N de um critério (maior ou menor) — ativos sem valor ficam fora. */
function topPorCritério<T>(
  lista: T[],
  obter: (item: T) => number | null,
  sentido: "maior" | "menor",
  n: number,
): T[] {
  return lista
    .filter((item) => obter(item) !== null)
    .sort((a, b) => {
      const va = obter(a) as number;
      const vb = obter(b) as number;
      return sentido === "maior" ? vb - va : va - vb;
    })
    .slice(0, n);
}

type Ordenacao = "sinal" | "dy" | "queda" | "minima52" | "score";
type FiltroSinal = "todos" | "comprar" | "manter" | "vender" | "observar" | "sem-dados";

const PESO_SINAL: Record<string, number> = {
  comprar: 0,
  observar: 1,
  vender: 2,
  manter: 3,
  "sem-dados": 4,
};

const ROTULOS_SINAL_FILTRO: Record<FiltroSinal, string> = {
  todos: "Todos os sinais",
  comprar: "Comprar",
  observar: "Observar",
  vender: "Vender",
  manter: "Manter",
  "sem-dados": "Sem dados",
};

/** Números de página com elipses: 1 … 3 4 5 … 20 (máx. 7 itens vislumbrado). */
function paginasNumeradas(total: number, atual: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const itens: (number | "…")[] = [1];
  if (atual > 3) itens.push("…");
  const inicio = Math.max(2, atual - 1);
  const fim = Math.min(total - 1, atual + 1);
  for (let p = inicio; p <= fim; p++) itens.push(p);
  if (atual < total - 2) itens.push("…");
  itens.push(total);
  return itens;
}

function PaginaRadar() {
  const [categoria, setCategoria] = useState<"acao" | "fii">("acao");
  const [abaVisao, setAbaVisao] = useState<"cotacoes" | "ranking">("ranking");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordenacao>("sinal");
  const [direcao, setDirecao] = useState<"desc" | "asc">("desc");
  const [filtroSinal, setFiltroSinal] = useState<FiltroSinal>("todos");
  const [filtroSetor, setFiltroSetor] = useState("todos");
  const [apenasPosicao, setApenasPosicao] = useState(false);
  const [apenasMinimas52, setApenasMinimas52] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [selecionado, setSelecionado] = useState<LinhaRadarBase | null>(null);
  const [exportando, setExportando] = useState(false);
  const [lote, setLote] = useState<{
    ativo: boolean;
    processados: number;
    total: number;
    atual: string;
  } | null>(null);

  const analisar = useServerFn(radarAnaliseIA);

  const { data: visao, isPending, isError, isFetching, refetch } = useRadarVisao(categoria);
  const queryClient = useQueryClient();
  const completar = useServerFn(radarCompletarCache);
  const [preenchimento, setPreenchimento] = useState<{
    ativo: boolean;
    obtidos: number;
    faltam: number;
  } | null>(null);
  const tentouPagina = useRef(false);
  const categoriaAtual = useRef(categoria);
  useEffect(() => {
    categoriaAtual.current = categoria;
  }, [categoria]);
  const { data: ativos = [] } = useAtivos();
  const carteiraPorTicker = useMemo(
    () =>
      new Map(
        ativos.map((a) => [
          a.ticker.trim().toUpperCase(),
          Number.isFinite(a.quantidade) ? a.quantidade : 0,
        ]),
      ),
    [ativos],
  );

  const linhasFiltradas = useMemo(() => {
    const base = visao?.linhas ?? [];
    const termo = busca
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return base.filter((l) => {
      if (filtroSinal !== "todos" && l.sinal.tipo !== filtroSinal) return false;
      if (filtroSetor !== "todos" && (l.setor ?? "") !== filtroSetor) return false;
      if (apenasPosicao && !l.posicao) return false;
      if (
        apenasMinimas52 &&
        (l.posicao?.distMinima52sPct === null ||
          l.posicao?.distMinima52sPct === undefined ||
          l.posicao.distMinima52sPct > 5)
      ) {
        return false;
      }
      if (!termo) return true;
      return `${l.ticker} ${l.nome} ${l.tipo ?? ""} ${l.setor ?? ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(termo);
    });
  }, [visao, busca, filtroSinal, filtroSetor, apenasPosicao, apenasMinimas52]);

  const setoresDisponiveis = useMemo(
    () => [...new Set((visao?.linhas ?? []).map((l) => l.setor).filter(Boolean) as string[])],
    [visao],
  );

  const totalPaginas = Math.max(1, Math.ceil(linhasFiltradas.length / TAMANHO_PAGINA));
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
  const inicioPagina = (paginaSegura - 1) * TAMANHO_PAGINA;
  const linhasDaPagina = linhasFiltradas.slice(inicioPagina, inicioPagina + TAMANHO_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [busca, filtroSinal, filtroSetor, apenasPosicao, apenasMinimas52, categoria]);

  const { posicoes, sparklines, carregando } = useRadarPosicoes(
    linhasDaPagina.map((l) => l.ticker),
    true,
  );

  const linhasCompletas = useMemo(
    () => aplicarPosicoes(linhasDaPagina, posicoes),
    [linhasDaPagina, posicoes],
  );

  const faltandoPagina = useMemo(
    () => linhasCompletas.filter((l) => !l.posicao).length,
    [linhasCompletas],
  );

  /** Preenche em lotes o histórico faltante do universo; retorna true se concluiu.
   *  A passagem automática cobre o universo da categoria (4–10 rodadas de 120,
   *  proporcional ao total) para não saturar o isolate e a fila compartilhada
   *  do Yahoo enquanto a página ainda carrega; o manual vai até 12. */
  const preencherHistoricos = async (manual: boolean) => {
    if (preenchimento?.ativo) return;
    // Categoria capturada no início: se o usuário trocar de aba durante o
    // preenchimento, os lotes continuam no universo certo.
    const alvo = categoriaAtual.current;
    setPreenchimento({ ativo: true, obtidos: 0, faltam: 0 });
    let faltam = 0;
    let obtidos = 0;
    try {
      const universo = visao?.contagem?.total ?? 0;
      const rodadas = manual ? 12 : Math.min(10, Math.max(4, Math.ceil(universo / 120)));
      for (let i = 0; i < rodadas; i++) {
        const r = await completar({ data: { categoria: alvo, limite: 120 } });
        if (!r || r.faltam <= 0) {
          faltam = r?.faltam ?? 0;
          break;
        }
        faltam = r.faltam;
        obtidos += r.obtidos;
        setPreenchimento({ ativo: i < rodadas - 1, obtidos, faltam });
      }
      if (manual) {
        if (faltam > 0)
          toast.info(`Histórico em andamento: ${faltam.toLocaleString("pt-BR")} pendentes.`);
        else toast.success("Histórico da B3 totalmente preenchido.");
      }
    } catch {
      if (manual) toast.error("Não foi possível preencher o histórico agora.");
    } finally {
      setPreenchimento((s) => (s ? { ...s, ativo: false } : s));
      void refetch();
    }
  };

  /* Aviso da página: algo ficou sem histórico → uma tentativa automática. */
  useEffect(() => {
    tentouPagina.current = false;
  }, [categoria, pagina]);

  useEffect(() => {
    if (carregando || faltandoPagina === 0 || tentouPagina.current) return;
    tentouPagina.current = true;
    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ["radar", "posicoes"] });
    }, 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando, faltandoPagina, categoria, pagina]);

  /* Preenchimento automático do universo, uma vez por categoria nesta sessão.
   *  Espera a visão carregar para dimensionar as rodadas pelo total real
   *  (FIIs: ~858 ativos; Ações: ~400+). */
  useEffect(() => {
    if (!visao?.contagem?.total) return;
    const chave = `radar:backfill:${categoria}`;
    if (typeof sessionStorage === "undefined" || sessionStorage.getItem(chave) === "1") return;
    sessionStorage.setItem(chave, "1");
    void preencherHistoricos(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, visao?.contagem?.total]);

  const ordenadas = useMemo(() => {
    const q = [...linhasCompletas];
    const fator = direcao === "asc" ? -1 : 1;
    switch (ordem) {
      case "dy":
        return q.sort((a, b) => fator * ((b.dy12 ?? -1) - (a.dy12 ?? -1)));
      case "queda":
        return q.sort((a, b) => fator * ((a.variacaoDia ?? 0) - (b.variacaoDia ?? 0)));
      case "minima52":
        return q.sort((a, b) => {
          const da = a.posicao?.distMinima52sPct ?? 999;
          const db = b.posicao?.distMinima52sPct ?? 999;
          return fator * (da - db);
        });
      case "score":
        return q.sort((a, b) => {
          const sa = a.score ?? -1;
          const sb = b.score ?? -1;
          if (sa !== sb) return fator * (sb - sa);
          return fator * ((b.posicao?.percentil ?? 101) - (a.posicao?.percentil ?? 101));
        });
      default:
        return q.sort((a, b) => {
          const d = (PESO_SINAL[a.sinal.tipo] ?? 4) - (PESO_SINAL[b.sinal.tipo] ?? 4);
          if (d !== 0) return fator * d;
          return fator * ((b.posicao?.percentil ?? 101) - (a.posicao?.percentil ?? 101));
        });
    }
  }, [linhasCompletas, ordem, direcao]);

  /** Foco de compra: melhores relações preço/história do universo inteiro. */
  const focoCompra = useMemo(() => {
    const base = visao?.linhas ?? [];
    const candidatas = base.filter(
      (l) =>
        (l.sinal.tipo === "comprar" || l.sinal.tipo === "observar") &&
        l.posicao != null &&
        l.posicao.percentil !== null &&
        l.posicao.percentil <= FOCO_COMPRA_PERCENTIL_MAX,
    );
    return topPorCritério(candidatas, (l) => l.posicao?.percentil ?? null, "menor", TOP_ALERTAS);
  }, [visao]);

  /** Alerta de venda: choque do dia ou notícia urgente associada. */
  const alertaVenda = useMemo(() => {
    const base = visao?.linhas ?? [];
    const candidatas = base.filter(
      (l) =>
        l.sinal.tipo === "vender" || (l.variacaoDia !== null && l.variacaoDia <= AVISO_DIA_PCT),
    );
    return topPorCritério(candidatas, (l) => l.variacaoDia ?? 0, "menor", TOP_ALERTAS);
  }, [visao]);

  /** Melhores oportunidades pelo score composto (0–100). */
  const melhoresScore = useMemo(
    () => topPorCritério(visao?.linhas ?? [], (l) => l.score, "maior", TOP_ALERTAS),
    [visao],
  );

  const exportarVisao = async (formato: FormatoExportacaoRadar) => {
    try {
      setExportando(true);
      // Busca todas as posições para garantir que o export tenha o histórico completo
      const tickersTodos = linhasFiltradas.map((l) => l.ticker);
      const { radarPosicoesLote } = await import("@/lib/radar.functions");
      const { posicoes: todasPosicoes } = await radarPosicoesLote({ data: { tickers: tickersTodos } });
      const completas = aplicarPosicoes(linhasFiltradas, todasPosicoes);
      
      await exportarRadar(formato, completas, categoria);
      toast.success(`Radar exportado em ${formato.toUpperCase()}.`);
    } catch {
      toast.error("Não foi possível exportar o radar agora.");
    } finally {
      setExportando(false);
    }
  };

  /** Lote do Técnico IA: analisa o top 20 pelo score (2 análises em paralelo). */
  const analisarLote = async () => {
    const visaoAtual = visao;
    if (!visaoAtual) return;
    const alvo = topPorCritério(visaoAtual.linhas, (l) => l.score, "maior", ALVO_LOTE_IA);
    if (!alvo.length) {
      toast.info("Nenhum ativo com score disponível para analisar.");
      return;
    }
    if (lote?.ativo) return;
    setLote({ ativo: true, processados: 0, total: alvo.length, atual: "" });
    let falhas = 0;
    const fila = [...alvo];
    const trabalhador = async () => {
      while (fila.length) {
        const l = fila.shift()!;
        setLote((s) => (s ? { ...s, atual: l.ticker } : s));
        try {
          await analisar({ data: { ticker: l.ticker } });
        } catch {
          falhas++;
        }
        setLote((s) => (s ? { ...s, processados: s.processados + 1 } : s));
      }
    };
    await Promise.all([trabalhador(), trabalhador()]);
    setLote(null);
    toast.success(
      `Lote concluído: ${alvo.length - falhas} ativos analisados${falhas ? `, ${falhas} com falha` : ""}.`,
    );
  };

  return (
    <AppShell
      title="Radar de Oportunidades"
      description="Todas as ações e FIIs da B3 comparados com a própria história — mínimas indicam oportunidade, choques exigem cautela."
    >
      <AbasMercado />


      <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Tabs
            value={categoria}
            onValueChange={(v) => {
              setCategoria(v as "acao" | "fii");
              setFiltroSetor("todos");
            }}
          >
            <TabsList>
              <TabsTrigger value="acao">Ações</TabsTrigger>
              <TabsTrigger value="fii">FIIs</TabsTrigger>
            </TabsList>
          </Tabs>
          {visao ? (
            <Badge variant="secondary" className="h-7 gap-1.5 px-2.5 text-xs font-normal">
              {visao.contagem.total.toLocaleString("pt-BR")}
              <span className="text-muted-foreground">
                {categoria === "acao" ? "ações" : "FIIs"} comparados
              </span>
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Atualizar dados do radar"
            title="Atualizar dados do radar"
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2" disabled={exportando}>
                {exportando ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4 shrink-0" aria-hidden />
                )}
                {exportando ? "Processando..." : "Exportar"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Visão filtrada ({linhasFiltradas.length} ativos)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void exportarVisao("csv")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportarVisao("xlsx")}>
                Excel (XLSX)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportarVisao("pdf")}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={() => void analisarLote()}
            disabled={lote?.ativo ?? false}
            title="Analisa o top 20 pelo score do Técnico IA (usado também para o histórico de cada ativo)."
          >
            {lote?.ativo ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4 shrink-0" aria-hidden />
            )}
            {lote?.ativo
              ? `${lote.atual || "…"} ${lote.processados}/${lote.total}`
              : "Analisar top 20 com IA"}
          </Button>
        </div>
      </header>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="mb-3 text-muted-foreground">Não foi possível montar o radar agora.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : visao ? (
        abaVisao === "ranking" ? (
          <RankingRadar
            linhas={aplicarPosicoes(linhasFiltradas, posicoes)}
            carteira={carteiraPorTicker}
            categoria={categoria}
            totalUniverso={visao.contagem.total}
            baseEm={visao.baseEm}
            atualizadoEm={visao.atualizado}
            aoTrocarCategoria={(c) => {
              setCategoria(c);
              setFiltroSetor("todos");
            }}
            aoSelecionar={setSelecionado}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <ResumoCard rotulo="Total de ativos" valor={String(visao.contagem.total)} />
              <ResumoCard
                rotulo="Sinal de compra"
                valor={String(visao.contagem.comprar)}
                cor="text-emerald-600"
              />
              <ResumoCard
                rotulo="Alertas de venda"
                valor={String(alertaVenda.length)}
                cor="text-red-600"
              />
              <ResumoCard
                rotulo="Nas mínimas 52s"
                valor={String(visao.contagem.minimas52)}
                cor="text-sky-600"
              />
              <ResumoCard
                rotulo="Com posição histórica"
                valor={`${visao.contagem.comPosicao}/${visao.contagem.total}`}
              />
              <ResumoCard
                rotulo="Base fundamentalista"
                valor={visao.baseEm ? new Date(visao.baseEm).toLocaleDateString("pt-BR") : "—"}
              />
            </div>

            {visao.macro.selic !== null || visao.macro.ipca !== null ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Contexto macro:</span>
                {visao.macro.selic !== null ? (
                  <Badge variant="secondary">
                    Meta Selic: {visao.macro.selic.toLocaleString("pt-BR")}%
                  </Badge>
                ) : null}
                {visao.macro.ipca !== null ? (
                  <Badge variant="secondary">
                    IPCA mensal: {visao.macro.ipca.toLocaleString("pt-BR")}%
                  </Badge>
                ) : null}
              </div>
            ) : null}

            {visao.noticiasUrgentes.length ? (
              <div className="rounded-xl border border-red-600/20 bg-red-600/5 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-600">
                  <Radar className="size-4" aria-hidden />
                  Notícias de alto impacto agora
                </h3>
                <ul className="space-y-1.5">
                  {visao.noticiasUrgentes.map((n) => (
                    <li key={n.id} className="text-sm">
                      <span className="font-medium">{n.titulo}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {n.fonte} ·{" "}
                        {new Date(n.publicadoEm).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {focoCompra.length || alertaVenda.length || melhoresScore.length ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {focoCompra.length ? (
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold text-emerald-600">
                      Foco de compra — nas mínimas da própria história
                    </h3>
                    <ul className="space-y-2">
                      {focoCompra.map((l) => (
                        <li key={l.ticker}>
                          <button
                            type="button"
                            onClick={() => setSelecionado(l)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                          >
                            <span className="font-medium">{l.ticker}</span>
                            <span className="text-xs text-muted-foreground">{l.nome}</span>
                            <span className="ml-auto text-xs tabular-nums text-emerald-600">
                              {l.posicao?.percentil?.toFixed(0) ?? "—"}% do range
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {melhoresScore.length ? (
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-sky-600">
                      <Sparkles className="size-4" aria-hidden />
                      Melhores oportunidades pelo score
                    </h3>
                    <ul className="space-y-2">
                      {melhoresScore.map((l) => (
                        <li key={l.ticker}>
                          <button
                            type="button"
                            onClick={() => setSelecionado(l)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                          >
                            <span className="font-medium">{l.ticker}</span>
                            <span className="text-xs text-muted-foreground">{l.nome}</span>
                            <span className="ml-auto text-xs font-semibold tabular-nums text-sky-600">
                              {l.score ?? "—"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {alertaVenda.length ? (
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold text-red-600">
                      Alertas de venda — choque ou deterioração no dia
                    </h3>
                    <ul className="space-y-2">
                      {alertaVenda.map((l) => (
                        <li key={l.ticker}>
                          <button
                            type="button"
                            onClick={() => setSelecionado(l)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                          >
                            <span className="font-medium">{l.ticker}</span>
                            <span className="text-xs text-muted-foreground">{l.nome}</span>
                            <span
                              className={`text-xs tabular-nums ${
                                l.variacaoDia !== null && l.variacaoDia < 0
                                  ? "text-red-600"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {l.variacaoDia?.toFixed(2).replace(".", ",") ?? "—"}%
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <section
              aria-label="Filtros do radar"
              className="w-full max-w-full overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60"
            >
              <div className="flex flex-col gap-4 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="relative min-w-0">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      placeholder="Buscar ativo (ex.: TASY3, Itaú)…"
                      value={busca}
                      onChange={(e) => {
                        setBusca(e.target.value);
                      }}
                      aria-label="Buscar ativo"
                      className="w-full min-w-0 pl-9"
                    />
                  </div>

                  <Select
                    value={filtroSinal}
                    onValueChange={(v) => setFiltroSinal(v as FiltroSinal)}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Sinal" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROTULOS_SINAL_FILTRO) as FiltroSinal[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {ROTULOS_SINAL_FILTRO[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {setoresDisponiveis.length ? (
                    <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder="Setor / Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os setores</SelectItem>
                        {setoresDisponiveis.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  <Select value={ordem} onValueChange={(v) => setOrdem(v as Ordenacao)}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sinal">Por sinal do radar</SelectItem>
                      <SelectItem value="score">Melhor score de oportunidade</SelectItem>
                      <SelectItem value="dy">Maior DY 12m</SelectItem>
                      <SelectItem value="queda">Maior queda do dia</SelectItem>
                      <SelectItem value="minima52">Mais perto da mín. 52s</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDirecao((d) => (d === "desc" ? "asc" : "desc"))}
                    title="Inverter a ordem da página"
                    aria-label={`Ordenar página: ${direcao === "desc" ? "decrescente" : "crescente"}`}
                    className="w-full justify-center whitespace-nowrap sm:w-auto"
                  >
                    {direcao === "desc" ? (
                      <ArrowDownWideNarrow className="mr-1 size-4 shrink-0" aria-hidden />
                    ) : (
                      <ArrowUpNarrowWide className="mr-1 size-4 shrink-0" aria-hidden />
                    )}
                    Ordenar
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                  {faltandoPagina > 0 ? (
                    <p className="min-w-0 text-xs text-muted-foreground">
                      {faltandoPagina} ativo{faltandoPagina > 1 ? "s" : ""} desta página
                      {carregando
                        ? " carregando histórico…"
                        : " ainda sem histórico — tentando novamente…"}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Página {paginaSegura}/{totalPaginas} — histórico próprio carregado
                    </span>
                  )}
                  {!preenchimento || preenchimento.faltam > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => void preencherHistoricos(true)}
                      disabled={preenchimento?.ativo ?? false}
                    >
                      {preenchimento?.ativo ? (
                        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                      ) : (
                        <DatabaseZap className="size-3.5 shrink-0" aria-hidden />
                      )}
                      {preenchimento?.ativo
                        ? preenchimento.obtidos > 0
                          ? `Preenchendo… ${preenchimento.obtidos} ok`
                          : "Preparando…"
                        : `Completar histórico de ${categoria === "acao" ? "ações" : "FIIs"}${
                            preenchimento && preenchimento.faltam > 0
                              ? ` (${preenchimento.faltam.toLocaleString("pt-BR")})`
                              : ""
                          }`}
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border/60 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden />
                    Refinar
                  </span>
                  <label className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
                    <Switch checked={apenasPosicao} onCheckedChange={setApenasPosicao} />
                    Com histórico
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
                    <Switch checked={apenasMinimas52} onCheckedChange={setApenasMinimas52} />
                    ≤5% da mín. 52s
                  </label>
                  <p className="ml-auto inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Radar className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">
                      Percentil 0 = menor preço histórico · 100 = maior
                    </span>
                  </p>
                </div>
              </div>
            </section>

            <TabelaRadar
              linhas={ordenadas}
              sparklines={sparklines}
              carteira={carteiraPorTicker}
              carregandoPosicoes={carregando}
              aoSelecionar={setSelecionado}
            />

            {totalPaginas > 1 ? (
              <nav
                aria-label="Paginação do radar"
                className="flex flex-col items-center gap-2 border-t border-border/60 pt-4"
              >
                <div className="flex flex-wrap items-center justify-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={paginaSegura <= 1}
                    onClick={() => setPagina(paginaSegura - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  {paginasNumeradas(totalPaginas, paginaSegura).map((item, i) =>
                    item === "…" ? (
                      <span
                        key={`elipse-${i}`}
                        aria-hidden
                        className="flex size-9 items-center justify-center text-muted-foreground"
                      >
                        …
                      </span>
                    ) : (
                      <Button
                        key={item}
                        type="button"
                        variant={item === paginaSegura ? "outline" : "ghost"}
                        size="icon"
                        onClick={() => setPagina(item)}
                        aria-current={item === paginaSegura ? "page" : undefined}
                        className={
                          item === paginaSegura
                            ? "border-emerald-600/50 font-semibold text-emerald-600"
                            : "text-muted-foreground"
                        }
                      >
                        {item}
                      </Button>
                    ),
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={paginaSegura >= totalPaginas}
                    onClick={() => setPagina(paginaSegura + 1)}
                    aria-label="Próxima página"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Página {paginaSegura} de {totalPaginas} ·{" "}
                  {linhasFiltradas.length.toLocaleString("pt-BR")} ativos
                </p>
              </nav>
            ) : null}

            <p className="text-xs text-muted-foreground">
              O Radar é educacional: usa apenas o histórico de preços (Yahoo Finance), a base
              fundamentalista diária, o feed público de notícias e o contexto macro do Banco
              Central. Não constitui recomendação de investimento — cada decisão é sua.
            </p>
          </>
        )
      ) : null}

      <ModalRadar
        linha={selecionado}
        aberto={Boolean(selecionado)}
        aoFechar={() => setSelecionado(null)}
      />
    </AppShell>
  );
}

function ResumoCard({
  rotulo,
  valor,
  cor = "text-foreground",
}: {
  rotulo: string;
  valor: string;
  cor?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${cor}`}>{valor}</p>
    </div>
  );
}
