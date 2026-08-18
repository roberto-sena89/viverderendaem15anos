import { useEffect, useState } from "react";

/**
 * Breakpoints do sistema de design responsivo.
 * Cobre desde smartwatches (≤320px) até monitores ultrawide (≥2560px).
 */
export type Breakpoint = "watch" | "mobile" | "tablet" | "desktop" | "ultraWide";

/**
 * Configuração de breakpoints com limites (min-width).
 * Ordem de prioridade: watch < mobile < tablet < desktop < ultraWide
 */
const BREAKPOINT_QUERIES = {
  watch: "(max-width: 320px)",
  mobile: "(min-width: 321px) and (max-width: 768px)",
  tablet: "(min-width: 769px) and (max-width: 1024px)",
  desktop: "(min-width: 1025px) and (max-width: 2559px)",
  ultraWide: "(min-width: 2560px)",
} as const;

/**
 * Hook para detectar o breakpoint atual da viewport.
 * Atualiza automaticamente quando a janela é redimensionada.
 *
 * @returns Breakpoint atual: "watch" | "mobile" | "tablet" | "desktop" | "ultraWide"
 *
 * @example
 * ```tsx
 * const breakpoint = useBreakpoint();
 *
 * // Renderização condicional
 * {breakpoint === "watch" && <CompactView />}
 * {breakpoint === "ultraWide" && <ExpandedDashboard />}
 *
 * // Configuração dinâmica
 * const columns = {
 *   watch: 1,
 *   mobile: 2,
 *   tablet: 3,
 *   desktop: 4,
 *   ultraWide: 6
 * }[breakpoint];
 * ```
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    // Inicialização SSR-safe: detecta o breakpoint inicial no cliente
    if (typeof window === "undefined") return "desktop";
    return getBreakpointFromWidth(window.innerWidth);
  });

  useEffect(() => {
    // Cria MediaQueryList para cada breakpoint
    const mediaQueries = Object.entries(BREAKPOINT_QUERIES).map(([key, query]) => ({
      key: key as Breakpoint,
      mql: window.matchMedia(query),
    }));

    // Handler que detecta qual breakpoint está ativo
    const updateBreakpoint = () => {
      const activeBreakpoint = mediaQueries.find((mq) => mq.mql.matches);
      if (activeBreakpoint) {
        setBreakpoint(activeBreakpoint.key);
      }
    };

    // Executa inicialmente
    updateBreakpoint();

    // Adiciona listeners em todos os media queries
    mediaQueries.forEach(({ mql }) => {
      // API moderna (addEventListener)
      if (mql.addEventListener) {
        mql.addEventListener("change", updateBreakpoint);
      } else {
        // Fallback para navegadores antigos
        mql.addListener(updateBreakpoint);
      }
    });

    // Cleanup: remove listeners
    return () => {
      mediaQueries.forEach(({ mql }) => {
        if (mql.removeEventListener) {
          mql.removeEventListener("change", updateBreakpoint);
        } else {
          mql.removeListener(updateBreakpoint);
        }
      });
    };
  }, []);

  return breakpoint;
}

/**
 * Função auxiliar que determina o breakpoint baseado na largura da viewport.
 * Útil para inicialização ou quando você tem a largura mas não quer usar o hook.
 */
export function getBreakpointFromWidth(width: number): Breakpoint {
  if (width <= 320) return "watch";
  if (width <= 768) return "mobile";
  if (width <= 1024) return "tablet";
  if (width <= 2559) return "desktop";
  return "ultraWide";
}

/**
 * Verifica se o breakpoint atual é menor ou igual ao especificado.
 * Útil para lógica condicional baseada em tamanho de tela.
 *
 * @example
 * ```tsx
 * const breakpoint = useBreakpoint();
 * const isMobileOrSmaller = isBreakpointDown(breakpoint, "mobile"); // true para watch e mobile
 * ```
 */
export function isBreakpointDown(current: Breakpoint, target: Breakpoint): boolean {
  const order: Breakpoint[] = ["watch", "mobile", "tablet", "desktop", "ultraWide"];
  return order.indexOf(current) <= order.indexOf(target);
}

/**
 * Verifica se o breakpoint atual é maior ou igual ao especificado.
 *
 * @example
 * ```tsx
 * const breakpoint = useBreakpoint();
 * const isDesktopOrLarger = isBreakpointUp(breakpoint, "desktop"); // true para desktop e ultraWide
 * ```
 */
export function isBreakpointUp(current: Breakpoint, target: Breakpoint): boolean {
  const order: Breakpoint[] = ["watch", "mobile", "tablet", "desktop", "ultraWide"];
  return order.indexOf(current) >= order.indexOf(target);
}
