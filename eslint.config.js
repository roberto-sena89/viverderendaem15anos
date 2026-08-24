import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      ".wrangler",
      "node_modules",
      "src/routeTree.gen.ts",
      // Gerados pelo plugin mcp-js a cada build/dev — o prettier não controla
      // o formato da saída do gerador. (ESLint usa o pacote `ignore`, que não
      // escapa colchetes; casamos pelo nome do diretório.)
      "src/routes/mcp.ts",
      "**/*.mcp*/**",
      "**/*.well-known*/**",
      // Scaffold Vite padrão commitado por engano — não faz parte do app.
      "viverderendaem15anos/**",
      // Specs Playwright fora do escopo do tsconfig (executados via Playwright).
      "tests/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
      // detect-object-injection dispara em qualquer acesso com colchetes
      // (obj[key]) — 90% falsos positivos em apps assim; vira warning para
      // nao travar o CI, mas continua visivel na revisao.
      "security/detect-object-injection": "warn",
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Substitui o `no-unused-vars` do core (impreciso com TS) pelo equivalente type-aware.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Bloqueia `any` explícito (as any, : any, <any>, catch de erro).
      "@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: true }],
      // Onde o `any` é criado implicitamente a partir de fonte não tipada — núcleo da proteção.
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      // `never` não é aceitável para valores em tempo de execução.
      "@typescript-eslint/no-unsafe-function-type": "error",
      // Asserções desnecessárias fazem o tipo mentir.
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      // Dívida legada (padrão Lovable): promessas em atributos de evento e uso
      // solto de `await`/`throw`. Deixadas como aviso — não violam tipos.
      "@typescript-eslint/no-misused-promises": ["warn", { checksVoidReturn: false }],
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/only-throw-error": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/no-unsafe-enum-comparison": "warn",
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      "@typescript-eslint/await-thenable": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
    },
  },
  eslintPluginPrettier,
);
