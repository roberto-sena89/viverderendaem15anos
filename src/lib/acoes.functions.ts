import { createServerFn } from "@tanstack/react-start";
import type { HistoricoAcao, RespostaAcoes } from "@/lib/acoes-base";

/** Grade completa de ações listadas na B3 (preço ao vivo + fundamentos). */
export const gradeAcoes = createServerFn({ method: "GET" })
  .validator((d: { forcar?: boolean } | undefined) => ({ forcar: d?.forcar === true }))
  .handler(async ({ data }): Promise<RespostaAcoes> => {
    const { gradeAcoesComCache } = await import("@/lib/acoes.server");
    return gradeAcoesComCache(data.forcar);
  });

/** Indicadores históricos (DY 5a e variações 30d/12m/5a) da página visível. */
export const historicoAcoesGrade = createServerFn({ method: "GET" })
  .validator((d: { tickers?: unknown }) => ({
    tickers: Array.isArray(d?.tickers) ? d.tickers.map(String).slice(0, 100) : [],
  }))
  .handler(async ({ data }): Promise<HistoricoAcao[]> => {
    if (!data.tickers.length) return [];
    const { historicoAcoes } = await import("@/lib/acoes.server");
    return historicoAcoes(data.tickers);
  });
