import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  LinhaTabela,
  PaginaIndexada,
  PainelSeo,
  SerieDia,
  StatusSitemap,
  TotaisSeo,
} from "@/lib/seo.server";

export type { LinhaTabela, PaginaIndexada, PainelSeo, SerieDia, StatusSitemap, TotaisSeo };

export type RespostaPainelSeo =
  | { status: "selecionado"; painel: PainelSeo }
  | { status: "selecao_necessaria"; candidatos: string[] };

const entrada = z.object({ siteUrl: z.string().optional() });

/** Métricas de indexação, erros e performance de busca do Google Search Console. */
export const obterPainelSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entrada.parse(data ?? {}))
  .handler(async ({ data }): Promise<RespostaPainelSeo> => {
    const { carregarPainelSeo } = await import("@/lib/seo.server");
    return carregarPainelSeo(data.siteUrl);
  });
