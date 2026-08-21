import { createServerFn } from "@tanstack/react-start";
import type { CotacaoBrapi } from "@/lib/brapi-quote.server";

export type { CotacaoBrapi };

/** Cotação em tempo real de um ativo da B3 via BRAPI (token fica no servidor). */
export const cotacaoBrapi = createServerFn({ method: "GET" })
  .validator((d: { symbol?: unknown }) => ({
    symbol: String(d?.symbol ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 12),
  }))
  .handler(async ({ data }): Promise<CotacaoBrapi> => {
    if (!/^[A-Z0-9.-]{2,12}$/.test(data.symbol)) throw new Error("Ativo inexistente na BRAPI.");
    const { getQuote } = await import("@/lib/brapi-quote.server");
    return getQuote(data.symbol);
  });
