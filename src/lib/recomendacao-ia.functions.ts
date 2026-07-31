import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EntradaRecomendacao, RespostaRecomendacao } from "@/lib/recomendacao-ia.server";

export const gerarRecomendacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EntradaRecomendacao) => ({
    perfil: String(input.perfil ?? "Moderado").slice(0, 40),
    horizonte: String(input.horizonte ?? "").slice(0, 60),
    objetivo: String(input.objetivo ?? "").slice(0, 60),
    valor: Number.isFinite(Number(input.valor)) ? Math.max(Number(input.valor), 0) : 0,
  }))
  .handler(async ({ data }): Promise<RespostaRecomendacao> => {
    const { gerarRecomendacaoIA } = await import("@/lib/recomendacao-ia.server");
    return gerarRecomendacaoIA(data);
  });
