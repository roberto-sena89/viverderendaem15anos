import { useConfigResponsiva, type ConfigResponsiva } from "@/hooks/use-config-responsiva";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { DeltaChip } from "@/components/panel";
import {
  ESCALA_CONTEUDO_CARD,
  VARIAVEIS_ESCALA_CARD,
} from "@/components/responsive-dashboard-card";
import { cn } from "@/lib/utils";

/**
 * Configuração de tamanho responsivo para o StatCard
 */
interface ResponsiveStatCardConfig {
  // Watch (≤320px)
  watch: {
    padding: string;
    labelFontSize: string;
    valueFontSize: string;
    iconSize: string;
    gap: string;
  };
  // Mobile (321-768px)
  mobile: {
    padding: string;
    labelFontSize: string;
    valueFontSize: string;
    iconSize: string;
    gap: string;
  };
  // Tablet (769-1024px)
  tablet: {
    padding: string;
    labelFontSize: string;
    valueFontSize: string;
    iconSize: string;
    gap: string;
  };
  // Desktop (1024-2559px)
  desktop: {
    padding: string;
    labelFontSize: string;
    valueFontSize: string;
    iconSize: string;
    gap: string;
  };
  // Ultra-wide (≥2560px)
  ultraWide: {
    padding: string;
    labelFontSize: string;
    valueFontSize: string;
    iconSize: string;
    gap: string;
  };
}

/**
 * Configuração padrão responsiva
 */
const DEFAULT_CONFIG: ResponsiveStatCardConfig = {
  watch: {
    padding: "p-2.5",
    labelFontSize: "text-[0.6rem]",
    valueFontSize: "text-[1.125rem]",
    iconSize: "size-3.5",
    gap: "gap-1.5",
  },
  mobile: {
    padding: "p-3",
    labelFontSize: "text-[0.65rem]",
    valueFontSize: "text-[1.375rem]",
    iconSize: "size-4",
    gap: "gap-2",
  },
  tablet: {
    padding: "p-3.5",
    labelFontSize: "text-[0.68rem]",
    valueFontSize: "text-[1.5rem]",
    iconSize: "size-4.5",
    gap: "gap-2",
  },
  desktop: {
    padding: "p-4",
    labelFontSize: "text-[0.75rem]",
    valueFontSize: "text-[1.625rem]",
    iconSize: "size-5",
    gap: "gap-2.5",
  },
  ultraWide: {
    padding: "p-5",
    labelFontSize: "text-[0.875rem]",
    valueFontSize: "text-[1.875rem]",
    iconSize: "size-6",
    gap: "gap-3",
  },
};

export interface ResponsiveStatCardProps {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative";
  delta?: number;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  config?: Partial<ResponsiveStatCardConfig>;
  children?: ReactNode;
}

/**
 * StatCard totalmente responsivo que adapta tamanho de fonte, padding,
 * ícones e espaçamento baseado no breakpoint atual.
 *
 * Suporta: watch (≤320px) → mobile (321-768px) → tablet (769-1024px)
 * → desktop (1024-2559px) → ultraWide (≥2560px)
 */
export function ResponsiveStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  delta,
  className,
  onClick,
  ariaLabel,
  config,
  children,
}: ResponsiveStatCardProps) {
  const currentConfig = useConfigResponsiva(DEFAULT_CONFIG, config);
  const escala = useConfigResponsiva(ESCALA_CONTEUDO_CARD);

  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      aria-label={ariaLabel}
      style={
        {
          [VARIAVEIS_ESCALA_CARD.titulo]: escala.titulo,
          [VARIAVEIS_ESCALA_CARD.corpo]: escala.corpo,
          [VARIAVEIS_ESCALA_CARD.metrica]: escala.metrica,
          [VARIAVEIS_ESCALA_CARD.legenda]: escala.legenda,
          [VARIAVEIS_ESCALA_CARD.icone]: escala.icone,
        } as CSSProperties
      }
      className={cn(
        "panel group relative",
        currentConfig.padding,
        "transition-colors duration-200 hover:border-primary/40",
        onClick &&
          "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-brand opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start", currentConfig.gap)}>
        <p className={cn("t-label truncate", currentConfig.labelFontSize)}>{label}</p>
        {Icon ? (
          <Icon className={cn("shrink-0 text-muted-foreground/70", currentConfig.iconSize)} />
        ) : null}
      </div>
      <p className={cn("t-metric mt-2", toneClass, currentConfig.valueFontSize)}>{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {typeof delta === "number" ? <DeltaChip value={delta} /> : null}
        {hint ? <p className="t-caption">{hint}</p> : null}
      </div>
      {children}
    </Component>
  );
}

/**
 * Variante compacta para grids densos (ex: watch/mobile)
 */
export interface CompactStatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative";
  delta?: number;
  className?: string;
}

/**
 * Configuração de tamanho responsivo do StatCard compacto.
 */
interface CompactStatCardConfig {
  padding: string;
  labelFontSize: string;
  valueFontSize: string;
  iconSize: string;
  gap: string;
}

const COMPACT_CONFIG: ConfigResponsiva<CompactStatCardConfig> = {
  watch: {
    padding: "p-2",
    labelFontSize: "text-[0.55rem]",
    valueFontSize: "text-[1.125rem]",
    iconSize: "size-3.5",
    gap: "gap-1.5",
  },
  mobile: {
    padding: "p-2.5",
    labelFontSize: "text-[0.6rem]",
    valueFontSize: "text-[1.25rem]",
    iconSize: "size-4",
    gap: "gap-2",
  },
  tablet: {
    padding: "p-3",
    labelFontSize: "text-[0.65rem]",
    valueFontSize: "text-[1.375rem]",
    iconSize: "size-4.5",
    gap: "gap-2",
  },
  desktop: {
    padding: "p-3",
    labelFontSize: "text-[0.68rem]",
    valueFontSize: "text-[1.5rem]",
    iconSize: "size-5",
    gap: "gap-2.5",
  },
  ultraWide: {
    padding: "p-3.5",
    labelFontSize: "text-[0.75rem]",
    valueFontSize: "text-[1.625rem]",
    iconSize: "size-5.5",
    gap: "gap-2.5",
  },
};

export function CompactStatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  delta,
  className,
}: CompactStatCardProps) {
  const config = useConfigResponsiva(COMPACT_CONFIG);

  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";

  return (
    <div className={cn("panel", config.padding, className)}>
      <div className={cn("flex items-center justify-between", config.gap)}>
        <p className={cn("t-label truncate flex-1 min-w-0", config.labelFontSize)}>{label}</p>
        {Icon && <Icon className={cn("shrink-0 text-muted-foreground/70", config.iconSize)} />}
      </div>
      <p className={cn("mt-1 t-metric", toneClass, config.valueFontSize)}>{value}</p>
      {typeof delta === "number" && (
        <div className="mt-1.5">
          <DeltaChip value={delta} />
        </div>
      )}
    </div>
  );
}
