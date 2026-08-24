import { createFileRoute } from "@tanstack/react-router";

/**
 * Hook público (CRON_SECRET) que envia notificações Web Push para todos os
 * usuários ou para um usuário específico.
 *
 * Agendamento no Supabase (SQL editor):
 *   select cron.schedule('notificar-push-radar', '31,58 * * * *', $$
 *     select net.http_post(
 *       url := 'https://SEU-APP.lovable.app/api/public/hooks/notificar-push',
 *       headers := jsonb_build_object(
 *         'content-type', 'application/json',
 *         'x-cron-secret', current_setting('app.cron_secret', true)
 *       ),
 *       body := '{"tipo":"radar-novidades"}'
 *     ) $$);
 *
 * Body opcional:
 *   { "tipo": "custom", "userId": "uuid", "titulo": "...", "corpo": "..." }
 *   { "tipo": "radar-novidades" }  — envia "Novas oportunidades no radar"
 *   { "tipo": "resumo-semanal" }   — envia resumo semanal (placeholder)
 *   { "tipo": "broadcast", "titulo": "...", "corpo": "..." }
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

export const Route = createFileRoute("/api/public/hooks/notificar-push")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!autorizado(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

        const supabase = await import("@/integrations/supabase/client.server");
        const pushServer = await import("@/lib/push-server");

        let corpo: Record<string, unknown> = {};
        try {
          corpo = (await request.json()) as Record<string, unknown>;
        } catch {
          /* sem corpo = broadcast genérico */
        }

        const tipo = (corpo.tipo as string) ?? "radar-novidades";
        const userId = corpo.userId as string | undefined;

        try {
          switch (tipo) {
            case "custom": {
              if (!userId) {
                return Response.json(
                  { error: "userId obrigatório para tipo custom" },
                  { status: 400 },
                );
              }
              const titulo = (corpo.titulo as string) || "Viver de Renda em 15 Anos";
              const corpoMsg = (corpo.corpo as string) || "";
              const resultado = await pushServer.enviarPushParaUsuario(
                supabase.supabaseAdmin,
                userId,
                { titulo, corpo: corpoMsg, url: corpo.url as string | undefined },
              );
              return Response.json({ ok: true, ...resultado });
            }

            case "radar-novidades": {
              // Envia para todos os usuários com assinatura push
              const resultado = await pushServer.enviarPushBroadcast(supabase.supabaseAdmin, {
                titulo: "🔍 Radar de Oportunidades",
                corpo: "Novas oportunidades detectadas no mercado. Confira no Radar!",
                url: "/radar",
                tag: "radar-novidades",
              });
              return Response.json({ ok: true, ...resultado });
            }

            case "resumo-semanal": {
              const resultado = await pushServer.enviarPushBroadcast(supabase.supabaseAdmin, {
                titulo: "📊 Resumo da Semana",
                corpo: "Veja como sua carteira se comportou esta semana.",
                url: "/dashboard",
                tag: "resumo-semanal",
              });
              return Response.json({ ok: true, ...resultado });
            }

            case "broadcast": {
              const resultado = await pushServer.enviarPushBroadcast(supabase.supabaseAdmin, {
                titulo: (corpo.titulo as string) || "Viver de Renda em 15 Anos",
                corpo: (corpo.corpo as string) || "",
                url: (corpo.url as string) || "/",
                tag: (corpo.tag as string) || "broadcast",
              });
              return Response.json({ ok: true, ...resultado });
            }

            default:
              return Response.json({ error: `tipo desconhecido: ${tipo}` }, { status: 400 });
          }
        } catch (err) {
          console.error("[push] erro ao enviar notificação:", err);
          return Response.json(
            { error: "Falha ao enviar notificações", ok: false },
            { status: 500 },
          );
        }
      },
    },
  },
});
