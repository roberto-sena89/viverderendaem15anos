import { isClientDisconnectError } from "./error-capture";

/**
 * O adaptador HTTP do Node emite "Error: aborted" (abortIncoming) quando o
 * navegador fecha a conexão durante um stream/SSR. Esse erro nasce no socket,
 * fora da cadeia de middlewares, então só um handler de processo consegue
 * silenciá-lo. Sem isso, o runtime de dev derruba a página (tela branca).
 */
const CHAVE = "__ignorarDesconexaoRegistrado";

export function registrarIgnorarDesconexao(): void {
  const proc = (globalThis as { process?: NodeJS.Process }).process;
  if (!proc || typeof proc.on !== "function") return;

  const marcado = proc as unknown as Record<string, boolean>;
  if (marcado[CHAVE]) return;
  marcado[CHAVE] = true;

  proc.on("uncaughtException", (error) => {
    if (isClientDisconnectError(error)) {
      console.warn("[server] cliente desconectou (uncaughtException ignorado).");
      return;
    }
    throw error;
  });

  proc.on("unhandledRejection", (reason) => {
    if (isClientDisconnectError(reason)) {
      console.warn("[server] cliente desconectou (rejeição ignorada).");
      return;
    }
    throw reason;
  });
}
