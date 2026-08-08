/**
 * Radar de Oportunidades — triagem de todas as Ações e FIIs da B3.
 *
 * Compara o preço atual com a própria história (desde o lançamento) e cruza
 * com notícias de alto impacto para sugerir comprar / manter / vender, com
 * briefing executivo, contexto macro e o veredito do Técnico IA.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TabelaRadar } from "@/components/radar/tabela-radar";
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
import { aplicarPosicoes, useRadarPosicoes, useRadarVisao } from "@/lib/radar";
import type { LinhaRadarBase } from "@/lib/radar.server";
import { Radar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/radar")({
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

type Ordenacao = "sinal" | "dy" | "queda" | "minima52";
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

function PaginaRadar() {
  const [categoria, setCategoria] = useState<"acao" | "fii">("acao");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordenacao>("sinal");
  const [filtroSinal, setFiltroSinal] = useState<FiltroSinal>("todos");
  const [filtroSetor, setFiltroSetor] = useState("todos");
  const [apenasPosicao, setApenasPosicao] = useState(false);
  const [apenasMinimas52, setApenasMinimas52] = useState(false);
  const [visiveis, setVisiveis] = useState(TAMANHO_PAGINA);
  const [selecionado, setSelecionado] = useState<LinhaRadarBase | null>(null);

  const { data: visao, isPending, isError, refetch } = useRadarVisao(categoria);

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

  const { posicoes, carregando } = useRadarPosicoes(
    linhasFiltradas.slice(0, visiveis).map((l) => l.ticker),
    true,
  );

  const linhasCompletas = useMemo(
    () => aplicarPosicoes(linhasFiltradas.slice(0, visiveis), posicoes),
    [linhasFiltradas, visiveis, posicoes],
  );

  const ordenadas = useMemo(() => {
    const q = [...linhasCompletas];
    switch (ordem) {
      case "dy":
        return q.sort((a, b) => (b.dy12 ?? -1) - (a.dy12 ?? -1));
      case "queda":
        return q.sort((a, b) => (a.variacaoDia ?? 0) - (b.variacaoDia ?? 0));
      case "minima52":
        return q.sort((a, b) => {
          const da = a.posicao?.distMinima52sPct ?? 999;
          const db = b.posicao?.distMinima52sPct ?? 999;
          return da - db;
        });
      default:
        return q.sort((a, b) => {
          const d = (PESO_SINAL[a.sinal.tipo] ?? 4) - (PESO_SINAL[b.sinal.tipo] ?? 4);
          if (d !== 0) return d;
          return (b.posicao?.percentil ?? 101) - (a.posicao?.percentil ?? 101);
        });
    }
  }, [linhasCompletas, ordem]);

  /** Foco de compra: melhores relações preço/história do universo inteiro. */
  const focoCompra = useMemo(() => {
    const base = visao?.linhas ?? [];
    return base
      .filter((l) => l.sinal.tipo === "comprar" || l.sinal.tipo === "observar")
      .filter((l) => l.posicao && l.posicao.percentil !== null && l.posicao.percentil <= 45)
      .sort((a, b) => (a.posicao?.percentil ?? 999) - (b.posicao?.percentil ?? 999))
      .slice(0, 5);
  }, [visao]);

  /** Alerta de venda: choque do dia ou notícia urgente associada. */
  const alertaVenda = useMemo(() => {
    const base = visao?.linhas ?? [];
    return base
      .filter((l) => l.sinal.tipo === "vender" || (l.variacaoDia !== null && l.variacaoDia <= -6))
      .sort((a, b) => (a.variacaoDia ?? 0) - (b.variacaoDia ?? 0))
      .slice(0, 5);
  }, [visao]);

  return (
    <AppShell
      title="Radar de Oportunidades"
      description="Todas as ações e FIIs da B3 comparados com a própria história — mínimas indicam oportunidade, choques exigem cautela."
    >
      <Tabs
        value={categoria}
        onValueChange={(v) => {
          setCategoria(v as "acao" | "fii");
          setVisiveis(TAMANHO_PAGINA);
          setFiltroSetor("todos");
        }}
      >
        <TabsList>
          <TabsTrigger value="acao">Ações</TabsTrigger>
          <TabsTrigger value="fii">FIIs</TabsTrigger>
        </TabsList>
      </Tabs>

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

          {focoCompra.length || alertaVenda.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
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

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              placeholder="Buscar ativo (ex.: TASY3, Itaú)…"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setVisiveis(TAMANHO_PAGINA);
              }}
              className="lg:max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroSinal} onValueChange={(v) => setFiltroSinal(v as FiltroSinal)}>
                <SelectTrigger className="w-44">
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
                  <SelectTrigger className="w-48">
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
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sinal">Por sinal do radar</SelectItem>
                  <SelectItem value="dy">Maior DY 12m</SelectItem>
                  <SelectItem value="queda">Maior queda do dia</SelectItem>
                  <SelectItem value="minima52">Mais perto da mín. 52s</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch checked={apenasPosicao} onCheckedChange={setApenasPosicao} />
                Com histórico
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch checked={apenasMinimas52} onCheckedChange={setApenasMinimas52} />
                ≤5% da mín. 52s
              </label>
            </div>
            <p className="text-xs text-muted-foreground lg:ml-auto">
              <Radar className="mr-1 inline size-3.5" aria-hidden />
              Percentil 0 = menor preço histórico · 100 = maior
            </p>
          </div>

          <TabelaRadar
            linhas={ordenadas}
            noticiasPorTicker={visao.noticiasImpacto}
            carregandoPosicoes={carregando}
            aoSelecionar={setSelecionado}
          />

          {linhasFiltradas.length > visiveis ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisiveis((v) => v + TAMANHO_PAGINA)}>
                Carregar mais ({linhasFiltradas.length - visiveis} restantes)
              </Button>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            O Radar é educacional: usa apenas o histórico de preços (Yahoo Finance), a base
            fundamentalista diária, o feed público de notícias e o contexto macro do Banco Central.
            Não constitui recomendação de investimento — cada decisão é sua.
          </p>
        </>
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
