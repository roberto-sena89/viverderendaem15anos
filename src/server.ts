import { isClientDisconnectError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

/**
 * Desconexões do cliente (fechar aba, navegar durante um stream/SSR) chegam ao
 * Node como "Error: aborted" vindo de `abortIncoming`, fora da cadeia de
 * middlewares. Sem tratamento viram uncaughtException e derrubam o processo do
 * servidor de desenvolvimento — o que aparece como tela branca no preview.
 * Aqui elas são ignoradas; qualquer outro erro segue o fluxo normal.
 */
function ignorarDesconexoesDoCliente() {
  const proc = (globalThis as { process?: NodeJS.Process }).process;
  if (!proc || typeof proc.on !== "function") return;
  const marca = "__ignorarDesconexoesDoCliente";
  const registro = proc as unknown as Record<string, unknown>;
  if (registro[marca]) return;
  registro[marca] = true;

  proc.on("uncaughtException", (erro) => {
    if (isClientDisconnectError(erro)) return;
    throw erro;
  });
  proc.on("unhandledRejection", (motivo) => {
    if (isClientDisconnectError(motivo)) return;
    console.error(motivo);
  });
}

ignorarDesconexoesDoCliente();


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
        // Preserve o cancelamento original. Converter em 499 faz o roteador
        // interpretar uma navegação cancelada como erro de página.
        throw error;
      }
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
