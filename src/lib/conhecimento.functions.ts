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

export const lerConhecimentoMercado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<BaseConhecimento> => {
    const mod = await import("@/lib/conhecimento.server");
    return mod.lerConhecimento();
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
