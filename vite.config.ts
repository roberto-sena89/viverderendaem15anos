// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

/**
 * Evita que desconexões do cliente (navegação/aba fechada durante o SSR ou
 * stream) virem erro não tratado no servidor Node. Sem um listener de "error"
 * na requisição bruta, o `abortIncoming` do Node emite `Error: aborted` no
 * fechamento do socket (`socketOnClose`) e a exceção escapa — interrompendo o
 * stream de HTML e gerando tela em branco para quem navegou. Isso NÃO captura o
 * caminho do `fetch` (já tratado em src/server.ts); atua na camada HTTP onde o
 * `socketOnClose` ocorre fora do `try/catch`.
 */
function suppressClientDisconnectErrors(): Plugin {
  return {
    name: "suppress-client-disconnect-errors",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const onError = (err: NodeJS.ErrnoException) => {
          if (!isDisconnectError(err)) {
            console.error("[server] erro de conexão não tratado:", err);
          }
        };
        req.on("error", onError);
        res.on("error", onError);
        next();
      });
      // Evita crash do watcher em .output (Windows UNKNOWN scandir) e silencia aborts
      const watcher = (server.watcher as unknown as { on?: (ev: string, cb: (e: Error) => void) => void })?.on;
      if (typeof watcher === "function") {
        server.watcher.on("error", (err: NodeJS.ErrnoException & { path?: string }) => {
          if (err?.code === "UNKNOWN" && String(err.path ?? "").includes(".output")) return;
          if (isDisconnectError(err)) return;
          console.warn("[watcher] ignorado:", err.message ?? err);
        });
      }
      // srvx aborta a conexão no close do socket fora do fetch — suprime para não gerar blank screen
      server.httpServer?.on("error", (err: NodeJS.ErrnoException) => {
        if (isDisconnectError(err)) return;
        console.error("[http] erro não tratado:", err);
      });
    },
  };
}

function isDisconnectError(err: NodeJS.ErrnoException | null | undefined): boolean {
  if (!err) return false;
  const code = err.code;
  if (
    code === "ECONNABORTED" ||
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ENOTCONN" ||
    code === "ERR_STREAM_PREMATURE_CLOSE"
  ) {
    return true;
  }
  return (err.message ?? "").toLowerCase().includes("aborted");
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Cache de borda das páginas públicas (respostas SSR cacheadas na CDN;
  // revalidação em background, sem impacto para quem navega).
  //
  // O wrapper tipa só `preset/output/cloudflare`, mas em runtime ele repassa
  // o objeto `nitro` inteiro para o plugin — `routeRules` é suportado.
  nitro: {
    routeRules: {
      "/": { swr: 3600 },
      "/conteudo/**": { swr: 3600 },
      "/calculadora-juros-compostos": { swr: 3600 },
      "/quanto-rende-1-milhao-por-mes": { swr: 3600 },
      "/o-que-e-renda-passiva": { swr: 3600 },
      "/guia-liberdade-financeira": { swr: 86400 },
      "/blog/**": { swr: 86400 },
      "/sitemap.xml": { swr: 300 },
      "/robots.txt": { swr: 300 },
    },
  } as never,
  vite: {
    server: {
      watch: { ignored: ["**/.output/**", "**/node_modules/.vite/**"] },
      allowedHosts: [".monkeycode-ai.live"],
      headers: {
        // SECURITY HEADERS
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        // Content-Security-Policy (adjust based on your specific needs)
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "connect-src 'self' https://api.openai.com https://moonshotai.com https://*.supabase.co",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    },
    plugins: [suppressClientDisconnectErrors(), mcpPlugin()],
  },
});
