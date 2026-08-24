import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PosicaoPluggy } from "@/lib/pluggy.server";

export type { PosicaoPluggy };

/** Lista as posições de investimentos conectadas no Meu Pluggy (conta do usuário). */
export const listarPosicoesMeuPluggy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async (): Promise<{
      ok: boolean;
      posicoes?: PosicaoPluggy[];
      mensagem?: string;
    }> => {
      const { listarPosicoesPluggy } = await import("@/lib/pluggy.server");
      try {
        const posicoes = await listarPosicoesPluggy();
        return { ok: true, posicoes };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao consultar o Meu Pluggy.";
        return { ok: false, mensagem: msg };
      }
    },
  );

/**
 * Gera um connect token para o widget Pluggy Connect (fluxo de consentimento
 * Open Finance). Protegido por autenticação; o `clientUserId` é o id do usuário
 * logado, vinculando cada item criado no widget à conta dele.
 */
export const gerarConnectTokenMeuPluggy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<{ ok: boolean; accessToken?: string; mensagem?: string }> => {
      const { criarConnectToken } = await import("@/lib/pluggy.server");
      try {
        const accessToken = await criarConnectToken(context.userId);
        return { ok: true, accessToken };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao gerar o Connect Token.";
        return { ok: false, mensagem: msg };
      }
    },
  );

/** Sincroniza as posições do Meu Pluggy com a tabela `ativos` do usuário. */
export const sincronizarAtivosMeuPluggy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; mensagem?: string }> => {
    const { listarPosicoesPluggy } = await import("@/lib/pluggy.server");
    try {
      const posicoes = await listarPosicoesPluggy();
      const supabase = context.supabase;
      let ignorados = 0;

      for (const p of posicoes) {
        if (!p.quantidade || p.valorAtual <= 0) continue;

        // Sem um ticker reconhecido da B3 (ex.: "CDB BANCO BRADESCO"), qualquer
        // correspondência seria um palpite: não cria nem sobrescreve nada.
        if (!p.tickerReconhecido) {
          ignorados += 1;
          continue;
        }

        const { data: existente } = await supabase
          .from("ativos")
          .select("id, quantidade, preco_medio, preco_atual")
          .eq("ticker", p.ticker)
          .maybeSingle();

        // Preço unitário estimado a partir do valor atual e da quantidade.
        const preco = p.valorAtual / (p.quantidade || 1);

        // Custo médio só vem da fonte. Sem custo informado, mantém o preço médio
        // já cadastrado (nunca sobrescreve com o preço de hoje).
        const mediaDaFonte = p.valorCusto ? p.valorCusto / (p.quantidade || 1) : null;

        if (existente) {
          await supabase
            .from("ativos")
            .update({
              quantidade: p.quantidade,
              preco_atual: preco,
              categoria: p.categoria,
              nome: p.nome,
              ...(mediaDaFonte ? { preco_medio: mediaDaFonte } : {}),
            })
            .eq("id", existente.id);
        } else {
          await supabase.from("ativos").insert({
            ticker: p.ticker,
            quantidade: p.quantidade,
            preco_atual: preco,
            preco_medio: mediaDaFonte ?? preco,
            categoria: p.categoria,
            nome: p.nome,
            dy: 0,
          });
        }
      }

      return {
        ok: true,
        ...(ignorados
          ? {
              mensagem: `${ignorados} posição(ões) sem ticker da B3 foram ignoradas e devem ser lançadas manualmente.`,
            }
          : {}),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao sincronizar com o Meu Pluggy.";
      return { ok: false, mensagem: msg };
    }
  });
