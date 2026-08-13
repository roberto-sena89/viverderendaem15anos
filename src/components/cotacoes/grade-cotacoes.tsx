import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { ModalAtivo } from "@/components/cotacoes/modal-ativo";
import { TextoTruncado } from "@/components/texto-truncado";
import {
  corVar,
  fmtPercent,
  fmtPreco,
  fmtVar,
  fmtVolume,
  posicaoFaixa,
} from "@/components/cotacoes/formatos";
import { useFavoritos } from "@/lib/favoritos-mercado";
import {
  gradeMercado,
  type CategoriaMercado,
  type LinhaCotacao,
} from "@/lib/grade-mercado.functions";
import { EstadoVazio } from "@/components/estado-vazio";
import { SkeletonLinhasGrade } from "@/components/skeleton-grade";

type Ordem = { coluna: "ticker" | "preco" | "variacaoPercent" | "volume"; desc: boolean };

export function GradeCotacoes({
  categoria,
  intervaloMs,
  busca,
  aoAtualizar,
  ocultarAtualizar,
}: {
  categoria: CategoriaMercado;
  intervaloMs: number;
  busca: string;
  aoAtualizar?: (quando: number, parcial: boolean) => void;
  ocultarAtualizar?: boolean;
}) {
  const buscarGrade = useServerFn(gradeMercado);
  const { favoritos, ehFavorito, alternar } = useFavoritos();
  const [ordem, setOrdem] = useState<Ordem>({ coluna: "variacaoPercent", desc: true });
  const [filtroVar, setFiltroVar] = useState<"todos" | "altas" | "baixas" | "fortes">("todos");
  const [volumeMin, setVolumeMin] = useState("0");
  const [detalhe, setDetalhe] = useState<LinhaCotacao | null>(null);
  const [flash, setFlash] = useState<Record<string, "alta" | "baixa">>({});
  const anteriores = useRef<Record<string, number>>({});

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["grade-mercado", categoria],
    queryFn: () => buscarGrade({ data: { categoria } }),
    refetchInterval: intervaloMs > 0 ? intervaloMs : false,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    gcTime: 30 * 60_000,
  });

  useEffect(() => {
    if (dataUpdatedAt && data) aoAtualizar?.(dataUpdatedAt, data.parcial);
  }, [dataUpdatedAt, data, aoAtualizar]);

  // Flash sutil no preço quando o valor muda entre atualizações.
  useEffect(() => {
    if (!data?.linhas?.length) return;
    const novos: Record<string, "alta" | "baixa"> = {};
    for (const l of data.linhas) {
      if (l.preco === null) continue;
      const anterior = anteriores.current[l.ticker];
      if (anterior !== undefined && anterior !== l.preco) {
        novos[l.ticker] = l.preco > anterior ? "alta" : "baixa";
      }
      anteriores.current[l.ticker] = l.preco;
    }
    if (!Object.keys(novos).length) return;
    setFlash((f) => ({ ...f, ...novos }));
    const id = window.setTimeout(() => {
      setFlash((f) => {
        const copia = { ...f };
        for (const k of Object.keys(novos)) delete copia[k];
        return copia;
      });
    }, 1600);
    return () => window.clearTimeout(id);
  }, [data]);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const minimo = Number(volumeMin.replace(/\D/g, "")) || 0;
    const filtradas = (data?.linhas ?? []).filter((l) => {
      if (termo && !`${l.ticker} ${l.nome} ${l.grupo ?? ""}`.toLowerCase().includes(termo))
        return false;
      const v = l.variacaoPercent ?? 0;
      if (filtroVar === "altas" && v <= 0) return false;
      if (filtroVar === "baixas" && v >= 0) return false;
      if (filtroVar === "fortes" && Math.abs(v) < 3) return false;
      if (minimo > 0 && (l.volume ?? 0) < minimo) return false;
      return true;
    });

    const fator = ordem.desc ? -1 : 1;
    return [...filtradas].sort((a, b) => {
      if (ordem.coluna === "ticker") return fator * a.ticker.localeCompare(b.ticker) * -1;
      const va = a[ordem.coluna] ?? Number.NEGATIVE_INFINITY;
      const vb = b[ordem.coluna] ?? Number.NEGATIVE_INFINITY;
      return fator * (va - vb);
    });
  }, [data, busca, favoritos, filtroVar, volumeMin, ordem]);

  const ordenar = (coluna: Ordem["coluna"]) =>
    setOrdem((o) => (o.coluna === coluna ? { coluna, desc: !o.desc } : { coluna, desc: true }));

  const Seta = ({ coluna }: { coluna: Ordem["coluna"] }) =>
    ordem.coluna === coluna ? (
      ordem.desc ? (
        <ArrowDown className="size-3" />
      ) : (
        <ArrowUp className="size-3" />
      )
    ) : null;

  if (isLoading) {
    return <SkeletonLinhasGrade quantidade={8} colunas={4} />;
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <Select value={filtroVar} onValueChange={(v) => setFiltroVar(v as typeof filtroVar)}>
          <SelectTrigger className="h-8 w-[168px] text-sm" aria-label="Filtrar por variação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as variações</SelectItem>
            <SelectItem value="altas">Somente altas</SelectItem>
            <SelectItem value="baixas">Somente baixas</SelectItem>
            <SelectItem value="fortes">Variação acima de 3%</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={volumeMin === "0" ? "" : volumeMin}
          onChange={(e) => setVolumeMin(e.target.value || "0")}
          inputMode="numeric"
          placeholder="Volume mínimo"
          aria-label="Volume mínimo negociado"
          className="h-8 w-[150px] text-sm"
        />
        <span className="t-num-sm ml-auto text-muted-foreground">
          {linhas.length} ativo{linhas.length === 1 ? "" : "s"}
        </span>
        {ocultarAtualizar ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            aria-label="Atualizar cotações agora"
            className="h-8"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        )}
      </div>

      {linhas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum ativo encontrado"
          descricao="Nenhum ativo corresponde aos filtros aplicados."
        />
      ) : (
        <>
          {/* Desktop / tablet */}
          <div className="hidden md:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-border text-[0.7rem] tracking-[0.08em] text-muted-foreground uppercase">
                  <th className="w-8 py-2 pl-3" aria-label="Favorito" />
                  <th className="py-2 text-left">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => ordenar("ticker")}
                    >
                      Ativo <Seta coluna="ticker" />
                    </button>
                  </th>
                  <th className="w-[124px] py-2 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => ordenar("preco")}
                    >
                      Último <Seta coluna="preco" />
                    </button>
                  </th>
                  <th className="w-[96px] py-2 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => ordenar("variacaoPercent")}
                    >
                      Var. % <Seta coluna="variacaoPercent" />
                    </button>
                  </th>
                  <th className="w-[92px] py-2 text-right">Variação</th>
                  <th className="hidden w-[132px] py-2 text-right lg:table-cell">Mín. / Máx.</th>
                  <th className="hidden w-[92px] py-2 text-right lg:table-cell">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => ordenar("volume")}
                    >
                      Volume <Seta coluna="volume" />
                    </button>
                  </th>
                  <th className="w-[108px] py-2 pr-3 text-right">Tendência</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const pos = (l.variacaoPercent ?? 0) >= 0;
                  const faixa = posicaoFaixa(l);
                  const abrupta = Math.abs(l.variacaoPercent ?? 0) >= 5;
                  return (
                    <tr
                      key={l.ticker}
                      tabIndex={0}
                      role="button"
                      onClick={() => setDetalhe(l)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetalhe(l);
                        }
                      }}
                      className={`cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 ${
                        abrupta ? "bg-muted/20" : ""
                      }`}
                    >
                      <td className="py-2 pl-3">
                        <button
                          type="button"
                          aria-label={
                            ehFavorito(l.ticker)
                              ? `Remover ${l.ticker} dos favoritos`
                              : `Favoritar ${l.ticker}`
                          }
                          aria-pressed={ehFavorito(l.ticker)}
                          onClick={(e) => {
                            e.stopPropagation();
                            alternar(l.ticker);
                          }}
                          className="grid size-6 place-items-center rounded-md hover:bg-muted"
                        >
                          <Star
                            className={`size-3.5 ${ehFavorito(l.ticker) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                          />
                        </button>
                      </td>
                      <td className="min-w-0 py-2">
                        <TextoTruncado as="p" className="t-ticker font-medium" texto={l.ticker}>
                          {l.ticker}
                        </TextoTruncado>
                        <TextoTruncado
                          as="p"
                          className="t-subtexto"
                          texto={`${l.nome}${l.grupo ? ` · ${l.grupo}` : ""}`}
                        >
                          {l.nome}
                          {l.grupo ? ` · ${l.grupo}` : ""}
                        </TextoTruncado>
                      </td>
                      <td
                        className={`py-2 text-right font-medium tabular-nums ${
                          flash[l.ticker] === "alta"
                            ? "flash-alta"
                            : flash[l.ticker] === "baixa"
                              ? "flash-baixa"
                              : ""
                        }`}
                      >
                        {fmtPreco(l.preco, l.moeda)}
                      </td>
                      <td className={`py-2 text-right tabular-nums ${corVar(l.variacaoPercent)}`}>
                        {fmtPercent(l.variacaoPercent)}
                      </td>
                      <td className={`py-2 text-right tabular-nums ${corVar(l.variacao)}`}>
                        {fmtVar(l.variacao)}
                      </td>
                      <td className="hidden py-2 text-right lg:table-cell">
                        {faixa === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div>
                            <div className="relative h-1 rounded-full bg-muted">
                              <span
                                className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                                style={{ left: `${faixa}%` }}
                              />
                            </div>
                            <p className="mt-1 text-[0.68rem] text-muted-foreground tabular-nums">
                              {fmtPreco(l.minimo, l.moeda)} · {fmtPreco(l.maximo, l.moeda)}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="hidden py-2 text-right text-muted-foreground tabular-nums lg:table-cell">
                        {fmtVolume(l.volume)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <div className="flex justify-end">
                          <Sparkline serie={l.spark} positivo={pos} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="divide-y divide-border/60 md:hidden">
            {linhas.map((l) => {
              const pos = (l.variacaoPercent ?? 0) >= 0;
              return (
                <li key={l.ticker}>
                  <button
                    type="button"
                    onClick={() => setDetalhe(l)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  >
                    <span
                      role="presentation"
                      onClick={(e) => {
                        e.stopPropagation();
                        alternar(l.ticker);
                      }}
                      className="grid size-7 shrink-0 place-items-center rounded-md"
                    >
                      <Star
                        className={`size-4 ${ehFavorito(l.ticker) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <TextoTruncado as="span" className="t-ticker block" texto={l.ticker} passivo>
                        {l.ticker}
                      </TextoTruncado>
                      <TextoTruncado as="span" className="t-subtexto block" texto={l.nome} passivo>
                        {l.nome}
                      </TextoTruncado>
                    </span>
                    <Sparkline serie={l.spark} positivo={pos} largura={56} altura={24} />
                    <span className="shrink-0 text-right">
                      <span
                        className={`block text-sm font-medium tabular-nums ${
                          flash[l.ticker] === "alta"
                            ? "flash-alta"
                            : flash[l.ticker] === "baixa"
                              ? "flash-baixa"
                              : ""
                        }`}
                      >
                        {fmtPreco(l.preco, l.moeda)}
                      </span>
                      <span className={`block text-xs tabular-nums ${corVar(l.variacaoPercent)}`}>
                        {fmtPercent(l.variacaoPercent)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ModalAtivo linha={detalhe} aberto={detalhe !== null} aoFechar={() => setDetalhe(null)} />
    </div>
  );
}
