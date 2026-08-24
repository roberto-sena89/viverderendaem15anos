import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";

/**
 * Verificação horária dos modelos de IA gratuitos — sonda de verdade cada
 * modelo "free" do catálogo (chat/completions de 1 token) e persiste o
 * relatório no cotacoes_cache, para o Gestor IA saber exatamente quais
 * modelos gratuitos estão respondendo.
 *
 * Chamado pelo GitHub Actions (workflow verificar-modelos-horario.yml) a cada
 * 1 hora com o header x-cron-secret; também pode ser disparado manualmente.
 */

function autorizado(request: Request) {
  const esperado = process.env.CRON_SECRET ?? "";
  const recebido =
    request.headers.get("x-cron-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (esperado.length === 0 || recebido.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/hooks/verificar-modelos-gratuitos")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!autorizado(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
        const [mod, provedores, presets, supabase] = await Promise.all([
          import("@/lib/verificar-modelos-gratuitos.server"),
          import("@/lib/provedores-env.server"),
          import("@/lib/provedor-ia"),
          import("@/integrations/supabase/client.server"),
        ]);
        const configurados = mod.modelosConfiguradosDe(
          provedores.PROVEDORES_ENV,
          presets.PRESETS_PROVEDOR,
        );
        const relatorio = await mod.verificarModelosGratuitos(process.env, configurados, {
          sondar: true,
        });
        try {
          await supabase.supabaseAdmin.from("cotacoes_cache").upsert(
            {
              categoria: "modelos-gratuitos:relatorio",
              payload: JSON.parse(JSON.stringify(relatorio)) as Json,
              parcial: false,
              atualizado_em: new Date().toISOString(),
            },
            { onConflict: "categoria" },
          );
        } catch {
          /* best-effort: o relatório ainda é retornado na resposta */
        }
        const porProvedor = relatorio.provedores.map((p) => ({
          provedor: p.nome,
          status: p.status,
          total: p.modelosGratuitos.length,
          respondendo: p.modelosGratuitos.filter((m) => m.funcionando === true).length,
          rateLimit: p.modelosGratuitos.filter((m) => m.funcionando === undefined).length,
          falhando: p.modelosGratuitos.filter((m) => m.funcionando === false).length,
        }));
        return Response.json({
          ok: true,
          geradoEm: relatorio.geradoEm,
          resumo: relatorio.resumo,
          porProvedor,
          desaparecidos: relatorio.desaparecidos,
          novosSugeridos: relatorio.novosSugeridos.length,
        });
      },
    },
  },
});
