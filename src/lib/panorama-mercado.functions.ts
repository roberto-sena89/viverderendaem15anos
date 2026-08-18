import { createServerFn } from "@tanstack/react-start";
import type {
  LinhaResumo,
  MetricaResumo,
  PanoramaMercado,
  ResumoCategoria,
} from "@/lib/panorama-mercado.server";

export type { LinhaResumo, MetricaResumo, PanoramaMercado, ResumoCategoria };

/** Panorama consolidado de todas as abas do terminal de cotações. */
export const panoramaMercado = createServerFn({ method: "GET" }).handler(
  async (): Promise<PanoramaMercado> => {
    const { buscarPanorama } = await import("@/lib/panorama-mercado.server");
    return buscarPanorama();
  },
);
