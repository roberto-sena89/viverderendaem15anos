import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Star } from "lucide-react";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CORRELACOES,
  corCategoria,
  mercadoCategoria,
  type LinhaCommodity,
} from "@/lib/commodities-base";
import { cn } from "@/lib/utils";
import { TextoTruncado } from "@/components/texto-truncado";

export type Moeda = "usd" | "brl" | "ambas";

/* ------------------------------------------------------------------ *
 * Formatação
 * ------------------------------------------------------------------ */

/** Casas decimais adaptativas: do gás natural (US$ 2,81) ao cacau (US$ 8.400). */
export function fmtDinheiro(v: number | null, simbolo: "US$" | "R$") {
  if (v === null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const casas = abs >= 100 ? 2 : abs >= 1 ? 2 : 4;
  return `${simbolo} ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}`;
}

export const fmtVar = (v: number | null) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export const corVar = (v: number | null) =>
  v === null || !Number.isFinite(v)
    ? "text-muted-foreground"
    : v > 0
      ? "text-positive"
      : v < 0
        ? "text-negative"
        : "text-muted-foreground";

/* ------------------------------------------------------------------ *
 * Card
 * ------------------------------------------------------------------ */

export function CardCommodity({
  linha,
  usdBrl,
  moeda,
  favorito,
  aoFavoritar,
  aoAbrir,
  selecionado,
  aoSelecionar,
  tickersCarteira,
  destaque = false,
}: {
  linha: LinhaCommodity;
  usdBrl: number;
  moeda: Moeda;
  favorito: boolean;
  aoFavoritar: () => void;
  aoAbrir: () => void;
  selecionado: boolean;
  aoSelecionar: () => void;
  tickersCarteira: string[];
  destaque?: boolean;
}) {
  const [flash, setFlash] = useState<"sobe" | "cai" | null>(null);
  const anterior = useRef<number | null>(linha.precoUsd);
  const mercado = mercadoCategoria(linha.categoria);

  useEffect(() => {
    if (linha.precoUsd === null) return;
    const antes = anterior.current;
    anterior.current = linha.precoUsd;
    if (antes === null || antes === linha.precoUsd) return;
    setFlash(linha.precoUsd > antes ? "sobe" : "cai");
    const id = window.setTimeout(() => setFlash(null), 1500);
    return () => window.clearTimeout(id);
  }, [linha.precoUsd]);

  const brl = linha.precoUsd === null ? null : linha.precoUsd * usdBrl;
  const Icone = (linha.variacao12m ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;

  const correlacao = CORRELACOES[linha.codigo];
  const naCarteira = correlacao?.tickers.filter((t) => tickersCarteira.includes(t)) ?? [];

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
      aria-label={`${linha.nome} — ${linha.bolsa}`}
      className={cn(
        "panel group cursor-pointer p-cartao transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        destaque && "bg-muted/20",
        selecionado && "border-primary/60",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <TextoTruncado as="span" className="t-ticker font-display min-w-0" texto={linha.nome}>
              {linha.nome}
            </TextoTruncado>
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase",
                corCategoria(linha.categoria),
              )}
            >
              {linha.bolsa}
            </span>
          </div>
          <TextoTruncado as="p" className="t-caption" texto={`Contrato futuro · cotação por ${linha.unidade}`}>
            Contrato futuro · cotação por {linha.unidade}
          </TextoTruncado>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span onClick={(e) => e.stopPropagation()} className="flex items-center">
            <Checkbox
              checked={selecionado}
              onCheckedChange={() => aoSelecionar()}
              aria-label={`Selecionar ${linha.nome} para comparar`}
            />
          </span>
          <button
            type="button"
            aria-label={favorito ? `Remover ${linha.nome} dos favoritos` : `Favoritar ${linha.nome}`}
            aria-pressed={favorito}
            onClick={(e) => {
              e.stopPropagation();
              aoFavoritar();
            }}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <Star className={cn("size-4", favorito && "fill-primary text-primary")} />
          </button>
        </div>
      </div>

      <div className="mt-bloco flex items-end justify-between gap-bloco">
        <div className="min-w-0">
          {moeda !== "brl" ? (
            <p
              className={cn(
                "font-display truncate text-xl leading-none tabular-nums transition-colors duration-500",
                flash === "sobe" && "text-positive",
                flash === "cai" && "text-negative",
              )}
            >
              {fmtDinheiro(linha.precoUsd, "US$")}
              <span className="ml-1 text-xs font-normal text-muted-foreground">/ {linha.unidade}</span>
            </p>
          ) : null}
          {moeda !== "usd" ? (
            <p
              className={cn(
                "truncate tabular-nums",
                moeda === "brl"
                  ? "font-display text-xl leading-none"
                  : "mt-1 text-xs text-muted-foreground",
              )}
            >
              {fmtDinheiro(brl, "R$")}
              <span className="ml-1 text-xs font-normal text-muted-foreground">/ {linha.unidade}</span>
            </p>
          ) : null}

          <p className={cn("mt-1.5 inline-flex items-center gap-1 text-sm font-semibold tabular-nums", corVar(linha.variacao12m))}>
            {linha.variacao12m !== null ? <Icone className="size-4" /> : null}
            {fmtVar(linha.variacao12m)}
            <span className="text-[0.7rem] font-normal text-muted-foreground">em 12m</span>
          </p>
        </div>

        <Sparkline
          serie={linha.spark}
          positivo={(linha.variacao30d ?? linha.variacao12m ?? 0) >= 0}
          largura={84}
          altura={32}
          className="shrink-0 opacity-80"
        />
      </div>

      <div className="t-caption mt-bloco flex items-center justify-between gap-2 border-t border-border pt-bloco">
        <span className={cn("truncate", corVar(linha.variacaoDia))}>
          {linha.variacaoDia !== null ? `${fmtVar(linha.variacaoDia)} no dia` : "Sem dado intradiário"}
        </span>
        <span
          className={cn(
            "shrink-0 truncate text-right",
            mercado.aberto ? "text-muted-foreground" : "text-muted-foreground/80",
          )}
        >
          {mercado.aberto ? "● ao vivo" : "○ fechado"}
        </span>
      </div>

      {naCarteira.length > 0 ? (
        <p className="t-caption mt-bloco rounded-md bg-primary-soft px-2 py-1 text-accent-foreground">
          Na sua carteira: {naCarteira.join(", ")} · {correlacao?.frase}
        </p>
      ) : null}
    </article>
  );
}

/** Placeholder no formato exato do card. */
export function CardCommoditySkeleton() {
  return (
    <div className="panel animate-pulse p-cartao">
      <div className="h-3.5 w-28 rounded bg-muted" />
      <div className="mt-2 h-3 w-36 rounded bg-muted/70" />
      <div className="mt-4 h-6 w-32 rounded bg-muted" />
      <div className="mt-2 h-3 w-24 rounded bg-muted/70" />
      <div className="mt-3 h-3 w-full rounded bg-muted/40" />
    </div>
  );
}
