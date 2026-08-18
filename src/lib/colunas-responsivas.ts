import { isBreakpointUp, type Breakpoint } from "@/hooks/use-breakpoint";

/**
 * Coluna de uma tabela de dados responsiva com visibilidade dinâmica.
 *
 * A visibilidade por breakpoint permite layouts de coluna dinâmicos:
 * a mesma tabela mostra mais colunas em telas grandes e menos em telas
 * pequenas, sem barra de rolagem horizontal.
 */
export interface ColunaResponsiva {
  id: string;
  rotulo: string;
  /** Visível a partir deste breakpoint (inclusive). Ausente = sempre visível. */
  visivelDe?: Breakpoint;
  /** Colunas que permanecem visíveis mesmo fora do `visivelDe` (via `colunasMinimas`). */
  essencial?: boolean;
  /**
   * Peso na distribuição proporcional de larguras (default 1).
   * Colunas com `classeLargura` não participam da distribuição.
   */
  peso?: number;
  /** Classe de largura fixa (ex.: `w-10` para colunas de rank). */
  classeLargura?: string;
  alinhamento?: "left" | "right";
}

/**
 * Retorna as colunas visíveis no breakpoint informado.
 *
 * @param minimas IDs de colunas obrigatórias (ignoram `visivelDe`).
 */
export function colunasVisiveis<C extends ColunaResponsiva>(
  colunas: readonly C[],
  breakpoint: Breakpoint,
  minimas: readonly string[] = [],
): C[] {
  return colunas.filter(
    (c) =>
      c.essencial ||
      minimas.includes(c.id) ||
      !c.visivelDe ||
      isBreakpointUp(breakpoint, c.visivelDe),
  );
}

/**
 * Distribui larguras proporcionais (em % da tabela) entre as colunas
 * visíveis, baseado nos pesos. Colunas com `classeLargura` ficam de fora
 * (largura controlada por classe).
 *
 * As larguras sempre somam 100%, evitando barra de rolagem horizontal.
 */
export function distribuirLarguras<C extends ColunaResponsiva>(
  visiveis: readonly C[],
): Map<string, string> {
  const flexiveis = visiveis.filter((c) => !c.classeLargura);
  const somaPeso = flexiveis.reduce((s, c) => s + (c.peso ?? 1), 0);
  const larguras = new Map<string, string>();
  for (const c of flexiveis) {
    const pct = ((c.peso ?? 1) / somaPeso) * 100;
    larguras.set(c.id, `${pct.toFixed(2)}%`);
  }
  return larguras;
}

/** Largura CSS de uma coluna (classe fixa ou distribuição proporcional). */
export function larguraDaColuna<C extends ColunaResponsiva>(
  coluna: C,
  larguras: Map<string, string>,
): string | undefined {
  return coluna.classeLargura ?? larguras.get(coluna.id);
}
