import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "registrar_aporte",
  title: "Registrar aporte",
  description: "Registra um novo aporte na carteira do usuário e atualiza (ou cria) o ativo com o novo preço médio.",
  inputSchema: {
    ticker: z.string().describe("Ticker do ativo, ex.: BBAS3."),
    categoria: z.string().describe("Categoria do ativo: acoes, fiis, etfs, rendaFixa ou internacional."),
    quantidade: z.number().describe("Quantidade comprada."),
    preco: z.number().describe("Preço unitário pago."),
    data: z.string().optional().describe("Data do aporte no formato AAAA-MM-DD (padrão: hoje)."),
    corretora: z.string().optional().describe("Nome da corretora."),
    taxas: z.number().optional().describe("Taxas e custos do aporte."),
    observacoes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);

    const ticker = input.ticker.toUpperCase();
    const data = input.data ?? new Date().toISOString().slice(0, 10);
    const quantidade = input.quantidade;
    const preco = input.preco;
    if (quantidade <= 0 || preco <= 0) return errorResult("Quantidade e preço devem ser maiores que zero.");

    const { error: aporteErr } = await supabase.from("aportes").insert({
      data,
      corretora: input.corretora ?? "MCP",
      ticker,
      categoria: input.categoria,
      quantidade,
      preco,
      taxas: input.taxas ?? 0,
      observacoes: input.observacoes ?? null,
    });
    if (aporteErr) return errorResult(aporteErr.message);

    const { data: existente } = await supabase
      .from("ativos")
      .select("id, quantidade, preco_medio")
      .eq("ticker", ticker)
      .maybeSingle();

    if (existente) {
      const qtdTotal = Number(existente.quantidade) + quantidade;
      const precoMedio =
        (Number(existente.quantidade) * Number(existente.preco_medio) + quantidade * preco) / qtdTotal;
      const { error } = await supabase
        .from("ativos")
        .update({ quantidade: qtdTotal, preco_medio: precoMedio, preco_atual: preco })
        .eq("id", existente.id);
      if (error) return errorResult(error.message);
    } else {
      const { error } = await supabase.from("ativos").insert({
        ticker,
        nome: ticker,
        categoria: input.categoria,
        quantidade,
        preco_medio: preco,
        preco_atual: preco,
        dy: 0,
      });
      if (error) return errorResult(error.message);
    }

    return textResult(`Aporte registrado: ${quantidade} x ${ticker} a R$ ${preco} em ${data}.`, {
      ticker,
      quantidade,
      preco,
      data,
    });
  },
});
