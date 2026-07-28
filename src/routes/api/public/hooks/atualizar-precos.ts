import { createFileRoute } from "@tanstack/react-router";

/**
 * Job diário: atualiza `preco_atual` de todos os ativos com a cotação pública
 * mais recente. Chamado pelo pg_cron com o header `apikey`.
 */
export const Route = createFileRoute("/api/public/hooks/atualizar-precos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const esperado = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!esperado || apikey !== esperado) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const [{ supabaseAdmin }, mercado] = await Promise.all([
          import("@/integrations/supabase/client.server"),
          import("@/lib/market.server"),
        ]);

        const { data: ativos, error } = await supabaseAdmin.from("ativos").select("id, ticker");
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const tickers = Array.from(new Set((ativos ?? []).map((a) => String(a.ticker))));
        const precos = new Map<string, number>();
        const falhas: string[] = [];

        for (const ticker of tickers) {
          try {
            const c = await mercado.buscarCotacao(ticker);
            if (c.preco && c.preco > 0) precos.set(ticker, c.preco);
            else falhas.push(ticker);
          } catch {
            falhas.push(ticker);
          }
        }

        let atualizados = 0;
        for (const [ticker, preco] of precos) {
          const { error: upErr } = await supabaseAdmin
            .from("ativos")
            .update({ preco_atual: preco })
            .eq("ticker", ticker);
          if (!upErr) atualizados++;
        }

        return Response.json({
          ok: true,
          tickers: tickers.length,
          atualizados,
          falhas,
          executadoEm: new Date().toISOString(),
        });
      },
    },
  },
});
