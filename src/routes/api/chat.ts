import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const SISTEMA = `Você é o "Técnico IA", assistente de investimentos da plataforma Investidor em 15 Anos.

Perfil: consultor experiente em investimentos de longo prazo no Brasil (ações, FIIs, ETFs nacionais e internacionais, renda fixa e Tesouro Direto). Fala português do Brasil, direto ao ponto, com tom profissional e didático.

Como responder:
- Use os dados reais da carteira do usuário (fornecidos abaixo) sempre que fizerem sentido.
- Explique o raciocínio em passos curtos e use markdown (títulos curtos, listas, negrito em números).
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
      POST: async ({ request }) => {
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

        const result = streamText({
          model: gateway("openai/gpt-5.5"),
          system: `${SISTEMA}\n\n### Carteira atual do usuário\n${contexto}`,
          messages: await convertToModelMessages(messages),
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
