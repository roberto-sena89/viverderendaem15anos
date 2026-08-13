import { createServerFn } from "@tanstack/react-start";
import { gradeAcoesComCache } from "@/lib/acoes.server";
import { gradeFiisComCache } from "@/lib/fiis.server";

/**
 * Dividend yields vigentes (medianos) calculados a partir das grades já
 * cacheadas (`acoes:grade` / `fiis:grade`), sem disparar novos fetches às
 * fontes públicas. Usado nos artigos do conteúdo educacional para ancorar os
 * exemplos de renda passiva em números reais do mercado.
 */
export type DadosVivosConteudo = {
  /** Mediana do DY 12 meses entre todas as ações da grade. */
  dyAcoes: number | null;
  /** Mediana do DY 12 meses entre todos os FIIs da grade. */
  dyFiis: number | null;
  /** Última atualização observada das grades usadas. */
  atualizadoEm: string | null;
};

function mediana(numeros: number[]): number | null {
  if (numeros.length === 0) return null;
  const ordenados = [...numeros].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

export const dadosVivosConteudo = createServerFn({ method: "GET" }).handler(
  async (): Promise<DadosVivosConteudo> => {
    try {
      const [acoes, fiis] = await Promise.all([gradeAcoesComCache(), gradeFiisComCache()]);
      const datas = [acoes.atualizadoEm, fiis.atualizadoEm].filter((d): d is string => Boolean(d));
      return {
        dyAcoes: mediana(
          acoes.linhas
            .map((l) => l.dy12)
            .filter((dy): dy is number => typeof dy === "number" && dy > 0),
        ),
        dyFiis: mediana(
          fiis.linhas
            .map((l) => l.dy12)
            .filter((dy): dy is number => typeof dy === "number" && dy > 0),
        ),
        atualizadoEm: datas.length ? (datas.sort().at(-1) ?? null) : null,
      };
    } catch {
      return { dyAcoes: null, dyFiis: null, atualizadoEm: null };
    }
  },
);
