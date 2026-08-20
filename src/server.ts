import { isClientDisconnectError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      // Return the response stream untouched. Cloning/reading it here keeps a
      // second reader alive and turns normal preview navigation cancellation
      // into an uncaught AbortError in the Node HTTP adapter.
      return await handler.fetch(request, env, ctx);
    } catch (error) {
      if (isClientDisconnectError(error)) {
        // Cliente fechou a conexão durante o stream/SSR: não há resposta a
        // entregar e não é falha do servidor. 499 = cliente desconectado.
        console.warn("[server] cliente desconectou durante a resposta; ignorado.");
        return new Response(null, { status: 499 });
      }
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
