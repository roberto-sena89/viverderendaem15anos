// Expand Error-like values while preserving their cause chain for useful logs.
const CAUSE_DEPTH_LIMIT = 5;
const DESCRIPTION_LENGTH_LIMIT = 8_000;

export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(typeof current === "string" ? current : safeStringify(current));
      break;
    }
    const label = depth === 0 ? "" : "caused by: ";
    const status = describeStatus(current);
    parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}${status}`);
    current = current.cause;
  }
  return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}

function describeStatus(error: Error): string {
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const value = status ?? statusCode;
  return typeof value === "number" ? ` (status ${value})` : "";
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Erros de desconexão do cliente: o navegador (ou proxy) fechou a conexão no
 * meio de um stream/SSR. O Node lança "Error: aborted" (abortIncoming) na
 * camada HTTP e não há como entregar a resposta — não é falha do servidor.
 */
const PADROES_DESCONEXAO =
  /aborted|abort ?error|operation was aborted|socket hang up|ECONNRESET|premature close|EPIPE|ERR_STREAM_PREMATURE_CLOSE|ABORT_ERR/i;

export function isClientDisconnectError(error: unknown): boolean {
  let atual: unknown = error;

  for (let profundidade = 0; profundidade < CAUSE_DEPTH_LIMIT && atual != null; profundidade++) {
    if (typeof atual === "string") return PADROES_DESCONEXAO.test(atual);
    if (typeof atual !== "object") return false;

    const { name, message, code, cause } = atual as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      cause?: unknown;
    };
    const texto = [name, message, code].filter((valor) => typeof valor === "string").join(" ");
    if (PADROES_DESCONEXAO.test(texto)) return true;
    atual = cause;
  }

  return false;
}

