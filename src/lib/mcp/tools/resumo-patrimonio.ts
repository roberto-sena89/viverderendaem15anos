import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "resumo_patrimonio",
  title: "Resumo do patrimônio",
  description:
    "Retorna patrimônio total, custo investido, lucro/prejuízo, alocação por categoria e dividendos recebidos nos últimos 12 meses.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);

    const { data: ativos, error } = await supabase
      .from("ativos")
      .select("ticker, categoria, quantidade, preco_medio, preco_atual");
    if (error) return errorResult(error.message);

    const desde = new Date();
    desde.setFullYear(desde.getFullYear() - 1);
    const { data: dividendos } = await supabase
      .from("dividendos")
      .select("valor, data")
      .gte("data", desde.toISOString().slice(0, 10));

    const ativosTipados = (ativos ?? []) as {
      categoria: string;
      quantidade: number;
      preco_atual: number;
      preco_medio: number;
    }[];
    let patrimonio = 0;
    let custo = 0;
    const porCategoria: Record<string, number> = {};
    for (const a of ativosTipados) {
      const valor = Number(a.quantidade) * Number(a.preco_atual);
      patrimonio += valor;
      custo += Number(a.quantidade) * Number(a.preco_medio);
      porCategoria[a.categoria] = (porCategoria[a.categoria] ?? 0) + valor;
    }
    const resumo = {
      patrimonio_total: patrimonio,
      custo_investido: custo,
      lucro: patrimonio - custo,
      rentabilidade_pct: custo > 0 ? ((patrimonio - custo) / custo) * 100 : 0,
      alocacao_por_categoria: Object.fromEntries(
        Object.entries(porCategoria).map(([k, v]) => [
          k,
          { valor: v, pct: patrimonio > 0 ? (v / patrimonio) * 100 : 0 },
        ]),
      ),
      dividendos_12m: (dividendos ?? []).reduce((s, d) => s + Number(d.valor), 0),
      total_ativos: ativos?.length ?? 0,
    };
    return textResult(JSON.stringify(resumo, null, 2), { resumo });
  },
});
