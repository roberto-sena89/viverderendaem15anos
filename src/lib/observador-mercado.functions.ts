/**
 * Observador de Mercado — server functions (TanStack Start).
 * `lerObservadorMercado` devolve o estado persistido; `executarObservadorMercado`
 * dispara uma varredura agora (autenticado + limitado por usuário).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EstadoObservador } from "@/lib/observador-mercado.server";

export type { EstadoObservador } from "@/lib/observador-mercado.server";

export interface ResultadoExecucaoObservador {
  ignorado: boolean;
  proximaEmMin: number | null;
  estado: EstadoObservador;
  erro?: string;
}

export const lerObservadorMercado = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstadoObservador> => {
    const mod = await import("@/lib/observador-mercado.server");
    return mod.lerEstadoObservador();
  },
);

export const executarObservadorMercado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }: { context: { userId: string } }): Promise<ResultadoExecucaoObservador> => {
      const mod = await import("@/lib/observador-mercado.server");
      const radarServer = await import("@/lib/radar.server");
      if (!radarServer.limitePorUsuario("observador:executar", context.userId, 5, 10 * 60_000)) {
        const estado = await mod.lerEstadoObservador();
        return {
          ignorado: true,
          proximaEmMin: 10,
          estado,
          erro: "Muitas varreduras em pouco tempo. Aguarde alguns minutos.",
        };
      }
      const resultado = await mod.executarVarredura();
      return {
        ignorado: resultado.ignorado,
        proximaEmMin: resultado.ignorado
          ? resultado.proximaEm
            ? Math.ceil(resultado.proximaEm / 60_000)
            : null
          : null,
        estado: resultado.estado,
        ...(!resultado.ignorado && resultado.varredura.erro
          ? { erro: resultado.varredura.erro }
          : {}),
      };
    },
  );
