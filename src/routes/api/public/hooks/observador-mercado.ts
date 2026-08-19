import { createFileRoute } from "@tanstack/react-router";

/**
 * Observador de Mercado — varredura automática do Radar com a IA do usuário,
 * chamado pelo pg_cron (ex.: a cada 20 minutos).
 *
 * O hook apenas dispara a varredura; a lógica (candidatos, chamada ao
 * provedor gratuito configurado nas variáveis de ambiente e persistência)
 * vive em `src/lib/observador-mercado.server.ts`, que aplica um intervalo
 * mínimo de 10 min entre execuções.
 *
 * Agendamento no Supabase (SQL editor):
 *   select cron.schedule('observador-mercado', '0,20,40 * * * *', $$
 *     select net.http_post(
 *       url := 'https://SEU-APP.lovable.app/api/public/hooks/observador-mercado',
 *       headers := jsonb_build_object(
 *         'content-type', 'application/json',
 *         'x-cron-secret', current_setting('app.cron_secret', true)
 *       ),
 *       body := '{}'
 *     ) $$);
 * (o valor de x-cron-secret deve ser igual à env var CRON_SECRET do deploy)
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

export const Route = createFileRoute("/api/public/hooks/observador-mercado")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!autorizado(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
        const mod = await import("@/lib/observador-mercado.server");
        const resultado = await mod.executarVarredura();
        if (resultado.ignorado) {
          return Response.json({
            ok: true,
            ignorado: true,
            proximaEmMin: resultado.proximaEm ? Math.ceil(resultado.proximaEm / 60_000) : null,
            executadaEm: resultado.estado.atual?.executadaEm ?? null,
          });
        }
        return Response.json({
          ok: true,
          ignorado: false,
          varredura: {
            executadaEm: resultado.varredura.executadaEm,
            provedor: resultado.varredura.provedor,
            modelo: resultado.varredura.modelo,
            duracaoMs: resultado.varredura.duracaoMs,
            totalCandidatos: resultado.varredura.totalCandidatos,
            oportunidades: resultado.varredura.oportunidades.length,
            erro: resultado.varredura.erro,
          },
        });
      },
    },
  },
});
