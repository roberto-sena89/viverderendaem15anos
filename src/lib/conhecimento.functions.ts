/**
 * Conhecimento de mercado — server functions (TanStack Start).
 * `lerConhecimentoMercado` devolve a base persistida; `executarScanMercado`
 * dispara um scan da internet agora (autenticado, com intervalo mínimo).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BaseConhecimento } from "@/lib/conhecimento.server";

export type { BaseConhecimento, ConhecimentoItem } from "@/lib/conhecimento.server";

export interface ResultadoScanConhecimento {
  base: BaseConhecimento;
  ignorado: boolean;
}

export interface ResultadoPainelAnalista {
  base: BaseConhecimento;
  gerouComIA: boolean;
}


export const lerConhecimentoMercado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: { userId: string } }): Promise<BaseConhecimento> => {
    const mod = await import("@/lib/conhecimento.server");
    return mod.lerConhecimentoDoUsuario(context.userId);
  });


export const executarScanMercado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }: { context: { userId: string } }): Promise<ResultadoScanConhecimento> => {
      const mod = await import("@/lib/conhecimento.server");
      const radarServer = await import("@/lib/radar.server");
      if (!radarServer.limitePorUsuario("conhecimento:scan", context.userId, 3, 10 * 60_000)) {
        const base = await mod.lerConhecimento();
        return { base, ignorado: true };
      }
      const base = await mod.executarScanComThrottle();
      return { base, ignorado: base.atualizadoEm !== new Date().toISOString() };
    },
  );

/** Repete o prompt do "Painel do analista" sem refazer o scan da internet. */
export const recarregarPainelAnalista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }: { context: { userId: string } }): Promise<ResultadoPainelAnalista> => {
      const radarServer = await import("@/lib/radar.server");
      if (!radarServer.limitePorUsuario("conhecimento:painel", context.userId, 5, 10 * 60_000)) {
        throw new Error("Muitas recargas seguidas. Aguarde alguns minutos e tente novamente.");
      }
      const mod = await import("@/lib/conhecimento.server");
      const r = await mod.regerarPainelAnalista(new Date(), context.userId);
      return { base: r.base, gerouComIA: r.gerouComIA };

    },
  );
