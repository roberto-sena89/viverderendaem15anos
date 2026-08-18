import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Star } from "lucide-react";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { corCategoria } from "@/lib/indices-base";
import type { LinhaIndice } from "@/lib/indices-base";
import { cn } from "@/lib/utils";

export const fmtNum = (v: number | null, casas = 2) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const fmtValor = (l: LinhaIndice) =>
  l.valor === null ? "—" : l.unidade === "%" ? `${fmtNum(l.valor)}%` : fmtNum(l.valor);

export const fmtVariacao = (v: number | null, sufixo = "%") =>
  v === null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${fmtNum(v)}${sufixo}`;

export const corVariacao = (v: number | null) =>
  v === null
    ? "text-muted-foreground"
    : v > 0
      ? "text-positive"
      : v < 0
        ? "text-negative"
        : "text-muted-foreground";

/** Card de um índice/taxa, com flash sutil a cada mudança de valor ao vivo. */
export function CardIndice({
  linha,
  favorito,
  aoFavoritar,
  aoAbrir,
  destaque = false,
}: {
  linha: LinhaIndice;
  favorito: boolean;
  aoFavoritar: () => void;
  aoAbrir: () => void;
  destaque?: boolean;
}) {
  const [flash, setFlash] = useState<"sobe" | "cai" | null>(null);
  const anterior = useRef<number | null>(linha.valor);

  useEffect(() => {
    // Taxas não têm movimento intradiário real: nenhum flash é aplicado.
    if (linha.tipo === "taxa" || linha.valor === null) return;
    const antes = anterior.current;
    anterior.current = linha.valor;
    if (antes === null || antes === linha.valor) return;
    setFlash(linha.valor > antes ? "sobe" : "cai");
    const id = window.setTimeout(() => setFlash(null), 1400);
    return () => window.clearTimeout(id);
  }, [linha.valor, linha.tipo]);

  const variacao = linha.tipo === "taxa" ? linha.variacao12m : linha.variacaoDiaPercent;
  const Icone = (variacao ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
  const sufixoVar = linha.tipo === "taxa" ? " p.p." : "%";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={aoAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          aoAbrir();
        }
      }}
      aria-label={`${linha.nome} (${linha.codigo})`}
      className={cn(
        "panel group cursor-pointer p-3.5 transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        destaque && "bg-muted/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display truncate text-sm font-semibold">{linha.codigo}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase",
                    corCategoria(linha.categoria),
                  )}
                >
                  {linha.tipo === "taxa"
                    ? "taxa"
                    : linha.categoria === "internacionais"
                      ? "global"
                      : "b3"}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[16rem] text-xs">{linha.descricao}</TooltipContent>
            </Tooltip>
          </div>
          <p className="truncate text-xs text-muted-foreground">{linha.nome}</p>
        </div>
        <button
          type="button"
          aria-label={
            favorito ? `Remover ${linha.codigo} dos favoritos` : `Favoritar ${linha.codigo}`
          }
          aria-pressed={favorito}
          onClick={(e) => {
            e.stopPropagation();
            aoFavoritar();
          }}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-primary"
        >
          <Star className={cn("size-4", favorito && "fill-primary text-primary")} />
        </button>
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "font-display truncate text-xl leading-none tabular-nums transition-colors duration-500",
              flash === "sobe" && "text-positive",
              flash === "cai" && "text-negative",
            )}
          >
            {fmtValor(linha)}
          </p>
          <p
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
              corVariacao(variacao),
            )}
          >
            {variacao !== null ? <Icone className="size-3.5" /> : null}
            {fmtVariacao(variacao, sufixoVar)}
            <span className="font-normal text-muted-foreground">
              {linha.tipo === "taxa" ? "12m" : "no dia"}
            </span>
          </p>
        </div>
        <Sparkline
          serie={linha.spark}
          positivo={
            (linha.tipo === "taxa"
              ? linha.variacao12m
              : (linha.variacao12m ?? linha.variacaoDiaPercent)) !== null
              ? (linha.variacao12m ?? linha.variacaoDiaPercent ?? 0) >= 0
              : true
          }
          largura={84}
          altura={30}
          className="shrink-0 opacity-80"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-[0.7rem] text-muted-foreground">
        <span className="truncate">
          {linha.tipo === "taxa"
            ? `Divulgação: ${linha.divulgadoEm ?? "—"}`
            : `12m ${fmtVariacao(linha.variacao12m)}`}
        </span>
        {linha.valor === null ? <span className="text-negative">indisponível</span> : null}
      </div>
    </article>
  );
}

/** Placeholder no formato exato do card, usado durante o carregamento. */
export function CardIndiceSkeleton() {
  return (
    <div className="panel animate-pulse p-3.5">
      <div className="h-3.5 w-20 rounded bg-muted" />
      <div className="mt-2 h-3 w-32 rounded bg-muted/70" />
      <div className="mt-4 h-6 w-28 rounded bg-muted" />
      <div className="mt-2 h-3 w-20 rounded bg-muted/70" />
      <div className="mt-3 h-3 w-full rounded bg-muted/40" />
    </div>
  );
}
