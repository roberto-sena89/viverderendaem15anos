import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "listar_carteira",
  title: "Listar carteira",
  description: "Lista todos os ativos da carteira do usuário (ticker, categoria, quantidade, preço médio, preço atual e DY).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const { data, error } = await supabaseForUser(ctx)
      .from("ativos")
      .select("ticker, nome, categoria, quantidade, preco_medio, preco_atual, dy")
      .order("ticker");
    if (error) return errorResult(error.message);

    const ativos = (data ?? []).map((a) => ({
      ...a,
      valor_atual: Number(a.quantidade) * Number(a.preco_atual),
      lucro: (Number(a.preco_atual) - Number(a.preco_medio)) * Number(a.quantidade),
    }));
    return textResult(JSON.stringify(ativos, null, 2), { ativos });
  },
});
