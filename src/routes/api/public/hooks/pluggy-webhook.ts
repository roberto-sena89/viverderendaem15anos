import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Pluggy (Open Finance).
 *
 * O Pluggy envia eventos para este URL quando há mudanças na conexão do
 * usuário (item/created, item/updated, item/error, ...). Padrão recomendado
 * pela documentação:
 *   - Responder 2XX o MAIS RÁPIDO possível (limite de 5s), senão o Pluggy reenvia
 *     o mesmo evento (até 9x no total).
 *   - Processar o evento de forma ASSÍNCRONA, após responder.
 *
 * Para proteger o endpoint, configure opcionalmente a env var PLUGGY_WEBHOOK_SECRET
 * e registre este header no webhook do Pluggy (via API, no objeto `headers`):
 *   x-webhook-secret: <valor-de-PLUGGY_WEBHOOK_SECRET>
 * Sem secret configurado, o endpoint aceita qualquer POST (útil em ambiente
 * local/teste). A validação do clientId (PLUGGY_CLIENT_ID) também é aplicada
 * quando a env var estiver definida.
 */

function autorizado(request: Request): boolean {
  const segredo = process.env.PLUGGY_WEBHOOK_SECRET;
  if (segredo) {
    const recebido = request.headers.get("x-webhook-secret") ?? "";
    if (recebido.length !== segredo.length) return false;
    let diff = 0;
    for (let i = 0; i < segredo.length; i++) diff |= segredo.charCodeAt(i) ^ recebido.charCodeAt(i);
    return diff === 0;
  }
  return true;
}

function clientIdConfere(payload: { clientId?: string } | null): boolean {
  const esperado = process.env.PLUGGY_CLIENT_ID;
  if (!esperado || !payload?.clientId) return true;
  return payload.clientId === esperado;
}

export const Route = createFileRoute("/api/public/hooks/pluggy-webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!autorizado(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

        const corpo = (await request.json().catch(() => null)) as {
          clientId?: string;
          event?: string;
          eventId?: string;
          itemId?: string;
          error?: { code?: string; description?: string; detail?: string };
        } | null;

        if (!corpo || typeof corpo.event !== "string") {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }

        if (!clientIdConfere(corpo)) {
          return Response.json({ error: "invalid client_id" }, { status: 403 });
        }

        // IMPORTANTE: responde 2XX imediatamente e processa em seguida (assíncrono).
        // O Pluggy exige resposta em menos de 5 segundos para não reenviar o evento.
        const dados = {
          clientId: corpo.clientId,
          event: corpo.event,
          eventId: corpo.eventId,
          itemId: corpo.itemId,
          error: corpo.error,
        };
        void import("@/lib/pluggy-webhook.server").then(({ processarWebhookPluggy }) =>
          processarWebhookPluggy(dados),
        );

        return Response.json({ received: true });
      },
    },
  },
});
