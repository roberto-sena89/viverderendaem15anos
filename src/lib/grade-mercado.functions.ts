import { createServerFn } from "@tanstack/react-start";
import type { CategoriaMercado, LinhaCotacao, RespostaGrade } from "@/lib/grade-mercado.server";

export type { CategoriaMercado, LinhaCotacao, RespostaGrade };

const CATEGORIAS: CategoriaMercado[] = [
  "acoes",
  "fiis",
  "futuros",
  "commodities",
  "etfs",
  "cripto",
  "cambio",
  "indices",
];

/** Cotações em lote de uma categoria de mercado (servidas pelo cache compartilhado). */
export const gradeMercado = createServerFn({ method: "GET" })
  .inputValidator((d: { categoria: string; forcar?: boolean }) => {
    const c = String(d?.categoria ?? "acoes") as CategoriaMercado;
    return {
      categoria: CATEGORIAS.includes(c) ? c : ("acoes" as CategoriaMercado),
      forcar: d?.forcar === true,
    };
  })
  .handler(async ({ data }): Promise<RespostaGrade> => {
    const { gradeComCache } = await import("@/lib/cotacoes-cache.server");
    return gradeComCache(data.categoria, { forcar: data.forcar });
  });

/** Painel da Visão Geral: índices, maiores altas e maiores baixas do dia. */
export const visaoGeralMercado = createServerFn({ method: "GET" }).handler(async () => {
  const { buscarVisaoGeral } = await import("@/lib/grade-mercado.server");
  return buscarVisaoGeral();
});

