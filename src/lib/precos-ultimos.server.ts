/**
 * Persistência do último preço válido por ativo (`public.precos_ultimos`).
 *
 * Serve como rede de segurança da coluna "P. atual" da carteira: se a BRAPI e a
 * aba "Cotações" falharem por um período longo — ou se a página for recarregada
 * antes da primeira resposta chegar — o preço mostrado continua sendo o último
 * valor válido conhecido, com a fonte e o horário originais.
 */

export type PrecoPersistido = {
  ticker: string;
  preco: number;
  variacaoPercent: number | null;
  fonte: string;
  aoVivo: boolean;
  atualizadoEm: string;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const normalizar = (t: string) => t.trim().toUpperCase().replace(/\.SA$/i, "");

/** Últimos preços salvos dos tickers pedidos. */
export async function lerPrecosPersistidos(tickers: string[]): Promise<PrecoPersistido[]> {
  const lista = [...new Set(tickers.map(normalizar).filter(Boolean))].slice(0, 200);
  if (!lista.length) return [];
  try {
    const db = await admin();
    const { data } = await db
      .from("precos_ultimos")
      .select("ticker, preco, variacao_percent, fonte, ao_vivo, atualizado_em")
      .in("ticker", lista);
    return (data ?? []).map((r) => ({
      ticker: r.ticker,
      preco: Number(r.preco),
      variacaoPercent: r.variacao_percent === null ? null : Number(r.variacao_percent),
      fonte: r.fonte,
      aoVivo: r.ao_vivo,
      atualizadoEm: r.atualizado_em,
    }));
  } catch {
    return [];
  }
}

/**
 * Grava (upsert) os preços recebidos das fontes ao vivo. Best-effort.
 *
 * Uso interno do servidor: os valores precisam vir de uma fonte de mercado
 * confiável (BRAPI, cache de cotações, jobs agendados), nunca do navegador.
 */
export async function gravarPrecosPersistidos(precos: PrecoPersistido[]) {

  const linhas = precos
    .filter((p) => Number.isFinite(p.preco) && p.preco > 0 && p.ticker)
    .map((p) => ({
      ticker: normalizar(p.ticker),
      preco: p.preco,
      variacao_percent: p.variacaoPercent,
      fonte: p.fonte || "brapi",
      ao_vivo: p.aoVivo,
      atualizado_em: p.atualizadoEm || new Date().toISOString(),
    }))
    .slice(0, 200);
  if (!linhas.length) return { gravados: 0 };
  try {
    const db = await admin();
    await db.from("precos_ultimos").upsert(linhas, { onConflict: "ticker" });
    return { gravados: linhas.length };
  } catch {
    return { gravados: 0 };
  }
}
