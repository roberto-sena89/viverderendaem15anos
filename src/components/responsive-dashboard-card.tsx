import { useConfigResponsiva, type ConfigResponsiva } from "@/hooks/use-config-responsiva";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/**
 * Configuração de tamanho responsivo para o DashboardCard
 */
interface ResponsiveDashboardCardConfig {
  watch: {
    minHeight: string;
    padding: string;
    contentGap: string;
  };
  mobile: {
    minHeight: string;
    padding: string;
    contentGap: string;
  };
  tablet: {
    minHeight: string;
    padding: string;
    contentGap: string;
  };
  desktop: {
    minHeight: string;
    padding: string;
    contentGap: string;
  };
  ultraWide: {
    minHeight: string;
    padding: string;
    contentGap: string;
  };
}

const DEFAULT_CARD_CONFIG: ResponsiveDashboardCardConfig = {
  watch: {
    minHeight: "min-h-[80px]",
    padding: "p-2.5",
    contentGap: "gap-2",
  },
  mobile: {
    minHeight: "min-h-[100px]",
    padding: "p-3",
    contentGap: "gap-2",
  },
  tablet: {
    minHeight: "min-h-[120px]",
    padding: "p-3.5",
    contentGap: "gap-2.5",
  },
  desktop: {
    minHeight: "min-h-[140px]",
    padding: "p-4",
    contentGap: "gap-3",
  },
  ultraWide: {
    minHeight: "min-h-[160px]",
    padding: "p-5",
    contentGap: "gap-4",
  },
};

/**
 * Escala tipográfica do conteúdo do card por breakpoint.
 * Valores em CSS length (rem/px); expostos como variáveis CSS
 * `--card-titulo`, `--card-corpo`, `--card-metrica`, `--card-legenda`
 * e `--card-icone` no wrapper do card.
 */
export interface EscalaConteudoCard {
  titulo: string;
  corpo: string;
  metrica: string;
  legenda: string;
  icone: string;
}

export const ESCALA_CONTEUDO_CARD: ConfigResponsiva<EscalaConteudoCard> = {
  watch: {
    titulo: "0.8rem",
    corpo: "0.72rem",
    metrica: "1.125rem",
    legenda: "0.625rem",
    icone: "14px",
  },
  mobile: {
    titulo: "0.875rem",
    corpo: "0.8125rem",
    metrica: "1.375rem",
    legenda: "0.6875rem",
    icone: "16px",
  },
  tablet: {
    titulo: "0.9375rem",
    corpo: "0.875rem",
    metrica: "1.5rem",
    legenda: "0.75rem",
    icone: "18px",
  },
  desktop: {
    titulo: "1rem",
    corpo: "0.9125rem",
    metrica: "1.625rem",
    legenda: "0.8125rem",
    icone: "20px",
  },
  ultraWide: {
    titulo: "1.125rem",
    corpo: "1rem",
    metrica: "1.875rem",
    legenda: "0.875rem",
    icone: "24px",
  },
};

export const VARIAVEIS_ESCALA_CARD = {
  titulo: "--card-titulo",
  corpo: "--card-corpo",
  metrica: "--card-metrica",
  legenda: "--card-legenda",
  icone: "--card-icone",
} as const;

/**
 * Conteúdo tipográfico do card que segue a escala de breakpoint do card pai.
 * Use dentro de <ResponsiveDashboardCard> ou <ResponsiveStatCard>.
 */
export function CardTitulo({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h3
      className={cn(
        "font-display text-[length:var(--card-titulo)] leading-snug font-semibold tracking-[0.02em]",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function CardCorpo({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p
      className={cn(
        "text-[length:var(--card-corpo)] leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function CardMetrica({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p
      className={cn(
        "font-display text-[length:var(--card-metrica)] leading-tight font-bold tabular-nums",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function CardLegenda({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "text-[length:var(--card-legenda)] leading-normal font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CardIcone({
  icon: Icon,
  className,
  ...rest
}: { icon: LucideIcon; className?: string } & React.SVGProps<SVGSVGElement>) {
  return <Icon className={cn("shrink-0 size-[length:var(--card-icone)]", className)} {...rest} />;
}

export interface ResponsiveDashboardCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  config?: Partial<ResponsiveDashboardCardConfig>;
  variant?: "default" | "interactive" | "static";
  hoverEffect?: boolean;
}

/**
 * DashboardCard totalmente responsivo que adapta altura mínima, padding
 * e espaçamento interno baseado no breakpoint.
 *
 * Variants:
 * - default: card padrão sem interação
 * - interactive: card clicável com hover/tap effects
 * - static: card apenas informativo (sem hover)
 */
export function ResponsiveDashboardCard({
  children,
  className,
  onClick,
  ariaLabel,
  ariaExpanded,
  ariaPressed,
  config,
  variant = "default",
  hoverEffect = true,
}: ResponsiveDashboardCardProps) {
  const currentConfig = useConfigResponsiva(DEFAULT_CARD_CONFIG, config);
  const escala = useConfigResponsiva(ESCALA_CONTEUDO_CARD);

  const Component = onClick ? "button" : "div";

  const isInteractive = variant === "interactive" || onClick;
  const hasHover = hoverEffect && isInteractive;

  return (
    <Component
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      className={cn(
        "surface-card relative flex flex-col justify-center overflow-hidden",
        currentConfig.minHeight,
        currentConfig.padding,
        "transition-all duration-300",
        isInteractive && "cursor-pointer",
        hasHover && "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]",
        hasHover && "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        isInteractive && "group",
        className,
      )}
    >
      <div
        className={cn("flex flex-col w-full", currentConfig.contentGap)}
        style={
          {
            [VARIAVEIS_ESCALA_CARD.titulo]: escala.titulo,
            [VARIAVEIS_ESCALA_CARD.corpo]: escala.corpo,
            [VARIAVEIS_ESCALA_CARD.metrica]: escala.metrica,
            [VARIAVEIS_ESCALA_CARD.legenda]: escala.legenda,
            [VARIAVEIS_ESCALA_CARD.icone]: escala.icone,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </Component>
  );
}

/**
 * Wrapper para criar grids de dashboard responsivos
 * Combina ResponsiveGrid + ResponsiveDashboardCard
 */
export interface ResponsiveDashboardGridProps {
  children: ReactNode;
  className?: string;
  columns?: "dashboard" | "metrics" | "kpi" | "wide" | "list" | "dense";
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  cardVariant?: "default" | "interactive" | "static";
  cardHoverEffect?: boolean;
  minCardWidth?: string;
}

export function ResponsiveDashboardGrid({
  children,
  className,
  columns = "dashboard",
  gap = "md",
}: ResponsiveDashboardGridProps) {
  // Como não podemos usar hooks aqui (componente não-renderizado),
  // retornamos apenas o container grid
  // O consumo deve envolver com <ResponsiveDashboardCard> individualmente

  return (
    <div
      className={cn(
        "grid",
        gap === "none" && "gap-0",
        gap === "sm" && "gap-2 sm:gap-3 lg:gap-4",
        gap === "md" && "gap-3 sm:gap-4 lg:gap-5",
        gap === "lg" && "gap-4 sm:gap-5 lg:gap-6",
        gap === "xl" && "gap-5 sm:gap-6 lg:gap-8",
        className,
      )}
      data-columns={columns}
      role="list"
    >
      {children}
    </div>
  );
}

/**
 * Preset de grid para dashboard (1/2/3/4/6 colunas)
 * Usa CSS Grid com auto-fit para responsividade nativa
 */
export function DashboardGrid({
  children,
  className,
  gap = "md",
}: {
  children: ReactNode;
  className?: string;
  gap?: "none" | "sm" | "md" | "lg" | "xl";
}) {
  const gapClasses = {
    none: "gap-0",
    sm: "gap-2 sm:gap-3 lg:gap-4 min-[2560px]:gap-6",
    md: "gap-3 sm:gap-4 lg:gap-5 min-[2560px]:gap-6",
    lg: "gap-4 sm:gap-5 lg:gap-6 min-[2560px]:gap-8",
    xl: "gap-5 sm:gap-6 lg:gap-8 min-[2560px]:gap-10",
  };

  return (
    <div
      className={cn(
        "grid",
        // Watch (base): 1 col
        "grid-cols-1",
        // Mobile (≥321px): 2 cols
        "sm:grid-cols-2",
        // Tablet (≥769px): 3 cols
        "md:grid-cols-3",
        // Desktop (≥1024px): 4 cols
        "lg:grid-cols-4",
        // Ultra-wide (≥2560px): 6 cols
        "min-[2560px]:grid-cols-6",
        gapClasses[gap],
        className,
      )}
      role="list"
    >
      {children}
    </div>
  );
}

/**
 * Grid para métricas/KPIs (1/1/2/3/4 colunas)
 */
export function MetricsGrid({
  children,
  className,
  gap = "md",
}: {
  children: ReactNode;
  className?: string;
  gap?: "none" | "sm" | "md" | "lg" | "xl";
}) {
  const gapClasses = {
    none: "gap-0",
    sm: "gap-2 sm:gap-3 lg:gap-4",
    md: "gap-3 sm:gap-4 lg:gap-5",
    lg: "gap-4 sm:gap-5 lg:gap-6",
    xl: "gap-5 sm:gap-6 lg:gap-8",
  };

  return (
    <div
      className={cn(
        "grid",
        "grid-cols-1",
        "sm:grid-cols-1",
        "md:grid-cols-2",
        "lg:grid-cols-3",
        "min-[2560px]:grid-cols-4",
        gapClasses[gap],
        className,
      )}
      role="list"
    >
      {children}
    </div>
  );
}

/**
 * Grid para cards largos (1/1/2/2/3 colunas)
 */
export function WideCardGrid({
  children,
  className,
  gap = "md",
}: {
  children: ReactNode;
  className?: string;
  gap?: "none" | "sm" | "md" | "lg" | "xl";
}) {
  const gapClasses = {
    none: "gap-0",
    sm: "gap-2 sm:gap-3 lg:gap-4",
    md: "gap-3 sm:gap-4 lg:gap-5",
    lg: "gap-4 sm:gap-5 lg:gap-6",
    xl: "gap-5 sm:gap-6 lg:gap-8",
  };

  return (
    <div
      className={cn(
        "grid",
        "grid-cols-1",
        "sm:grid-cols-1",
        "md:grid-cols-2",
        "lg:grid-cols-2",
        "min-[2560px]:grid-cols-3",
        gapClasses[gap],
        className,
      )}
      role="list"
    >
      {children}
    </div>
  );
}
