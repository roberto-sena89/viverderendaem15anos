import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Card padrão das telas de dados: cabeçalho com título em caixa alta e área de conteúdo. */
export function Panel({
  title,
  action,
  hint,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("panel flex flex-col", className)}>
      {title ? (
        <div className="flex flex-col gap-2 border-b border-border bg-muted/30 px-3 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:px-4">
          <div className="min-w-0">
            <p className="panel-title break-words sm:truncate">{title}</p>
            {hint ? (
              <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line sm:pl-2.5">
                {hint}
              </p>
            ) : null}
          </div>
          {action ? <div className="min-w-0 sm:shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn("flex-1", bodyClassName ?? "p-4 sm:p-5")}>{children}</div>
    </div>
  );
}

/** Selo de variação percentual (verde/vermelho) usado em cotações e rentabilidade. */
export function DeltaChip({ value, suffix = "%", className }: { value: number; suffix?: string; className?: string }) {
  const positivo = value >= 0;
  const Icon = positivo ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn(positivo ? "chip-pos" : "chip-neg", className)}>
      <Icon className="size-3" />
      {positivo ? "+" : ""}
      {value.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
      {suffix}
    </span>
  );
}

/** Marca circular com as iniciais do ticker, como nas listas de ativos. */
export function TickerMark({ ticker, className }: { ticker: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft font-display text-[0.85rem] font-bold tracking-tight text-accent-foreground",
        className,
      )}
    >
      {ticker.slice(0, 4).toUpperCase()}
    </span>
  );
}
