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

/** Sincroniza as posições do Meu Pluggy com a tabela `ativos` do usuário. */
export const sincronizarAtivosMeuPluggy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; mensagem?: string }> => {
    const { listarPosicoesPluggy } = await import("@/lib/pluggy.server");
    try {
      const posicoes = await listarPosicoesPluggy();
      const supabase = context.supabase;

      for (const p of posicoes) {
        if (!p.quantidade || p.valorAtual <= 0) continue;

        const { data: existente } = await supabase
          .from("ativos")
          .select("id, quantidade, preco_medio, preco_atual")
          .eq("ticker", p.ticker)
          .maybeSingle();

        // Preço unitário estimado a partir do valor atual e da quantidade.
        const preco = p.valorAtual / (p.quantidade || 1);

        // Custo médio: usa o custo total (se a fonte entregar) ou o preço unitário como fallback.
        const media = p.valorCusto ? p.valorCusto / (p.quantidade || 1) : preco;

        const payload = {
          quantidade: p.quantidade,
          preco_atual: preco,
          preco_medio: media,
          categoria: p.categoria,
          nome: p.nome,
        };

        if (existente) {
          await supabase.from("ativos").update(payload).eq("id", existente.id);
        } else {
          await supabase.from("ativos").insert({
            ticker: p.ticker,
            ...payload,
            dy: 0,
          });
        }
      }

      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao sincronizar com o Meu Pluggy.";
      return { ok: false, mensagem: msg };
    }
  });

