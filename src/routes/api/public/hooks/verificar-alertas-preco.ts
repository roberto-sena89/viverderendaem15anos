import { createFileRoute } from "@tanstack/react-router";

// Hook público (CRON_SECRET) que verifica todos os alertas de preço ativos e
// dispara Web Push para os usuários cujos alvos foram atingidos.
//
// Agendamento via GitHub Actions (.github/workflows/verificar-alertas.yml):
// a cada 15 minutos o workflow chama este endpoint com o header
// `x-cron-secret` igual à env `CRON_SECRET` do deploy (Lovable Cloud).
// Alternativa manual: POST para esta URL com o mesmo header.

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

export const Route = createFileRoute("/api/public/hooks/verificar-alertas-preco")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!autorizado(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

        try {
          const { executarVerificacaoAlertas } = await import("@/lib/alertas-preco.server");
          const resultado = await executarVerificacaoAlertas();
          return Response.json({ ok: true, ...resultado });
        } catch (err) {
          console.error("[alertas-preco] erro na verificação:", err);
          return Response.json({ error: "Falha na verificação", ok: false }, { status: 500 });
        }
      },
    },
  },
});
