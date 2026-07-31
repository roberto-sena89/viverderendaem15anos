import { createServerFn } from "@tanstack/react-start";
import type { CotacaoTicker } from "@/services/brapi.server";

export type { CotacaoTicker };

/** Cotações da barra de cotações (BRAPI). Token permanece no servidor. */
export const cotacoesTicker = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ itens: CotacaoTicker[]; atualizadoEm: string }> => {
    const { cotacoesFita } = await import("@/services/brapi.server");
    return { itens: await cotacoesFita(), atualizadoEm: new Date().toISOString() };
  },
);
