/**
 * Alertas de preço com apoio do provedor de IA (Kilo Code por padrão):
 * sugere alvos a partir da carteira real e verifica os alertas do usuário
 * disparando notificações push de verdade.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SugestaoAlerta {
  ticker: string;
  tipo: "acima" | "abaixo";
  valor_alvo: number;
  mensagem: string;
}

const SISTEMA_ALERTAS = `Você é um analista brasileiro que configura alertas de preço para um investidor pessoa física.

Escreva SEMPRE em português do Brasil, com termos do mercado nacional. Nunca use inglês.

A partir da carteira enviada (ticker, categoria, preço médio e preço atual), proponha de 3 a 6 alertas úteis:
- "abaixo" quando o preço atual sugerir uma boa oportunidade de novo aporte;
- "acima" quando fizer sentido acompanhar realização de lucro.

O valor alvo deve ficar entre 5% e 20% de distância do preço atual e ser um número em reais.
A mensagem deve ter no máximo 120 caracteres e explicar o motivo do alerta em linguagem simples.

Responda APENAS com JSON válido, sem markdown:
{"alertas":[{"ticker":"XXXX","tipo":"abaixo","valor_alvo":12.34,"mensagem":"..."}]}`;

export const sugerirAlertasIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ criados: SugestaoAlerta[]; provedor: string }> => {
    const { supabase, userId } = context;
    const { data: ativos } = await supabase
      .from("ativos")
      .select("ticker, categoria, quantidade, preco_medio, preco_atual")
      .order("ticker");

    const carteira = (ativos ?? [])
      .filter((a) => Number(a.quantidade) > 0 && Number(a.preco_atual) > 0)
      .slice(0, 25)
      .map((a) => ({
        ticker: a.ticker,
        categoria: a.categoria,
        preco_medio: Number(a.preco_medio),
        preco_atual: Number(a.preco_atual),
      }));

    if (carteira.length === 0) {
      throw new Error("Cadastre ativos na carteira para o assistente sugerir alertas.");
    }

    const { gerarTextoIA, extrairJson } = await import("@/lib/ia-texto.server");
    const r = await gerarTextoIA({
      sistema: SISTEMA_ALERTAS,
      prompt: `Carteira atual (JSON):\n${JSON.stringify(carteira)}`,
      maxTokens: 9000,
    });

    const json = extrairJson(r.texto);
    const brutos = Array.isArray(json?.["alertas"]) ? (json["alertas"] as unknown[]) : [];
    const tickersValidos = new Set(carteira.map((c) => c.ticker.toUpperCase()));

    const sugestoes: SugestaoAlerta[] = [];
    for (const item of brutos) {
      const o = item as Record<string, unknown>;
      const ticker = String(o["ticker"] ?? "")
        .trim()
        .toUpperCase();
      const tipo = String(o["tipo"] ?? "").toLowerCase() === "acima" ? "acima" : "abaixo";
      const valor = Number(o["valor_alvo"]);
      const mensagem = String(o["mensagem"] ?? "").slice(0, 200);
      if (!tickersValidos.has(ticker) || !Number.isFinite(valor) || valor <= 0) continue;
      sugestoes.push({ ticker, tipo, valor_alvo: Math.round(valor * 100) / 100, mensagem });
    }

    if (sugestoes.length === 0) {
      throw new Error("O assistente não devolveu alertas utilizáveis. Tente novamente.");
    }

    const insercao = supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await insercao.from("alertas_preco").insert(
      sugestoes.map((s) => ({
        user_id: userId,
        ticker: s.ticker,
        tipo: s.tipo,
        valor_alvo: s.valor_alvo,
        mensagem: s.mensagem,
        ativo: true,
      })),
    );
    if (error) throw new Error(error.message);

    return { criados: sugestoes, provedor: r.provedor };
  });

/** Verifica agora os alertas do próprio usuário e dispara as notificações. */
export const verificarMeusAlertas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { verificarAlertas } = await import("@/lib/alertas-preco.server");
    return verificarAlertas(context.supabase);
  });
