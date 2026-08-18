import { useMemo } from "react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  colunasVisiveis,
  distribuirLarguras,
  type ColunaResponsiva,
} from "@/lib/colunas-responsivas";

export interface ColunasResponsivasResult<C extends ColunaResponsiva> {
  /** Colunas visíveis no breakpoint atual. */
  visiveis: C[];
  /** Larguras proporcionais por id de coluna (em %). */
  larguras: Map<string, string>;
}

/**
 * Hook de layout de colunas dinâmicas: calcula quais colunas de uma tabela
 * estão visíveis no breakpoint atual e distribui as larguras
 * proporcionalmente, sem barra de rolagem horizontal.
 *
 * @example
 * ```tsx
 * const { visiveis, larguras } = useColunasResponsivas(COLUNAS, ["ticker"]);
 * ```
 */
export function useColunasResponsivas<C extends ColunaResponsiva>(
  colunas: readonly C[],
  minimas: readonly string[] = [],
): ColunasResponsivasResult<C> {
  const breakpoint = useBreakpoint();

  const visiveis = useMemo(
    () => colunasVisiveis(colunas, breakpoint, minimas),
    [colunas, breakpoint, minimas],
  );

  const larguras = useMemo(() => distribuirLarguras(visiveis), [visiveis]);

  return { visiveis, larguras };
}
