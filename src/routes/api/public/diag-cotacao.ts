import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/diag-cotacao")({
  server: {
    handlers: {
      GET: async () => {
        const out: Record<string, unknown> = {};
        try {
          const r = await fetch("https://brapi.dev/api/quote/PETR4,VALE3,ITUB4", {
            headers: { Accept: "application/json" },
          });
          out.brapi = { status: r.status, body: (await r.text()).slice(0, 200) };
        } catch (e) {
          out.brapi = { erro: String(e) };
        }
        try {
          const r = await fetch(
            "https://query1.finance.yahoo.com/v8/finance/chart/PETR4.SA?range=1d&interval=1d",
          );
          out.yahoo = { status: r.status, body: (await r.text()).slice(0, 120) };
        } catch (e) {
          out.yahoo = { erro: String(e) };
        }
        try {
          const m = await import("@/lib/market.server");
          out.fita = await m.buscarFita([
            { simbolo: "PETR4.SA", rotulo: "PETR4" },
            { simbolo: "BRL=X", rotulo: "USD" },
          ]);
        } catch (e) {
          out.fita = { erro: String(e) };
        }
        return Response.json(out);
      },
    },
  },
});
