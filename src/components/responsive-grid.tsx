import { useBreakpoint, isBreakpointUp } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Configuração de colunas por breakpoint para grids de dashboard
 */
export interface GridColumnConfig {
  watch: number;
  mobile: number;
  tablet: number;
  desktop: number;
  ultraWide: number;
}

/**
 * Presets de configuração para casos comuns
 */
export const GRID_PRESETS: Record<string, GridColumnConfig> = {
  // Grid padrão do dashboard: 1/2/3/4/6
  dashboard: { watch: 1, mobile: 2, tablet: 3, desktop: 4, ultraWide: 6 },
  // Grid para métricas principais: 1/1/2/3/4
  metrics: { watch: 1, mobile: 1, tablet: 2, desktop: 3, ultraWide: 4 },
  // Grid para KPIs: 1/2/2/3/4
  kpi: { watch: 1, mobile: 2, tablet: 2, desktop: 3, ultraWide: 4 },
  // Grid para cards largos: 1/1/2/2/3
  wide: { watch: 1, mobile: 1, tablet: 2, desktop: 2, ultraWide: 3 },
  // Grid para listas: 1/1/1/2/2
  list: { watch: 1, mobile: 1, tablet: 1, desktop: 2, ultraWide: 2 },
  // Grid denso: 1/2/3/4/6
  dense: { watch: 1, mobile: 2, tablet: 3, desktop: 4, ultraWide: 6 },
};

/**
 * Gera classes Tailwind CSS para grid responsivo baseado na configuração
 */
function generateGridClasses(config: GridColumnConfig): string {
  const { watch, mobile, tablet, desktop, ultraWide } = config;
  const classes: string[] = ["grid"];

  // Watch (base)
  classes.push(`grid-cols-${watch}`);

  // Mobile (≥321px)
  if (mobile !== watch) classes.push(`sm:grid-cols-${mobile}`);

  // Tablet (≥769px)
  if (tablet !== mobile) classes.push(`md:grid-cols-${tablet}`);

  // Desktop (≥1025px)
  if (desktop !== tablet) classes.push(`lg:grid-cols-${desktop}`);

  // Ultra-wide (≥2560px)
  if (ultraWide !== desktop) classes.push(`[&@media(min-width:2560px)]:grid-cols-${ultraWide}`);

  return classes.join(" ");
}

/**
 * Props do ResponsiveGrid
 */
export interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  config?: Partial<GridColumnConfig> | keyof typeof GRID_PRESETS;
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  minItemWidth?: string;
}

/**
 * Grid responsivo que adapta o número de colunas baseado no breakpoint
 *
 * @example
 * ```tsx
 * // Usar preset
 * <ResponsiveGrid config="dashboard">
 *   {cards.map(c => <Card key={c.id} {...c} />)}
 * </ResponsiveGrid>
 *
 * // Configuração customizada
 * <ResponsiveGrid config={{ watch: 1, mobile: 2, tablet: 3, desktop: 4, ultraWide: 6 }}>
 *   {items}
 * </ResponsiveGrid>
 * ```
 */
export function ResponsiveGrid({
  children,
  className,
  config = "dashboard",
  gap = "md",
  minItemWidth,
}: ResponsiveGridProps) {
  const breakpoint = useBreakpoint();

  // Resolve configuração (preset ou custom)
  const resolvedConfig: GridColumnConfig =
    typeof config === "string" ? GRID_PRESETS[config] : { ...GRID_PRESETS.dashboard, ...config };

  // Gap responsivo
  const gapClasses = {
    none: "gap-0",
    sm: "gap-2 sm:gap-3 lg:gap-4 [&@media(min-width:2560px)]:gap-6",
    md: "gap-3 sm:gap-4 lg:gap-5 [&@media(min-width:2560px)]:gap-6",
    lg: "gap-4 sm:gap-5 lg:gap-6 [&@media(min-width:2560px)]:gap-8",
    xl: "gap-5 sm:gap-6 lg:gap-8 [&@media(min-width:2560px)]:gap-10",
  };

  const gridClasses = generateGridClasses(resolvedConfig);

  return (
    <div
      className={cn(
        gridClasses,
        gapClasses[gap],
        minItemWidth && `[grid-template-columns:repeat(auto-fit,minmax(${minItemWidth},1fr))]`,
        className
      )}
      data-breakpoint={breakpoint}
      role="list"
    >
      {children}
    </div>
  );
}

/**
 * Wrapper para grid que mostra/esconde itens baseado no breakpoint
 * Útil para cards que só fazem sentido em telas maiores
 */
export interface AdaptiveGridItemProps {
  children: ReactNode;
  className?: string;
  showFrom?: keyof GridColumnConfig; // Mostra a partir deste breakpoint
  hideFrom?: keyof GridColumnConfig; // Esconde a partir deste breakpoint
}

export function AdaptiveGridItem({
  children,
  className,
  showFrom,
  hideFrom,
}: AdaptiveGridItemProps) {
  const breakpoint = useBreakpoint();

  const shouldShow =
    (!showFrom || isBreakpointUp(breakpoint, showFrom)) &&
    (!hideFrom || !isBreakpointUp(breakpoint, hideFrom));

  if (!shouldShow) return null;

  return <div className={cn("flex flex-col min-w-0", className)}>{children}</div>;
}

/**
 * Componente para grid com colunas fluidas (auto-fit)
 * Útil quando você quer que o grid preencha o espaço disponível
 */
export interface FluidGridProps {
  children: ReactNode;
  className?: string;
  minItemWidth: string; // Ex: "280px", "20rem"
  maxItemWidth?: string; // Opcional: largura máxima
  gap?: "none" | "sm" | "md" | "lg" | "xl";
}

export function FluidGrid({
  children,
  className,
  minItemWidth,
  maxItemWidth,
  gap = "md",
}: FluidGridProps) {
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
        `grid-cols-[repeat(auto-fit,minmax(${minItemWidth}${maxItemWidth ? `,${maxItemWidth}` : "1fr"}),1fr)]`,
        gapClasses[gap],
        className
      )}
      role="list"
    >
      {children}
    </div>
  );
}