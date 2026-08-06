import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { brl, classeDoAtivo, planoPadrao, projetar, type ProjecaoInput } from "@/lib/portfolio";
import type { Database } from "@/integrations/supabase/types";

const SISTEMA = `Você é o "Técnico IA", assistente de investimentos da plataforma Investidor em 15 Anos.

Perfil: consultor experiente em investimentos de longo prazo no Brasil (ações, FIIs, ETFs nacionais e internacionais, renda fixa e Tesouro Direto). Fala português do Brasil, direto ao ponto, com tom profissional e didático.

Ferramentas de mercado (use sempre que a pergunta envolver preços, desempenho, comparações ou juros):
- cotacao: preço em tempo quase real de uma ação, FII, ETF ou índice.
- historico: série histórica de até 10 anos, com retorno total, retorno anualizado, drawdown máximo, volatilidade e desempenho ano a ano.
- procurarAtivo: descobre o código correto quando o usuário cita o nome da empresa/fundo.
- indicadorEconomico: séries do Banco Central (Selic, CDI, IPCA, IGP-M, dólar, poupança).
- projecaoJuros: projeções do Boletim Focus para os próximos anos (Selic, IPCA, PIB, câmbio).

Ferramentas de análise da carteira:
- projetarIndependencia: projeta o patrimônio ano a ano usando o plano salvo do usuário (idade, aportes, rentabilidade, inflação e taxa de retirada) somado ao patrimônio real da carteira. Use para responder "quanto falta para me aposentar", "quanto preciso investir para viver de renda", "quando fico independente", "quanto devo aportar por mês".
- sugerirAtivos: sugere ativos da B3 (ações, FIIs ou BDRs) com melhor dividend yield, valor de mercado ou receita, para ajudar no rebalanceamento e na rentabilização da carteira. Leve em conta o perfil do investidor (abaixo) e as classes subalocadas da carteira.

Regras com dados de mercado:
- Nunca invente cotações, retornos ou projeções — chame a ferramenta correspondente.
- Cite a data/período dos dados e a fonte quando apresentar números de mercado.
- Para comparar ativos, chame historico para cada um e compare retorno anualizado, drawdown e volatilidade.
- Se um código não existir, use procurarAtivo antes de responder.

Regras de projeção de independência financeira:
- Sempre use a ferramenta projetarIndependencia para responder perguntas sobre aposentadoria, independência financeira ou renda passiva. Não calcule essas projeções manualmente.
- Quando o usuário perguntar "quanto devo aportar", projete com o plano atual e, se necessário, simule aportes maiores para mostrar em quantos anos a meta seria antecipada.
- Explique a lógica da regra dos 4% (taxa de retirada) usada na estimativa de renda passiva.

Como responder:
- Use os dados reais da carteira do usuário (fornecidos abaixo) sempre que fizerem sentido.
- Explique o raciocínio em passos curtos e use markdown (títulos curtos, listas, tabelas, negrito em números).
- Sugira ações concretas: rebalanceamento, aportes, metas, diversificação, reserva de emergência.
- Nunca prometa rentabilidade. Deixe claro que são análises educativas, não recomendação personalizada de investimento regulada pela CVM.
- Se a carteira estiver vazia, ajude o usuário a montar a estratégia inicial e a registrar os primeiros aportes na plataforma.

Perfil do investidor do usuário: "{PERFIL}"`;

function textoDaCarteira(
  ativos: {
    ticker: string;
    categoria: string;
    quantidade: number;
    preco_medio: number;
    preco_atual: number;
    dy: number;
  }[],
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

  const porClasse = new Map<string, number>();
  for (const a of ativos) {
    const classe = classeDoAtivo({
      id: "",
      ticker: a.ticker,
      nome: a.ticker,
      categoria: a.categoria as never,
      quantidade: a.quantidade,
      precoMedio: a.preco_medio,
      precoAtual: a.preco_atual,
      dy: a.dy,
    });
    porClasse.set(classe, (porClasse.get(classe) ?? 0) + a.quantidade * a.preco_atual);
  }
  const alocacao = [...porClasse.entries()]
    .sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0))
    .map(([classe, valor]) => {
      const pct = totalAtual > 0 ? (valor / totalAtual) * 100 : 0;
      return `${classe}: ${pct.toFixed(1)}% (${brl(valor)})`;
    })
    .join(" | ");

  const dividendosEstimados = ativos.reduce(
    (s, a) => s + (a.quantidade * a.preco_atual * a.dy) / 100,
    0,
  );
  const dyCarteira = totalAtual > 0 ? (dividendosEstimados / totalAtual) * 100 : 0;

  return [
    `Patrimônio atual: ${brl(totalAtual)} | Total investido: ${brl(totalInvestido)}`,
    `Rentabilidade geral: ${totalInvestido > 0 ? (((totalAtual - totalInvestido) / totalInvestido) * 100).toFixed(2) : 0}%`,
    `Proventos registrados (últimos lançamentos): ${brl(proventos)} | DY estimado da carteira: ${dyCarteira.toFixed(2)}%`,
    `Alocação por classe: ${alocacao}`,
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
        const token = request.headers
          .get("Authorization")
          ?.replace(/^Bearer\s+/i, "")
          .trim();
        if (!token) return new Response("Não autenticado", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const lovableApiKey = process.env.LOVABLE_API_KEY;
        if (!supabaseUrl || !supabaseKey)
          return new Response("Backend não configurado", { status: 500 });
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

        const perfil =
          request.headers.get("x-perfil-investidor")?.trim().toLowerCase() ?? "moderado";
        const perfilValido =
          perfil === "conservador" || perfil === "agressivo" ? perfil : "moderado";

        const ultima = messages[messages.length - 1];
        if (ultima?.role === "user") {
          const texto = textoDaMensagem(ultima);
          if (texto.length > 8000) return new Response("Mensagem muito longa", { status: 400 });
          const { error } = await supabase
            .from("chat_mensagens")
            .insert({ user_id: userId, role: "user", parts: [{ type: "text", text: texto }] });
          if (error) console.error("Falha ao salvar mensagem do usuário:", error.message);
        }

        const [{ data: ativos }, { data: aportes }, { data: dividendos }, { data: plano }] =
          await Promise.all([
            supabase
              .from("ativos")
              .select("ticker, categoria, quantidade, preco_medio, preco_atual, dy"),
            supabase
              .from("aportes")
              .select("data, ticker, quantidade, preco")
              .order("data", { ascending: false })
              .limit(20),
            supabase
              .from("dividendos")
              .select("data, ticker, valor")
              .order("data", { ascending: false })
              .limit(50),
            supabase
              .from("plano_config")
              .select(
                "idade_atual, idade_aposentadoria, aporte_mensal, aumento_anual, rentabilidade_anual, inflacao_anual, taxa_retirada",
              )
              .maybeSingle(),
          ]);

        const totalAtual = (ativos ?? []).reduce(
          (s, a) => s + Number(a.quantidade) * Number(a.preco_atual),
          0,
        );
        const planoConfig: ProjecaoInput = {
          idadeAtual: Number(plano?.idade_atual) || planoPadrao.idadeAtual,
          idadeAposentadoria: Number(plano?.idade_aposentadoria) || planoPadrao.idadeAposentadoria,
          aporteMensal: Number(plano?.aporte_mensal) || planoPadrao.aporteMensal,
          aumentoAnual: Number(plano?.aumento_anual) || planoPadrao.aumentoAnual,
          rentabilidadeAnual: Number(plano?.rentabilidade_anual) || planoPadrao.rentabilidadeAnual,
          inflacaoAnual: Number(plano?.inflacao_anual) || planoPadrao.inflacaoAnual,
          taxaRetirada: Number(plano?.taxa_retirada) || planoPadrao.taxaRetirada,
          patrimonioAtual: Math.round(totalAtual),
        };

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
          (dividendos ?? []).map((d) => ({
            data: d.data,
            ticker: d.ticker,
            valor: Number(d.valor),
          })),
        );

        const gateway = createLovableAiGatewayProvider(
          lovableApiKey,
          getLovableAiGatewayRunId(request),
        );

        const mercado = await import("@/lib/market.server");
        const erro = (e: unknown) => ({
          erro: e instanceof Error ? e.message : "Falha ao consultar a fonte de dados.",
        });

        const ferramentas = {
          cotacao: tool({
            description:
              "Cotação atual de uma ação, FII, ETF ou índice (B3 e bolsas internacionais). Ex.: PETR4, HGLG11, BOVA11, IBOVESPA, AAPL, DOLAR.",
            inputSchema: z.object({
              ticker: z.string().describe("Código do ativo ou nome do índice"),
            }),
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
                const h = await mercado.buscarHistorico(
                  ticker,
                  periodo ?? "10y",
                  intervalo ?? "1mo",
                );
                // devolve resumo + série reduzida para não estourar o contexto
                const passo = Math.max(1, Math.ceil(h.serie.length / 60));
                return {
                  ...h,
                  serie: h.serie.filter((_, i) => i % passo === 0 || i === h.serie.length - 1),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          procurarAtivo: tool({
            description:
              "Procura o código (ticker) de uma empresa, fundo imobiliário, ETF ou índice pelo nome.",
            inputSchema: z.object({ termo: z.string() }),
            execute: async ({ termo }) => mercado.procurarAtivo(termo).catch(erro),
          }),
          indicadorEconomico: tool({
            description:
              "Série histórica de indicadores do Banco Central: selic, cdi, ipca, igpm, dolar, poupanca.",
            inputSchema: z.object({
              indicador: z.enum(["selic", "cdi", "ipca", "igpm", "dolar", "poupanca"]),
              ultimos: z
                .number()
                .int()
                .optional()
                .describe("Quantidade de observações mais recentes"),
            }),
            execute: async ({ indicador, ultimos }) =>
              mercado.buscarIndicador(indicador, ultimos ?? 12).catch(erro),
          }),
          projecaoJuros: tool({
            description:
              "Projeções do Boletim Focus do Banco Central para os próximos anos: taxa de juros (Selic), IPCA, PIB e câmbio.",
            inputSchema: z.object({
              indicador: z.enum(["selic", "ipca", "pib", "cambio", "igpm"]).optional(),
            }),
            execute: async ({ indicador }) =>
              mercado.buscarProjecoes(indicador ?? "selic").catch(erro),
          }),
          projetarIndependencia: tool({
            description:
              "Projeta o patrimônio ano a ano, a renda passiva e a data provável de independência financeira usando o plano salvo do usuário (idade, aportes, rentabilidade, inflação, taxa de retirada) somado ao patrimônio real da carteira. Aceita aporte mensal ou rentabilidade alternativos para simular cenários ('e se eu aportar X por mês?').",
            inputSchema: z.object({
              aporteMensal: z
                .number()
                .positive()
                .optional()
                .describe("Aporte mensal alternativo em reais para simulação"),
              rentabilidadeAnual: z
                .number()
                .positive()
                .optional()
                .describe("Rentabilidade anual alternativa em % (ex.: 12 para 12% a.a.)"),
            }),
            execute: async ({ aporteMensal, rentabilidadeAnual }) => {
              const entrada: ProjecaoInput = {
                ...planoConfig,
                ...(aporteMensal ? { aporteMensal } : {}),
                ...(rentabilidadeAnual ? { rentabilidadeAnual } : {}),
              };
              const linhas = projetar(entrada);
              const final = linhas[linhas.length - 1];
              return {
                plano_utilizado: {
                  idade_atual: entrada.idadeAtual,
                  idade_aposentadoria: entrada.idadeAposentadoria,
                  aporte_mensal: entrada.aporteMensal,
                  aumento_anual_pct: entrada.aumentoAnual,
                  rentabilidade_anual_pct: entrada.rentabilidadeAnual,
                  inflacao_anual_pct: entrada.inflacaoAnual,
                  taxa_retirada_pct: entrada.taxaRetirada,
                  patrimonio_atual: entrada.patrimonioAtual,
                },
                patrimonio_projetado: Math.round(final.patrimonio),
                patrimonio_projetado_em_valor_de_hoje: Math.round(final.patrimonioReal),
                renda_passiva_mensal_projetada: Math.round(final.rendaPassivaMensal),
                total_aportado_projetado: Math.round(final.aportado),
                ultimo_ano_projetado: final.ano,
                idade_no_ultimo_ano: final.idade,
                primeiro_milhao_em: linhas.find((l) => l.patrimonio >= 1_000_000)?.ano ?? null,
                projecao_ano_a_ano: linhas.map((l) => ({
                  ano: l.ano,
                  idade: l.idade,
                  patrimonio: Math.round(l.patrimonio),
                  renda_passiva_mensal: Math.round(l.rendaPassivaMensal),
                })),
              };
            },
          }),
          sugerirAtivos: tool({
            description:
              "Lista ativos da B3 (ações, FIIs ou BDRs) com melhor dividend yield, valor de mercado ou receita, para sugerir compras que fortalecem a carteira conforme o perfil do investidor e o rebalanceamento. Não é recomendação personalizada regulada pela CVM.",
            inputSchema: z.object({
              tipo: z.enum(["acoes", "fiis", "bdrs"]).optional().describe("Tipo de ativo a listar"),
              foco: z
                .enum(["dy", "valorMercado", "receita"])
                .optional()
                .describe("Critério de ordenação: dividend yield, valor de mercado ou receita"),
            }),
            execute: async ({ tipo, foco }) => {
              try {
                const r = await mercado.buscarRankingsB3(tipo ?? "acoes");
                const lista =
                  foco === "receita"
                    ? r.receitas
                    : foco === "valorMercado"
                      ? r.valorMercado
                      : r.dividendYield;
                return {
                  tipo: r.tipo,
                  criterio: foco ?? "dy",
                  atualizado_em: r.atualizadoEm,
                  sugestoes: lista.slice(0, 12).map((a) => ({
                    ticker: a.ticker,
                    nome: a.nome,
                    preco: a.preco,
                    dy_pct: a.dy,
                    valor_de_mercado: a.valorMercado,
                    receita: a.receita,
                    variacao_pct: a.variacaoPercent,
                  })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
        };

        const result = streamText({
          model: gateway("openai/gpt-5.5"),
          system: SISTEMA.replace("{PERFIL}", perfilValido).concat(
            `\n\n### Carteira atual do usuário\n${contexto}\n\nData de hoje: ${new Date().toISOString().slice(0, 10)}`,
          ),
          messages: await convertToModelMessages(messages),
          tools: ferramentas,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            const texto = textoDaMensagem(responseMessage);
            if (!texto) return;
            const { error } = await supabase.from("chat_mensagens").insert({
              user_id: userId,
              role: "assistant",
              parts: [{ type: "text", text: texto }],
            });
            if (error) console.error("Falha ao salvar resposta do assistente:", error.message);
          },
        });
      },
    },
  },
});
