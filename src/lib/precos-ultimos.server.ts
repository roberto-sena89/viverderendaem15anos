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

/**
 * Busca os preços dos tickers nas fontes de mercado (BRAPI) e persiste o
 * resultado. Só o servidor decide o valor gravado — o cliente informa apenas
 * quais tickers acompanhar.
 */
export async function sincronizarPrecosDeFonte(tickers: string[]) {
  const lista = [...new Set(tickers.map(normalizar).filter(Boolean))].slice(0, 200);
  if (!lista.length) return { gravados: 0 };
  try {
    const { precosBrapiEtfs } = await import("@/lib/etfs-brapi.server");
    const { dentroDoPregao } = await import("@/lib/cotacoes-cache.server");
    const aoVivo = dentroDoPregao();
    const precos = (await precosBrapiEtfs(lista))
      // Só preços em reais: tickers que resolvem para bolsas estrangeiras
      // (ex.: "IVVB" nos EUA) devolvem USD e contaminariam a tabela.
      .filter((p) => !p.moeda || p.moeda === "BRL")
      .filter((p) => p.preco !== null && Number.isFinite(p.preco) && (p.preco as number) > 0)

      .map((p) => ({
        ticker: p.ticker,
        preco: p.preco as number,
        variacaoPercent: p.variacaoPercent ?? null,
        fonte: "brapi",
        aoVivo,
        atualizadoEm: p.atualizadoEm ?? new Date().toISOString(),
      }));
    return gravarPrecosPersistidos(precos);
  } catch {
    return { gravados: 0 };
  }
}
