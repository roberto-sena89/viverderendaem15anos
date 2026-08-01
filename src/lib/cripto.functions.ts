import { createServerFn } from "@tanstack/react-start";
import type { RespostaCripto } from "@/lib/cripto-base";
import type { PontoHistorico } from "@/lib/cripto.server";

/** Grade completa de criptomoedas (preço USD/BRL, variações e capitalização). */
export const gradeCripto = createServerFn({ method: "GET" })
  .inputValidator((d: { forcar?: boolean } | undefined) => ({ forcar: d?.forcar === true }))
  .handler(async ({ data }): Promise<RespostaCripto> => {
    const { gradeCriptoComCache } = await import("@/lib/cripto.server");
    return gradeCriptoComCache(data.forcar);
  });

/** Série histórica de uma criptomoeda para o modal de detalhes. */
export const historicoMoeda = createServerFn({ method: "GET" })
  .inputValidator((d: { id?: unknown; dias?: unknown }) => ({
    id: String(d?.id ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 60),
    dias: ["1", "7", "30", "90", "365", "max"].includes(String(d?.dias)) ? String(d?.dias) : "30",
  }))
  .handler(async ({ data }): Promise<PontoHistorico[]> => {
    if (!/^[a-z0-9-]{2,60}$/.test(data.id)) return [];
    const { historicoCripto } = await import("@/lib/cripto.server");
    return historicoCripto(data.id, data.dias);
  });
