import { createServerFn } from "@tanstack/react-start";
import type { HistoricoFii, RespostaFiis } from "@/lib/fiis-base";

/** Grade completa de FIIs listados na B3 (preço ao vivo + fundamentos). */
export const gradeFiis = createServerFn({ method: "GET" })
  .validator((d: { forcar?: boolean } | undefined) => ({ forcar: d?.forcar === true }))
  .handler(async ({ data }): Promise<RespostaFiis> => {
    const { gradeFiisComCache } = await import("@/lib/fiis.server");
    return gradeFiisComCache(data.forcar);
  });

/** Indicadores históricos (DY 5a e variações 12m/24m/5a) da página visível. */
export const historicoFiisGrade = createServerFn({ method: "GET" })
  .validator((d: { tickers?: unknown }) => ({
    tickers: Array.isArray(d?.tickers) ? d.tickers.map(String).slice(0, 100) : [],
  }))
  .handler(async ({ data }): Promise<HistoricoFii[]> => {
    if (!data.tickers.length) return [];
    const { historicoFiis } = await import("@/lib/fiis.server");
    return historicoFiis(data.tickers);
  });
