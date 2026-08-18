import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

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
  const breakpoint = useBreakpoint();
  const resolvedConfig = { ...DEFAULT_CARD_CONFIG, ...config };
  const currentConfig = resolvedConfig[breakpoint];

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
        className
      )}
    >
      <div className={cn("flex flex-col w-full", currentConfig.contentGap)}>
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
  cardVariant = "default",
  cardHoverEffect = true,
  minCardWidth,
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
        className
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
    sm: "gap-2 sm:gap-3 lg:gap-4 [&@media(min-width:2560px)]:gap-6",
    md: "gap-3 sm:gap-4 lg:gap-5 [&@media(min-width:2560px)]:gap-6",
    lg: "gap-4 sm:gap-5 lg:gap-6 [&@media(min-width:2560px)]:gap-8",
    xl: "gap-5 sm:gap-6 lg:gap-8 [&@media(min-width:2560px)]:gap-10",
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
        // Desktop (≥1025px): 4 cols
        "lg:grid-cols-4",
        // Ultra-wide (≥2560px): 6 cols
        "[&@media(min-width:2560px)]:grid-cols-6",
        gapClasses[gap],
        className
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
        "[&@media(min-width:2560px)]:grid-cols-4",
        gapClasses[gap],
        className
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
        "[&@media(min-width:2560px)]:grid-cols-3",
        gapClasses[gap],
        className
      )}
      role="list"
    >
      {children}
    </div>
  );
}