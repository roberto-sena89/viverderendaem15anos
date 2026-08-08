import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CotacaoLive } from "@/lib/cotacoes.server";

export type { CotacaoLive };

export interface RespostaCotacoes {
  cotacoes: CotacaoLive[];
  atualizadoEm: string;
}

/** Cotações em lote dos ativos da carteira (ações, FIIs, ETFs, exterior, Tesouro). */
export const cotacoesCarteira = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { itens: { ticker: string; categoria: string }[] }) => ({
    itens: (Array.isArray(d?.itens) ? d.itens : [])
      .slice(0, 200)
      .map((i) => ({
        ticker: String(i.ticker ?? "")
          .trim()
          .slice(0, 40),
        categoria: String(i.categoria ?? "").slice(0, 40),
      }))
      .filter((i) => i.ticker.length > 0),
  }))
  .handler(async ({ data }): Promise<RespostaCotacoes> => {
    if (data.itens.length === 0) return { cotacoes: [], atualizadoEm: new Date().toISOString() };
    const { cotarCarteira } = await import("@/lib/cotacoes.server");
    const cotacoes = await cotarCarteira(data.itens);
    return { cotacoes, atualizadoEm: new Date().toISOString() };
  });
