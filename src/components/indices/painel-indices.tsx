import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Panel } from "@/components/panel";
import { CardIndice, CardIndiceSkeleton, corVariacao, fmtValor, fmtVariacao } from "@/components/indices/card-indice";
import { ModalIndice } from "@/components/indices/modal-indice";
import { ComparadorCarteira } from "@/components/indices/comparador-carteira";
import { gradeIndices } from "@/lib/indices.functions";
import {
  CATEGORIAS_INDICE,
  DESTAQUES_INDICE,
  MAIS_BUSCADOS,
  type CategoriaIndice,
  type LinhaIndice,
} from "@/lib/indices-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { estadoPregao } from "@/lib/cotacoes-tempo-real";
import { cn } from "@/lib/utils";
import { EstadoVazio } from "@/components/estado-vazio";

type Ordem = "buscados" | "maior12m" | "menor12m";

const ORDENS: { id: Ordem; rotulo: string }[] = [
  { id: "buscados", rotulo: "Mais buscados" },
  { id: "maior12m", rotulo: "Maior retorno (12m)" },
  { id: "menor12m", rotulo: "Menor retorno (12m)" },
];

const chaveFavorito = (codigo: string) => `IDX:${codigo}`;

/** Grade completa de índices e taxas de referência, em cards por categoria. */
export function PainelIndices({
  intervaloMs,
  busca,
}: {
  intervaloMs: number;
  busca: string;
}) {
  const buscarIndices = useServerFn(gradeIndices);
  const pregao = estadoPregao();
  const { favoritos, alternar } = useFavoritos();
  const [ordem, setOrdem] = useState<Ordem>("buscados");
  const [categoria, setCategoria] = useState<CategoriaIndice | "todas">("todas");
  const [recolhidas, setRecolhidas] = useState<Record<string, boolean>>({});
  const [selecionado, setSelecionado] = useState<LinhaIndice | null>(null);

  const { data, isFetching, isLoading, refetch } = useQuery({
    queryKey: ["grade-indices"],
    queryFn: () => buscarIndices({ data: { forcar: false } }),
    refetchInterval: intervaloMs > 0 ? Math.max(intervaloMs, 15_000) : false,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    gcTime: 30 * 60_000,
  });

  const linhas = data?.linhas ?? [];

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let lista = linhas.filter((l) => {
      if (categoria !== "todas" && l.categoria !== categoria) return false;
      if (!termo) return true;
      return l.codigo.toLowerCase().includes(termo) || l.nome.toLowerCase().includes(termo);
    });

    if (ordem === "maior12m") {
      lista = [...lista].sort((a, b) => (b.variacao12m ?? -Infinity) - (a.variacao12m ?? -Infinity));
    } else if (ordem === "menor12m") {
      lista = [...lista].sort((a, b) => (a.variacao12m ?? Infinity) - (b.variacao12m ?? Infinity));
    } else {
      lista = [...lista].sort((a, b) => {
        const ia = MAIS_BUSCADOS.indexOf(a.codigo);
        const ib = MAIS_BUSCADOS.indexOf(b.codigo);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    }
    return lista;
  }, [linhas, busca, favoritos, categoria, ordem]);

  const destaques = useMemo(
    () =>
      DESTAQUES_INDICE.map((c) => linhas.find((l) => l.codigo === c)).filter(
        (l): l is LinhaIndice => Boolean(l),
      ),
    [linhas],
  );

  const secoes = useMemo(() => {
    const ordenadas = ordem === "buscados" ? CATEGORIAS_INDICE : CATEGORIAS_INDICE;
    return ordenadas
      .map((c) => ({ ...c, itens: filtradas.filter((l) => l.categoria === c.id) }))
      .filter((c) => c.itens.length > 0);
  }, [filtradas, ordem]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Faixa de destaque */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading && !destaques.length
            ? Array.from({ length: 4 }).map((_, i) => <CardIndiceSkeleton key={i} />)
            : destaques.map((l) => (
                <div key={l.codigo} className="panel p-4">
                  <p className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {l.codigo} · {l.tipo === "taxa" ? "taxa de referência" : "índice"}
                  </p>
                  <p className="font-display mt-1 text-2xl leading-none tabular-nums">{fmtValor(l)}</p>
                  <p className={cn("mt-1 text-xs font-semibold tabular-nums", corVariacao(l.tipo === "taxa" ? l.variacao12m : l.variacaoDiaPercent))}>
                    {fmtVariacao(l.tipo === "taxa" ? l.variacao12m : l.variacaoDiaPercent, l.tipo === "taxa" ? " p.p." : "%")}{" "}
                    <span className="font-normal text-muted-foreground">
                      {l.tipo === "taxa" ? "em 12m" : "no dia"}
                    </span>
                  </p>
                </div>
              ))}
        </div>

        <ComparadorCarteira linhas={linhas} />

        <Panel
          title="Índices e taxas de referência"
          hint={`${filtradas.length} indicadores monitorados · ${
            pregao.aberto ? "🟢 Pregão aberto" : "🔴 Pregão fechado"
          } · CDI, Selic e IPCA seguem o calendário oficial de divulgação`}
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
              Atualizar
            </Button>
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
            {[{ id: "todas" as const, rotulo: "Todas" }, ...CATEGORIAS_INDICE].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoria(c.id as CategoriaIndice | "todas")}
                aria-pressed={categoria === c.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  categoria === c.id
                    ? "border-primary/60 bg-primary-soft text-accent-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {c.rotulo}
              </button>
            ))}
          </div>

          {/* Seções por categoria */}
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <CardIndiceSkeleton key={i} />
              ))}
            </div>
          ) : secoes.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum índice encontrado"
              descricao="Nenhum índice corresponde à busca. Tente outro nome ou código."
            />
          ) : (
            secoes.map((s) => {
              const aberta = !recolhidas[s.id];
              return (
                <section key={s.id} className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setRecolhidas((r) => ({ ...r, [s.id]: aberta }))}
                    aria-expanded={aberta}
                    className="flex w-full items-center justify-between gap-2 border-b border-border pb-1.5 text-left"
                  >
                    <span className="panel-title">{s.rotulo}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {s.itens.length}
                      <ChevronDown className={cn("size-4 transition-transform", !aberta && "-rotate-90")} />
                    </span>
                  </button>
                  {aberta ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {s.itens.map((l) => (
                        <CardIndice
                          key={l.codigo}
                          linha={l}
                          favorito={favoritos.includes(chaveFavorito(l.codigo))}
                          aoFavoritar={() => alternar(chaveFavorito(l.codigo))}
                          aoAbrir={() => setSelecionado(l)}
                          destaque={DESTAQUES_INDICE.includes(l.codigo)}
                        />
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })
          )}

          <p className="flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
            <Star className="size-3.5" />
            Índices de bolsa via Yahoo Finance (último fechamento fora do pregão) · CDI, Selic e IPCA via Banco
            Central (SGS) e IBGE.
          </p>
        </Panel>

        <ModalIndice linha={selecionado} aberto={Boolean(selecionado)} aoFechar={() => setSelecionado(null)} />
      </div>
    </TooltipProvider>
  );
}
