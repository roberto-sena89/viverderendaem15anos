/**
 * Client entry — bootstrap do app no navegador.
 *
 * Inicializa Sentry (se configurado), registra o Service Worker (PWA + Web Push)
 * em produção, e hidrata o React Router.
 */
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

/* ------------------------------------------------------------------ *
 * Sentry (browser) — opcional, ativado por VITE_SENTRY_DSN
 * ------------------------------------------------------------------ */
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (typeof window !== "undefined" && SENTRY_DSN) {
  // dynamic import evita que o módulo Sentry seja avaliado quando não há DSN
  void import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE || "production",
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event) {
          // Não enviar erros de desconexão do cliente (navegação cancelada, HMR)
          if (
            event?.exception?.values?.[0]?.value?.match(
              /aborted|abort|socket hang up|ECONNRESET|premature close/i,
            )
          ) {
            return null;
          }
          return event;
        },
      });
      // Expõe no window para o reportLovableError encaminhar para o Sentry
      const win = window as unknown as Record<string, unknown>;
      win.__sentryIntegrado = true;
    })
    .catch(() => {
      // falha silenciosa — Sentry é opcional
    });
}

/* ------------------------------------------------------------------ *
 * Service Worker (PWA + Web Push) — apenas em produção
 * ------------------------------------------------------------------ */
if (typeof window !== "undefined" && "serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // silencioso — Progressive Enhancement: PWA é bônus, não requisito
    });
  });
}

/* ------------------------------------------------------------------ *
 * Hidratação do React (o StartClient resolve o router em src/router.tsx)
 * ------------------------------------------------------------------ */
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
