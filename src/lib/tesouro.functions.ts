import { createServerFn } from "@tanstack/react-start";
import type { LinhaTesouro, RespostaTesouro } from "@/lib/tesouro-base";

export type { LinhaTesouro, RespostaTesouro };

/** Grade completa dos títulos públicos ofertados (cache compartilhado). */
export const gradeTesouro = createServerFn({ method: "GET" })
  .validator((d?: { forcar?: boolean }) => ({ forcar: d?.forcar === true }))
  .handler(async ({ data }): Promise<RespostaTesouro> => {
    const { buscarTesouro } = await import("@/lib/tesouro-grade.server");
    return buscarTesouro(data.forcar);
  });
