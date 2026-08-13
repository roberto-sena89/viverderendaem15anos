import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "listar_dividendos",
  title: "Listar dividendos",
  description: "Lista os proventos recebidos pelo usuário, do mais recente para o mais antigo.",
  inputSchema: {
    ticker: z.string().optional().describe("Filtrar por ticker, ex.: BBAS3."),
    limite: z.number().optional().describe("Quantidade máxima de registros (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ticker, limite }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    let query = supabaseForUser(ctx)
      .from("dividendos")
      .select("data, ticker, tipo, valor")
      .order("data", { ascending: false })
      .limit(Math.min(Math.max(limite ?? 50, 1), 200));
    if (ticker) query = query.eq("ticker", ticker.toUpperCase());

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    const total = (data ?? []).reduce((s, d) => s + Number(d.valor), 0);
    return textResult(JSON.stringify({ total, dividendos: data ?? [] }, null, 2), {
      total,
      dividendos: data ?? [],
    });
  },
});
