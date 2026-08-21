import { createServerFn } from "@tanstack/react-start";
import type { LinhaIndice, RespostaIndices } from "@/lib/indices-base";

export type { LinhaIndice, RespostaIndices };

/** Grade completa de índices e taxas de referência (cache compartilhado). */
export const gradeIndices = createServerFn({ method: "GET" })
  .validator((d?: { forcar?: boolean }) => ({ forcar: d?.forcar === true }))
  .handler(async ({ data }): Promise<RespostaIndices> => {
    const { buscarIndices } = await import("@/lib/indices.server");
    return buscarIndices(data.forcar);
  });
