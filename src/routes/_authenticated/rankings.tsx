import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AbasMercado } from "@/components/abas-mercado";
import { Panel, TickerMark } from "@/components/panel";
import { PainelPanoramaMercado } from "@/components/painel-panorama-mercado";
import { Button } from "@/components/ui/button";
import { rankingsAtivos } from "@/lib/market.functions";
import type { ItemRanking, TipoRanking } from "@/lib/market.server";
import { urlAbsoluta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/rankings")({
  component: RankingsPage,
  head: () => ({
    meta: [
      { title: "Ranking de Ativos da B3 — Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Ranking em tempo real dos ativos da B3: maiores dividend yield, maiores valores de mercado e maiores receitas de ações, FIIs e BDRs.",
      },
      { property: "og:title", content: "Ranking de Ativos da B3" },
      {
        property: "og:description",
        content:
          "Maiores dividend yield, valor de mercado e receitas da B3, atualizados com dados de mercado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: urlAbsoluta("/rankings") }],
  }),
});

const abas: { valor: TipoRanking; rotulo: string }[] = [
  { valor: "acoes", rotulo: "Ações" },
  { valor: "fiis", rotulo: "FIIs" },
  { valor: "bdrs", rotulo: "BDRs" },
];

const pctBR = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

/** Formata grandes valores em R$ B / R$ M, como nas listas de mercado. */
function valorGrande(v: number) {
  if (v >= 1e9) return `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} M`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

const VISIVEIS = 5;
const POR_PAGINA = 10;

function ListaRanking({
  titulo,
  icone: Icone,
  itens,
  valor,
  carregando,
}: {
  titulo: string;
  icone: typeof CircleDollarSign;
  itens: ItemRanking[];
  valor: (i: ItemRanking) => string;
  carregando: boolean;
}) {
  const [completo, setCompleto] = useState(false);
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = completo ? (paginaAtual - 1) * POR_PAGINA : 0;
  const visiveis = completo ? itens.slice(inicio, inicio + POR_PAGINA) : itens.slice(0, VISIVEIS);

  return (
    <Panel className="overflow-hidden" bodyClassName="p-0">
      <div className="flex flex-col items-center gap-2 border-b border-border bg-muted/30 px-4 py-5">
        <Icone className="size-5 text-primary" />
        <h2 className="font-display text-base font-bold">{titulo}</h2>
      </div>

      {carregando && itens.length === 0 ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Sem dados disponíveis para esta categoria no momento.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {visiveis.map((item, idx) => (
              <li key={item.ticker}>
                <Link
                  to="/cotacoes"
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={`num w-6 shrink-0 text-xs font-bold ${
                      inicio + idx < 3 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    #{inicio + idx + 1}
                  </span>
                  {item.logo ? (
                    <img
                      src={item.logo}
                      alt={`Logo ${item.ticker}`}
                      loading="lazy"
                      className="size-8 shrink-0 rounded-lg bg-muted object-contain"
                    />
                  ) : (
                    <TickerMark ticker={item.ticker} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.ticker}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.nome}
                    </span>
                  </span>
                  <span className="num shrink-0 text-sm font-semibold tabular-nums">
                    {valor(item)}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="space-y-3 border-t border-border p-4">
            {completo && totalPaginas > 1 ? (
              <nav
                className="flex items-center justify-between gap-2"
                aria-label={`Paginação — ${titulo}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPagina(Math.max(1, paginaAtual - 1))}
                  disabled={paginaAtual === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPagina(i + 1)}
                      aria-current={paginaAtual === i + 1 ? "page" : undefined}
                      aria-label={`Página ${i + 1}`}
                      className={`num size-7 rounded-full text-xs font-semibold tabular-nums transition-colors ${
                        paginaAtual === i + 1
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPagina(Math.min(totalPaginas, paginaAtual + 1))}
                  disabled={paginaAtual === totalPaginas}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </nav>
            ) : null}

            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => {
                setCompleto((v) => !v);
                setPagina(1);
              }}
              aria-expanded={completo}
              aria-label={`${completo ? "Ver menos" : "Ver ranking completo"} — ${titulo}`}
              disabled={itens.length <= VISIVEIS}
            >
              {completo ? "Ver menos" : `Ver Rankings (${itens.length})`}
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}

function RankingsPage() {
  const [tipo, setTipo] = useState<TipoRanking>("acoes");
  const buscar = useServerFn(rankingsAtivos);

  const { data, isFetching, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["rankings-b3", tipo],
    queryFn: () => buscar({ data: { tipo } }),
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    placeholderData: keepPreviousData,
  });

  const hora = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <AppShell
      title="Ranking de Ativos"
      description="Maiores dividend yield, valor de mercado e receitas da B3"
    >
      <AbasMercado />
      <PainelPanoramaMercado />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {abas.map((a) => (
            <button
              key={a.valor}
              type="button"
              onClick={() => setTipo(a.valor)}
              aria-pressed={tipo === a.valor}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                tipo === a.valor
                  ? "border-primary bg-primary font-semibold text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {isError
              ? "Fonte indisponível — exibindo últimos dados"
              : hora
                ? `Atualizado às ${hora}`
                : "Carregando dados da B3"}
          </span>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListaRanking
          titulo="Maiores Dividend Yield"
          icone={CircleDollarSign}
          carregando={isFetching}
          itens={data?.dividendYield ?? []}
          valor={(i) => (i.dy === null ? "—" : pctBR(i.dy))}
        />
        <ListaRanking
          titulo="Maiores Valor de Mercado"
          icone={Landmark}
          carregando={isFetching}
          itens={data?.valorMercado ?? []}
          valor={(i) => (i.valorMercado === null ? "—" : valorGrande(i.valorMercado))}
        />
        <ListaRanking
          titulo="Maiores Receitas"
          icone={BarChart3}
          carregando={isFetching}
          itens={data?.receitas ?? []}
          valor={(i) => (i.receita === null ? "—" : valorGrande(i.receita))}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Dados públicos de mercado da B3 (brapi.dev). Dividend yield calculado sobre os proventos
        pagos nos últimos 12 meses; receitas referentes ao último exercício divulgado.
      </p>
    </AppShell>
  );
}
