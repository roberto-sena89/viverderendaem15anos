import { createServerFn } from "@tanstack/react-start";
import type { RespostaEtfs } from "@/lib/etfs-base";
import type { PrecoInternacional } from "@/lib/etfs.server";

/** Grade completa de ETFs (B3 + internacionais) com preço ao vivo e indicadores. */
export const gradeEtfs = createServerFn({ method: "GET" })
  .inputValidator((d: { forcar?: boolean } | undefined) => ({ forcar: d?.forcar === true }))
  .handler(async ({ data }): Promise<RespostaEtfs> => {
    const { gradeEtfsComCache } = await import("@/lib/etfs.server");
    return gradeEtfsComCache(data.forcar);
  });

/** Cotação dos ETFs internacionais visíveis (lote limitado). */
export const precosEtfsInternacionais = createServerFn({ method: "GET" })
  .inputValidator((d: { tickers?: unknown }) => ({
    tickers: Array.isArray(d?.tickers) ? d.tickers.map(String).slice(0, 40) : [],
  }))
  .handler(async ({ data }): Promise<PrecoInternacional[]> => {
    if (!data.tickers.length) return [];
    const { precosInternacionais } = await import("@/lib/etfs.server");
    return precosInternacionais(data.tickers);
  });

/** Cotações ao vivo (BRAPI) dos ETFs visíveis na grade. */
export const precosEtfsBrapi = createServerFn({ method: "GET" })
  .inputValidator((d: { tickers?: unknown }) => ({
    tickers: Array.isArray(d?.tickers)
      ? d.tickers
          .map((t) => String(t).trim().toUpperCase())
          .filter((t) => /^[A-Z0-9.-]{2,12}$/.test(t))
          .slice(0, 100)
      : [],
  }))
  .handler(async ({ data }) => {
    if (!data.tickers.length) return [];
    const { precosBrapiEtfs } = await import("@/lib/etfs-brapi.server");
    return precosBrapiEtfs(data.tickers);
  });
