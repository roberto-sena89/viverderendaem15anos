// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

// h3's HTTPError serializes to {"status":500,"unhandled":true,"message":"HTTPError"} —
// no stack, no cause — so a plain console.error(error) reaches the log pipeline with
// the failure detail stripped. Expand Error-like args into a string that keeps the
// message, stack, and the full cause chain.
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

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Erros de desconexão do cliente: o navegador (ou proxy) fechou a conexão no
 * meio de um stream/SSR. O Node lança "Error: aborted" (abortIncoming) na
 * camada HTTP e não há como entregar a resposta — não é falha do servidor.
 */
const PADROES_DESCONEXAO =
  /aborted|abort ?error|operation was aborted|socket hang up|ECONNRESET|premature close|EPIPE|ERR_STREAM_PREMATURE_CLOSE|ABORT_ERR/i;

export function isClientDisconnectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { code } = error as { code?: unknown };
  const texto = `${error.name} ${error.message} ${typeof code === "string" ? code : ""}`;
  return PADROES_DESCONEXAO.test(texto);
}

// Wrap console.error so errors logged by any layer — including h3's internal
// unhandled-error logging, which this file cannot hook directly — are both
// recorded for consumeLastCapturedError and expanded before serialization.
// Desconexões do cliente (aborted/ECONNRESET) não são registradas como erro.
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (args.some(isClientDisconnectError)) {
    originalConsoleError("[server] cliente desconectou durante a resposta; ignorado.");
    return;
  }
  const expanded = args.map((arg) => {
    if (!isErrorLike(arg)) return arg;
    record(arg);
    return describeError(arg);
  });
  originalConsoleError(...expanded);
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record(event.error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) => record(event.reason));
}

// O Node lança "Error: aborted" como uncaughtException quando o cliente fecha
// o socket no meio de um stream (abortIncoming em node:_http_server). Sem um
// handler, o runtime reporta como RUNTIME_ERROR e pode derrubar a instância.
//
// Usamos setUncaughtExceptionCaptureCallback (em vez de process.on) porque o
// capture callback SUBSTITUI todos os listeners de 'uncaughtException' do
// processo — inclusive os do runtime da plataforma, que reportariam a
// desconexão benigna como RUNTIME_ERROR com tela em branco. O callback assume
// a responsabilidade de decidir o destino de todo erro não capturado:
// desconexões são ignoradas; erros reais são logados (e registrados para o
// normalizeCatastrophicSsrResponse via console.error) sem derrubar o processo.
if (typeof process !== "undefined" && typeof process.on === "function") {
  const captureCallbackJaAtivo =
    typeof process.hasUncaughtExceptionCaptureCallback === "function" &&
    process.hasUncaughtExceptionCaptureCallback();

  if (
    typeof process.setUncaughtExceptionCaptureCallback === "function" &&
    !captureCallbackJaAtivo
  ) {
    process.setUncaughtExceptionCaptureCallback((error) => {
      if (isClientDisconnectError(error)) {
        originalConsoleError("[server] cliente desconectou durante a resposta; ignorado.");
        return;
      }
      originalConsoleError(describeError(error));
    });
  } else if (typeof process.setUncaughtExceptionCaptureCallback !== "function") {
    process.on("uncaughtException", (error) => {
      if (isClientDisconnectError(error)) {
        originalConsoleError("[server] cliente desconectou durante a resposta; ignorado.");
        return;
      }
      originalConsoleError(describeError(error));
    });
  }
  process.on("unhandledRejection", (reason) => {
    if (isClientDisconnectError(reason)) {
      originalConsoleError("[server] cliente desconectou durante a resposta; ignorado.");
      return;
    }
    originalConsoleError(reason instanceof Error ? describeError(reason) : reason);
  });
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
