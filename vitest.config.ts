import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Config do Vitest: resolve o vite.config.ts do projeto (plugins, alias @/,
// TanStack) e adiciona include/exclude de testes:
// - so testes dentro de src/ (o default "**" varre tudo, incluindo o worktree
//   .kilo e os specs do Playwright em tests/);
// - exclui .kilo, tests/e2e, playwright-report e test-results.
export default defineConfig(async (env) => {
  const base = await viteConfig(env);
  return {
    ...base,
    test: {
      include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.output/**",
        "**/cypress/**",
        "**/.{idea,git,cache,output,temp}/**",
        "**/.kilo/**",
        "tests/**",
        "playwright-report/**",
        "test-results/**",
      ],
    },
  };
});
