import { createFileRoute } from "@tanstack/react-router";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export const Route = createFileRoute("/api/public/diag-cotacao")({
  server: {
    handlers: {
      GET: async () => {
        const out: Record<string, unknown> = {};
        const alvos: [string, string, HeadersInit][] = [
          ["brapiUA", "https://brapi.dev/api/quote/PETR4,VALE3,ITUB4", { "User-Agent": UA, Accept: "application/json" }],
          ["brapiSem", "https://brapi.dev/api/quote/PETR4,VALE3,ITUB4", { Accept: "application/json" }],
          ["yahooUA", "https://query1.finance.yahoo.com/v8/finance/chart/PETR4.SA?range=5d&interval=1d", { "User-Agent": UA, Accept: "application/json" }],
          ["yahooSem", "https://query1.finance.yahoo.com/v8/finance/chart/PETR4.SA?range=5d&interval=1d", {}],
        ];
        for (const [nome, url, headers] of alvos) {
          try {
            const r = await fetch(url, { headers });
            out[nome] = { status: r.status, body: (await r.text()).slice(0, 100) };
          } catch (e) {
            out[nome] = { erro: String(e) };
          }
        }
        return Response.json(out);
      },
    },
  },
});
