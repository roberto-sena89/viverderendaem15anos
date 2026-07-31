import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/debug-ticker")({
  server: {
    handlers: {
      GET: async () => {
        const { cotacoesFita } = await import("@/services/brapi.server");
        try {
          return new Response(JSON.stringify(await cotacoesFita()), {
            headers: { "content-type": "application/json" },
          });
        } catch (e) {
          return new Response(String(e), { status: 500 });
        }
      },
    },
  },
});
