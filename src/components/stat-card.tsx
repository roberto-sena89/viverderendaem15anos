import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { DeltaChip } from "@/components/panel";

/**
 * Bloco de indicador: rótulo em caixa alta, número tabular em destaque
 * e variação opcional — padrão de terminal de análise de ativos.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  delta,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative";
  delta?: number;
}) {
  const toneClass =
    tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : "text-foreground";

  return (
    <div className="panel group relative p-4 transition-colors duration-200 hover:border-primary/40">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-brand opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <p className="truncate text-[0.68rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          {label}
        </p>
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground/70" /> : null}
      </div>
      <p className={`num mt-2 font-display text-[1.6rem] leading-none font-bold ${toneClass}`}>{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {typeof delta === "number" ? <DeltaChip value={delta} /> : null}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
