import { createFileRoute } from "@tanstack/react-router";
import { PROVEDORES_ENV } from "@/lib/provedores-env.server";
import { PRESETS_PROVEDOR } from "@/lib/provedor-ia";
import {
  modelosConfiguradosDe,
  verificarModelosGratuitos,
  type RelatorioVerificacao,
} from "@/lib/verificar-modelos-gratuitos.server";

/** Cache em memória: verificação pesada fica válida por 6 horas. */
let cache: { quando: number; relatorio: RelatorioVerificacao } | null = null;
const TTL_CACHE_MS = 6 * 60 * 60 * 1000;

export const Route = createFileRoute("/api/modelos-gratuitos")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const forcar = new URL(request.url).searchParams.get("forcar") === "1";
        if (cache && !forcar && Date.now() - cache.quando < TTL_CACHE_MS) {
          return Response.json(cache.relatorio);
        }
        const configurados = modelosConfiguradosDe(PROVEDORES_ENV, PRESETS_PROVEDOR);
        const relatorio = await verificarModelosGratuitos(process.env, configurados);
        cache = { quando: Date.now(), relatorio };
        return Response.json(relatorio);
      },
    },
  },
});
