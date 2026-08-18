import { useEffect, useState } from "react";

/**
 * Breakpoints do sistema de design responsivo.
 * Cobre desde smartwatches (≤320px) até monitores ultrawide (≥2560px).
 */
export type Breakpoint = "watch" | "mobile" | "tablet" | "desktop" | "ultraWide";

/**
 * Ordem de prioridade das faixas (watch < mobile < tablet < desktop < ultraWide).
 */
export const BREAKPOINT_ORDER: readonly Breakpoint[] = [
  "watch",
  "mobile",
  "tablet",
  "desktop",
  "ultraWide",
] as const;

export interface BreakpointDef {
  key: Breakpoint;
  /** Largura mínima da viewport (inclusive). */
  minWidth: number;
}

/**
 * Tabela única de breakpoints em cascata por largura mínima.
 * Cada faixa começa na sua `minWidth` e termina antes da `minWidth` seguinte,
 * portanto não há lacunas nem sobreposições entre faixas.
 *
 * Nota: `desktop` inicia em 1024px para coincidir com o breakpoint `lg`
 * do Tailwind, usado no App Shell para exibir a barra lateral.
 */
export const BREAKPOINTS: readonly BreakpointDef[] = [
  { key: "watch", minWidth: 0 },
  { key: "mobile", minWidth: 321 },
  { key: "tablet", minWidth: 769 },
  { key: "desktop", minWidth: 1024 },
  { key: "ultraWide", minWidth: 2560 },
];

const BREAKPOINT_INDEX = new Map<Breakpoint, number>(
  BREAKPOINT_ORDER.map((key, index) => [key, index]),
);

function minWidthOf(breakpoint: Breakpoint): number {
  return BREAKPOINTS.find((def) => def.key === breakpoint)?.minWidth ?? 0;
}

function minWidthQuery(breakpoint: Breakpoint): string {
  return `(min-width: ${minWidthOf(breakpoint)}px)`;
}

/**
 * Retorna a query `max-width` que delimita a faixa do breakpoint.
 * A faixa termina 1px antes da `minWidth` do breakpoint seguinte;
 * para a última faixa (ultraWide) a query é sempre verdadeira.
 */
function maxWidthQuery(breakpoint: Breakpoint): string {
  const index = BREAKPOINT_INDEX.get(breakpoint) ?? 0;
  const next = BREAKPOINTS[index + 1];
  return next ? `(max-width: ${next.minWidth - 1}px)` : "(min-width: 0px)";
}

/**
 * Assina mudanças de uma media query e expõe o estado atual como boolean.
 * Seguro para SSR: usa o valor inicial fornecido até hidratar no cliente.
 */
function useMediaQuery(query: string, initial: boolean): boolean {
  const [matches, setMatches] = useState<boolean>(initial);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);

    update();
    if (mql.addEventListener) {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    // Fallback para navegadores antigos
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, [query]);

  return matches;
}

/**
 * Hook para detectar o breakpoint atual da viewport.
 * Atualiza automaticamente quando a janela cruza uma faixa de breakpoint.
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
 * ```
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    // Inicialização SSR-safe: detecta o breakpoint inicial no cliente
    if (typeof window === "undefined") return "desktop";
    return getBreakpointFromWidth(window.innerWidth);
  });

  useEffect(() => {
    // Uma MediaQueryList por faixa (cascata por min-width).
    // A query base (min-width: 0px) sempre casa, então nunca há estado obsoleto.
    const queries = BREAKPOINTS.map((def) => ({
      def,
      mql: window.matchMedia(minWidthQuery(def.key)),
    }));

    const update = () => {
      let current: Breakpoint = queries[0].def.key;
      for (const { def, mql } of queries) {
        if (mql.matches) current = def.key;
      }
      setBreakpoint(current);
    };

    update();
    queries.forEach(({ mql }) => {
      if (mql.addEventListener) {
        mql.addEventListener("change", update);
      } else {
        mql.addListener(update);
      }
    });

    return () => {
      queries.forEach(({ mql }) => {
        if (mql.removeEventListener) {
          mql.removeEventListener("change", update);
        } else {
          mql.removeListener(update);
        }
      });
    };
  }, []);

  return breakpoint;
}

/**
 * Hook que indica se o breakpoint atual é maior ou igual ao especificado.
 * Re-renderiza apenas quando a viewport cruza o limite do breakpoint alvo.
 *
 * @example
 * ```tsx
 * const isDesktop = useBreakpointUp("desktop"); // true para desktop e ultraWide
 * ```
 */
export function useBreakpointUp(target: Breakpoint): boolean {
  const initial =
    typeof window === "undefined"
      ? isBreakpointUp("desktop", target)
      : window.innerWidth >= minWidthOf(target);
  return useMediaQuery(minWidthQuery(target), initial);
}

/**
 * Hook que indica se o breakpoint atual é menor ou igual ao especificado.
 * Re-renderiza apenas quando a viewport cruza o limite do breakpoint alvo.
 *
 * @example
 * ```tsx
 * const isMobileOrSmaller = useBreakpointDown("mobile"); // true para watch e mobile
 * ```
 */
export function useBreakpointDown(target: Breakpoint): boolean {
  const initial =
    typeof window === "undefined"
      ? isBreakpointDown("desktop", target)
      : isBreakpointDown(getBreakpointFromWidth(window.innerWidth), target);
  return useMediaQuery(maxWidthQuery(target), initial);
}

/**
 * Função auxiliar que determina o breakpoint baseado na largura da viewport.
 * Útil para inicialização ou quando você tem a largura mas não quer usar o hook.
 */
export function getBreakpointFromWidth(width: number): Breakpoint {
  let current: Breakpoint = BREAKPOINTS[0].key;
  for (const def of BREAKPOINTS) {
    if (width >= def.minWidth) current = def.key;
    else break;
  }
  return current;
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
  return (BREAKPOINT_INDEX.get(current) ?? 0) <= (BREAKPOINT_INDEX.get(target) ?? 0);
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
  return (BREAKPOINT_INDEX.get(current) ?? 0) >= (BREAKPOINT_INDEX.get(target) ?? 0);
}
