import { useBreakpoint, type Breakpoint } from "@/hooks/use-breakpoint";

/**
 * Configuração responsiva: um valor por faixa de breakpoint
 * (watch, mobile, tablet, desktop, ultraWide).
 */
export type ConfigResponsiva<T> = Record<Breakpoint, T>;

/**
 * Resolve a configuração ativa para um breakpoint, mesclando a configuração
 * padrão com overrides parciais (apenas as faixas informadas são sobrescritas).
 *
 * Função pura — testável sem renderizar componentes.
 */
export function resolverConfigResponsiva<T>(
  defaults: ConfigResponsiva<T>,
  overrides?: Partial<ConfigResponsiva<T>>,
  breakpoint: Breakpoint = "desktop",
): T {
  const extra = overrides?.[breakpoint];
  if (!extra) return defaults[breakpoint];
  return { ...defaults[breakpoint], ...extra };
}

/**
 * Hook que retorna a configuração responsiva da faixa atual da viewport.
 *
 * @example
 * ```tsx
 * const config = useConfigResponsiva(CONFIG_PADRAO, configCustomizada);
 * // config contém padding/fontes/etc. do breakpoint ativo
 * ```
 */
export function useConfigResponsiva<T>(
  defaults: ConfigResponsiva<T>,
  overrides?: Partial<ConfigResponsiva<T>>,
): T {
  const breakpoint = useBreakpoint();
  return resolverConfigResponsiva(defaults, overrides, breakpoint);
}
