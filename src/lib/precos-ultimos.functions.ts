import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PrecoPersistido } from "@/lib/precos-ultimos.server";

const tickerValido = (t: unknown) => /^[A-Z0-9.-]{2,12}$/.test(String(t));

const normalizarLista = (d: { tickers?: unknown }) => ({
  tickers: Array.isArray(d?.tickers)
    ? d.tickers
        .map((t) => String(t).trim().toUpperCase())
        .filter(tickerValido)
        .slice(0, 200)
    : [],
});

/** Último preço válido salvo no banco para cada ticker pedido. */
export const lerUltimosPrecos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(normalizarLista)
  .handler(async ({ data }): Promise<PrecoPersistido[]> => {
    if (!data.tickers.length) return [];
    const { lerPrecosPersistidos } = await import("@/lib/precos-ultimos.server");
    return lerPrecosPersistidos(data.tickers);
  });

/**
 * Atualiza no banco o último preço válido dos tickers pedidos.
 *
 * O cliente informa apenas quais tickers acompanhar: os preços são buscados
 * aqui no servidor, nas fontes oficiais (BRAPI / cache de cotações). Nenhum
 * valor vindo do navegador é gravado, para que ninguém possa plantar preços
 * falsos numa tabela compartilhada por todos os usuários.
 */
export const sincronizarUltimosPrecos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(normalizarLista)
  .handler(async ({ data }) => {
    if (!data.tickers.length) return { gravados: 0 };
    const { sincronizarPrecosDeFonte } = await import("@/lib/precos-ultimos.server");
    return sincronizarPrecosDeFonte(data.tickers);
  });
