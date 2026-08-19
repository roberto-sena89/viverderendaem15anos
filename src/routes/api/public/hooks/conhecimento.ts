import { createFileRoute } from "@tanstack/react-router";

/**
 * Conhecimento de mercado — atualiza a base do Gestor IA varrendo a internet
 * (Banco Central, feeds de notícias e Google News educacional).
 *
 * Chamado pelo GitHub Actions (workflow conhecimento.yml) a cada 20 min com o
 * header x-cron-secret; também pode ser disparado manualmente. O módulo
 * server aplica intervalo mínimo de 10 min entre scans.
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

export const Route = createFileRoute("/api/public/hooks/conhecimento")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!autorizado(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
        const mod = await import("@/lib/conhecimento.server");
        const base = await mod.executarScanComThrottle();
        return Response.json({
          ok: true,
          atualizadoEm: base.atualizadoEm,
          itens: base.itens.length,
          erro: base.erro,
        });
      },
    },
  },
});