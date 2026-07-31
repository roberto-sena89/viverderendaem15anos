import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PrecoPersistido } from "@/lib/precos-ultimos.server";

const tickerValido = (t: unknown) => /^[A-Z0-9.\-]{2,12}$/.test(String(t));

/** Último preço válido salvo no banco para cada ticker pedido. */
export const lerUltimosPrecos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tickers?: unknown }) => ({
    tickers: Array.isArray(d?.tickers)
      ? d.tickers
          .map((t) => String(t).trim().toUpperCase())
          .filter(tickerValido)
          .slice(0, 200)
      : [],
  }))
  .handler(async ({ data }): Promise<PrecoPersistido[]> => {
    if (!data.tickers.length) return [];
    const { lerPrecosPersistidos } = await import("@/lib/precos-ultimos.server");
    return lerPrecosPersistidos(data.tickers);
  });

/** Persiste os preços recebidos das fontes ao vivo (BRAPI / Cotações). */
export const salvarUltimosPrecos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { precos?: unknown }) => ({
    precos: Array.isArray(d?.precos)
      ? (d.precos as Record<string, unknown>[])
          .map((p) => ({
            ticker: String(p?.ticker ?? "").trim().toUpperCase(),
            preco: Number(p?.preco),
            variacaoPercent:
              p?.variacaoPercent === null || p?.variacaoPercent === undefined
                ? null
                : Number(p.variacaoPercent),
            fonte: String(p?.fonte ?? "brapi").slice(0, 40),
            aoVivo: p?.aoVivo === true,
            atualizadoEm: String(p?.atualizadoEm ?? new Date().toISOString()),
          }))
          .filter((p) => tickerValido(p.ticker) && Number.isFinite(p.preco) && p.preco > 0)
          .slice(0, 200)
      : [],
  }))
  .handler(async ({ data }) => {
    if (!data.precos.length) return { gravados: 0 };
    const { gravarPrecosPersistidos } = await import("@/lib/precos-ultimos.server");
    return gravarPrecosPersistidos(data.precos as PrecoPersistido[]);
  });
