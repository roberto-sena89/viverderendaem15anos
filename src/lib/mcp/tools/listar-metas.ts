import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "listar_metas",
  title: "Listar metas",
  description: "Lista as metas patrimoniais do usuário com o progresso atual em relação ao patrimônio da carteira.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);

    const [{ data: metas, error }, { data: ativos }] = await Promise.all([
      supabase.from("metas").select("nome, alvo, ordem").order("ordem").order("alvo"),
      supabase.from("ativos").select("quantidade, preco_atual"),
    ]);
    if (error) return errorResult(error.message);

    const patrimonio = (ativos ?? []).reduce((s, a) => s + Number(a.quantidade) * Number(a.preco_atual), 0);
    const lista = (metas ?? []).map((m) => ({
      nome: m.nome,
      alvo: Number(m.alvo),
      progresso_pct: Number(m.alvo) > 0 ? Math.min((patrimonio / Number(m.alvo)) * 100, 100) : 0,
      falta: Math.max(Number(m.alvo) - patrimonio, 0),
    }));
    return textResult(JSON.stringify({ patrimonio, metas: lista }, null, 2), { patrimonio, metas: lista });
  },
});
