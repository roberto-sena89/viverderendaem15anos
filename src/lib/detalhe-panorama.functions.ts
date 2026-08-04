import { createServerFn } from "@tanstack/react-start";

export type PontoSerie = { data: string; fechamento: number };

export type JanelaPerformance = {
  /** Rótulo curto da janela (1M, 3M, 6M, 1A, 5A). */
  rotulo: string;
  variacaoPercent: number | null;
};

export type DetalhePanorama = {
  simbolo: string;
  nome: string;
  moeda: string;
  serie: PontoSerie[];
  janelas: JanelaPerformance[];
  estatisticas: {
    maximo: number | null;
    minimo: number | null;
    retornoAnualizadoPercent: number | null;
    volatilidadeAnualPercent: number | null;
    drawdownMaximoPercent: number | null;
  };
};

/** Histórico semanal de 5 anos + performance por janela, para o modal de detalhe. */
export const detalhePanorama = createServerFn({ method: "GET" })
  .inputValidator((d: { simbolo: string }) => ({ simbolo: String(d.simbolo).slice(0, 24) }))
  .handler(async ({ data }): Promise<DetalhePanorama> => {
    const { montarDetalhe } = await import("@/lib/detalhe-panorama.server");
    return montarDetalhe(data.simbolo);
  });
