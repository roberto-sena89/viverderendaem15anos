import { createServerFn } from "@tanstack/react-start";
import type { LinhaCommodity, RespostaCommodities } from "@/lib/commodities-base";

export type { LinhaCommodity, RespostaCommodities };

/** Grade completa de commodities internacionais + câmbio USD/BRL. */
export const gradeCommodities = createServerFn({ method: "GET" })
  .inputValidator((d?: { forcar?: boolean }) => ({ forcar: d?.forcar === true }))
  .handler(async ({ data }): Promise<RespostaCommodities> => {
    const { buscarCommodities } = await import("@/lib/commodities.server");
    return buscarCommodities(data.forcar);
  });
