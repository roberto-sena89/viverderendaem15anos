/**
 * Alertas de preço com apoio do provedor de IA (Kilo Code por padrão):
 * sugere alvos a partir da carteira real e verifica os alertas do usuário
 * disparando notificações push de verdade.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

export interface DisparoAlerta {
  id: string;
  ticker: string;
  tipo: string;
  preco: number;
  valor_alvo: number;
  variacao_percent: number | null;
  frequencia: string;
  mensagem: string | null;
  criado_em: string;
}

type CaixaSb = {
  from: (t: string) => {
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => {
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
    };
    select: (c: string) => {
      order: (
        c: string,
        o: { ascending: boolean },
      ) => {
        limit: (n: number) => Promise<{
          data: Record<string, unknown>[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

/** Cria um alerta com alvo em reais ou em variação percentual, e frequência. */
export const criarAlertaPreco = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z
      .object({
        ticker: z.string().trim().min(1).max(12),
        tipo: z.enum(["acima", "abaixo"]),
        valor_alvo: z.number().positive().optional(),
        variacao_percent: z.number().positive().max(90).optional(),
        frequencia: z.enum(["uma_vez", "diaria", "sempre"]).default("uma_vez"),
        mensagem: z.string().trim().max(200).optional(),
      })
      .refine((v) => v.valor_alvo != null || v.variacao_percent != null, {
        message: "Informe o preço alvo ou a variação em porcentagem.",
      })
      .parse(value),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ticker = data.ticker.toUpperCase();

    // Preço de referência para alertas por porcentagem
    let referencia: number | null = null;
    try {
      const { lerPrecosPersistidos } = await import("@/lib/precos-ultimos.server");
      const precos = await lerPrecosPersistidos([ticker]);
      referencia = precos[0]?.preco ?? null;
    } catch {
      referencia = null;
    }
    if (data.variacao_percent != null && (referencia == null || referencia <= 0)) {
      throw new Error(
        `Ainda não temos a cotação de ${ticker} para calcular a porcentagem. Use o preço alvo em reais.`,
      );
    }

    const alvoCalculado =
      data.valor_alvo ??
      Math.round(
        (referencia ?? 0) *
          (data.tipo === "acima" ? 1 + data.variacao_percent! / 100 : 1 - data.variacao_percent! / 100) *
          100,
      ) / 100;

    const caixa = context.supabase as unknown as CaixaSb;
    const { data: linha, error } = await caixa
      .from("alertas_preco")
      .insert({
        user_id: context.userId,
        ticker,
        tipo: data.tipo,
        valor_alvo: alvoCalculado,
        variacao_percent: data.variacao_percent ?? null,
        preco_referencia: referencia,
        frequencia: data.frequencia,
        mensagem: data.mensagem ?? null,
        ativo: true,
      })
      .select("*")
      .single();
    if (error || !linha) throw new Error(error?.message ?? "Não foi possível criar o alerta.");
    return { id: String(linha["id"]), ticker, valor_alvo: alvoCalculado, referencia };
  });

/** Histórico dos alertas que já dispararam. */
export const listarDisparosAlertas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DisparoAlerta[]> => {
    const caixa = context.supabase as unknown as CaixaSb;
    const { data, error } = await caixa
      .from("alertas_disparos")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((l) => ({
      id: String(l["id"]),
      ticker: String(l["ticker"]),
      tipo: String(l["tipo"]),
      preco: Number(l["preco"]),
      valor_alvo: Number(l["valor_alvo"]),
      variacao_percent: l["variacao_percent"] == null ? null : Number(l["variacao_percent"]),
      frequencia: String(l["frequencia"] ?? "uma_vez"),
      mensagem: (l["mensagem"] as string | null) ?? null,
      criado_em: String(l["criado_em"]),
    }));
  });
