import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const SISTEMA = `Você é o "Técnico IA", assistente de investimentos da plataforma Investidor em 15 Anos.

Perfil: consultor experiente em investimentos de longo prazo no Brasil (ações, FIIs, ETFs nacionais e internacionais, renda fixa e Tesouro Direto). Fala português do Brasil, direto ao ponto, com tom profissional e didático.

Ferramentas de mercado (use sempre que a pergunta envolver preços, desempenho, comparações ou juros):
- cotacao: preço em tempo quase real de uma ação, FII, ETF ou índice.
- historico: série histórica de até 10 anos, com retorno total, retorno anualizado, drawdown máximo, volatilidade e desempenho ano a ano.
- procurarAtivo: descobre o código correto quando o usuário cita o nome da empresa/fundo.
- indicadorEconomico: séries do Banco Central (Selic, CDI, IPCA, IGP-M, dólar, poupança).
- projecaoJuros: projeções do Boletim Focus para os próximos anos (Selic, IPCA, PIB, câmbio).

Regras com dados de mercado:
- Nunca invente cotações, retornos ou projeções — chame a ferramenta correspondente.
- Cite a data/período dos dados e a fonte quando apresentar números de mercado.
- Para comparar ativos, chame historico para cada um e compare retorno anualizado, drawdown e volatilidade.
- Se um código não existir, use procurarAtivo antes de responder.

Como responder:
- Use os dados reais da carteira do usuário (fornecidos abaixo) sempre que fizerem sentido.
- Explique o raciocínio em passos curtos e use markdown (títulos curtos, listas, tabelas, negrito em números).
- Sugira ações concretas: rebalanceamento, aportes, metas, diversificação, reserva de emergência.
- Nunca prometa rentabilidade. Deixe claro que são análises educativas, não recomendação personalizada de investimento regulada pela CVM.
- Se a carteira estiver vazia, ajude o usuário a montar a estratégia inicial e a registrar os primeiros aportes na plataforma.`;


function textoDaCarteira(
  ativos: { ticker: string; categoria: string; quantidade: number; preco_medio: number; preco_atual: number; dy: number }[],
  aportes: { data: string; ticker: string; quantidade: number; preco: number }[],
  dividendos: { data: string; ticker: string; valor: number }[],
) {
  if (ativos.length === 0 && aportes.length === 0) {
    return "O usuário ainda não cadastrou ativos nem aportes na plataforma.";
  }

  const linhas = ativos.map((a) => {
    const atual = a.quantidade * a.preco_atual;
    const investido = a.quantidade * a.preco_medio;
    const rent = investido > 0 ? ((atual - investido) / investido) * 100 : 0;
    return `- ${a.ticker} (${a.categoria}): ${a.quantidade} cotas, PM R$ ${a.preco_medio.toFixed(2)}, preço atual R$ ${a.preco_atual.toFixed(2)}, valor R$ ${atual.toFixed(2)}, rentabilidade ${rent.toFixed(1)}%, DY ${a.dy}%`;
  });

  const totalAtual = ativos.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const totalInvestido = ativos.reduce((s, a) => s + a.quantidade * a.preco_medio, 0);
  const proventos = dividendos.reduce((s, d) => s + d.valor, 0);

  return [
    `Patrimônio atual: R$ ${totalAtual.toFixed(2)} | Total investido: R$ ${totalInvestido.toFixed(2)}`,
    `Proventos registrados (últimos lançamentos): R$ ${proventos.toFixed(2)}`,
    "Ativos:",
    ...linhas,
    aportes.length
      ? `Últimos aportes: ${aportes
          .slice(0, 10)
          .map((a) => `${a.data} ${a.ticker} ${a.quantidade}x R$ ${a.preco.toFixed(2)}`)
          .join("; ")}`
      : "Nenhum aporte registrado.",
  ].join("\n");
}

function textoDaMensagem(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
        if (!token) return new Response("Não autenticado", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const lovableApiKey = process.env.LOVABLE_API_KEY;
        if (!supabaseUrl || !supabaseKey) return new Response("Backend não configurado", { status: 500 });
        if (!lovableApiKey) return new Response("IA não configurada", { status: 500 });

        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        const userId = userData?.user?.id;
        if (userError || !userId) return new Response("Sessão inválida", { status: 401 });

        const body = (await request.json()) as { messages?: UIMessage[] };
        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Mensagens obrigatórias", { status: 400 });
        }

        const ultima = messages[messages.length - 1];
        if (ultima?.role === "user") {
          const texto = textoDaMensagem(ultima);
          if (texto.length > 8000) return new Response("Mensagem muito longa", { status: 400 });
          const { error } = await supabase
            .from("chat_mensagens")
            .insert({ user_id: userId, role: "user", parts: [{ type: "text", text: texto }] });
          if (error) console.error("Falha ao salvar mensagem do usuário:", error.message);
        }

        const [{ data: ativos }, { data: aportes }, { data: dividendos }] = await Promise.all([
          supabase.from("ativos").select("ticker, categoria, quantidade, preco_medio, preco_atual, dy"),
          supabase.from("aportes").select("data, ticker, quantidade, preco").order("data", { ascending: false }).limit(20),
          supabase.from("dividendos").select("data, ticker, valor").order("data", { ascending: false }).limit(50),
        ]);

        const contexto = textoDaCarteira(
          (ativos ?? []).map((a) => ({
            ticker: a.ticker,
            categoria: a.categoria,
            quantidade: Number(a.quantidade),
            preco_medio: Number(a.preco_medio),
            preco_atual: Number(a.preco_atual),
            dy: Number(a.dy),
          })),
          (aportes ?? []).map((a) => ({
            data: a.data,
            ticker: a.ticker,
            quantidade: Number(a.quantidade),
            preco: Number(a.preco),
          })),
          (dividendos ?? []).map((d) => ({ data: d.data, ticker: d.ticker, valor: Number(d.valor) })),
        );

        const gateway = createLovableAiGatewayProvider(lovableApiKey, getLovableAiGatewayRunId(request));

        const mercado = await import("@/lib/market.server");
        const erro = (e: unknown) => ({ erro: e instanceof Error ? e.message : "Falha ao consultar a fonte de dados." });

        const ferramentas = {
          cotacao: tool({
            description:
              "Cotação atual de uma ação, FII, ETF ou índice (B3 e bolsas internacionais). Ex.: PETR4, HGLG11, BOVA11, IBOVESPA, AAPL, DOLAR.",
            inputSchema: z.object({ ticker: z.string().describe("Código do ativo ou nome do índice") }),
            execute: async ({ ticker }) => mercado.buscarCotacao(ticker).catch(erro),
          }),
          historico: tool({
            description:
              "Série histórica de preços (até 10 anos ou máximo disponível) com retorno total, retorno anualizado, drawdown máximo, volatilidade e desempenho ano a ano.",
            inputSchema: z.object({
              ticker: z.string(),
              periodo: z.enum(["1mo", "6mo", "1y", "2y", "5y", "10y", "max"]).optional(),
              intervalo: z.enum(["1d", "1wk", "1mo"]).optional(),
            }),
            execute: async ({ ticker, periodo, intervalo }) => {
              try {
                const h = await mercado.buscarHistorico(ticker, periodo ?? "10y", intervalo ?? "1mo");
                // devolve resumo + série reduzida para não estourar o contexto
                const passo = Math.max(1, Math.ceil(h.serie.length / 60));
                return { ...h, serie: h.serie.filter((_, i) => i % passo === 0 || i === h.serie.length - 1) };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          procurarAtivo: tool({
            description: "Procura o código (ticker) de uma empresa, fundo imobiliário, ETF ou índice pelo nome.",
            inputSchema: z.object({ termo: z.string() }),
            execute: async ({ termo }) => mercado.procurarAtivo(termo).catch(erro),
          }),
          indicadorEconomico: tool({
            description:
              "Série histórica de indicadores do Banco Central: selic, cdi, ipca, igpm, dolar, poupanca.",
            inputSchema: z.object({
              indicador: z.enum(["selic", "cdi", "ipca", "igpm", "dolar", "poupanca"]),
              ultimos: z.number().int().optional().describe("Quantidade de observações mais recentes"),
            }),
            execute: async ({ indicador, ultimos }) =>
              mercado.buscarIndicador(indicador, ultimos ?? 12).catch(erro),
          }),
          projecaoJuros: tool({
            description:
              "Projeções do Boletim Focus do Banco Central para os próximos anos: taxa de juros (Selic), IPCA, PIB e câmbio.",
            inputSchema: z.object({ indicador: z.enum(["selic", "ipca", "pib", "cambio", "igpm"]).optional() }),
            execute: async ({ indicador }) => mercado.buscarProjecoes(indicador ?? "selic").catch(erro),
          }),
        };

        const result = streamText({
          model: gateway("openai/gpt-5.5"),
          system: `${SISTEMA}\n\n### Carteira atual do usuário\n${contexto}\n\nData de hoje: ${new Date().toISOString().slice(0, 10)}`,
          messages: await convertToModelMessages(messages),
          tools: ferramentas,
          stopWhen: stepCountIs(50),
        });


        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            const texto = textoDaMensagem(responseMessage);
            if (!texto) return;
            const { error } = await supabase
              .from("chat_mensagens")
              .insert({ user_id: userId, role: "assistant", parts: [{ type: "text", text: texto }] });
            if (error) console.error("Falha ao salvar resposta do assistente:", error.message);
          },
        });
      },
    },
  },
});
