// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

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
      allowedHosts: [".monkeycode-ai.live"],
    },
    plugins: [mcpPlugin()],
  },
});
