import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CotacaoResumo {
  simbolo: string;
  nome: string;
  preco: number | null;
  variacaoPercent: number | null;
  moeda: string;
}

export interface PainelB3 {
  indices: CotacaoResumo[];
  indicadores: { nome: string; valor: number; unidade: string; data: string }[];
  atualizadoEm: string;
}

const INDICES_PAINEL: { simbolo: string; rotulo: string }[] = [
  { simbolo: "^BVSP", rotulo: "Ibovespa" },
  { simbolo: "IFIX.SA", rotulo: "IFIX" },
  { simbolo: "SMLL.SA", rotulo: "Small Caps" },
  { simbolo: "BRL=X", rotulo: "Dólar" },
];

export const painelB3 = createServerFn({ method: "GET" }).handler(async (): Promise<PainelB3> => {
  const mercado = await import("@/lib/market.server");

  const indices = await Promise.all(
    INDICES_PAINEL.map(async ({ simbolo, rotulo }) => {
      try {
        const c = await mercado.buscarCotacao(simbolo);
        return {
          simbolo,
          nome: rotulo,
          preco: c.preco,
          variacaoPercent: c.variacaoDiaPercent,
          moeda: c.moeda,
        };
      } catch {
        return { simbolo, nome: rotulo, preco: null, variacaoPercent: null, moeda: "BRL" };
      }
    }),
  );

  const chaves = ["selic", "cdi", "ipca"] as const;
  const indicadores = (
    await Promise.all(
      chaves.map(async (chave) => {
        try {
          const r = await mercado.buscarIndicador(chave, 1);
          const ultimo = r.serie[r.serie.length - 1];
          return ultimo ? { nome: r.indicador, valor: ultimo.valor, unidade: r.unidade, data: ultimo.data } : null;
        } catch {
          return null;
        }
      }),
    )
  ).filter((v): v is { nome: string; valor: number; unidade: string; data: string } => v !== null);

  return { indices, indicadores, atualizadoEm: new Date().toISOString() };
});

export const cotacaoAtivo = createServerFn({ method: "GET" })
  .inputValidator((d: { simbolo: string }) => ({ simbolo: String(d.simbolo).slice(0, 20) }))
  .handler(async ({ data }) => {
    const mercado = await import("@/lib/market.server");
    return mercado.buscarCotacao(data.simbolo);
  });

export const historicoAtivo = createServerFn({ method: "GET" })
  .inputValidator((d: { simbolo: string; periodo?: "1y" | "5y" | "10y" }) => ({
    simbolo: String(d.simbolo).slice(0, 20),
    periodo: (d.periodo ?? "10y") as "1y" | "5y" | "10y",
  }))
  .handler(async ({ data }) => {
    const mercado = await import("@/lib/market.server");
    return mercado.buscarHistorico(data.simbolo, data.periodo, "1mo");
  });

/** Atualiza o preço atual de todos os ativos da carteira com a cotação da B3. */
export const sincronizarPrecos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const mercado = await import("@/lib/market.server");
    const { data: ativos, error } = await context.supabase.from("ativos").select("id, ticker");
    if (error) throw new Error(error.message);

    let atualizados = 0;
    const falhas: string[] = [];

    for (const ativo of ativos ?? []) {
      try {
        const c = await mercado.buscarCotacao(ativo.ticker as string);
        if (c.preco && c.preco > 0) {
          const { error: upErr } = await context.supabase
            .from("ativos")
            .update({ preco_atual: c.preco })
            .eq("id", ativo.id as string);
          if (upErr) throw new Error(upErr.message);
          atualizados++;
        } else falhas.push(ativo.ticker as string);
      } catch {
        falhas.push(ativo.ticker as string);
      }
    }

    return { atualizados, falhas, total: (ativos ?? []).length };
  });
