import type { Noticia } from "@/lib/noticias.server";

/**
 * Cache compartilhado das notícias.
 *
 * O feed é igual para todos os usuários, então guardamos o resultado no banco
 * (`public.cotacoes_cache`, mesma tabela usada pelas cotações). Assim:
 * - um servidor recém-iniciado (cold start do preview/worker) responde na hora
 *   com o feed salvo, em vez de re-buscar os ~11 feeds RSS de uma vez;
 * - enquanto o dado está velho, devolvemos o valor atual e atualizamos em
 *   segundo plano (stale-while-revalidate), sem bloquear o visitante.
 */

/** Chave da linha de cache dentro de `cotacoes_cache`. */
const CHAVE = "noticias";

/** Frescor do feed: abaixo disso, serve direto do cache sem revalidar. */
export const FRESCOR_NOTICIAS = 4 * 60 * 1000;

interface ValorCache {
  itens: Noticia[];
  atualizadoEm: string;
}

/** Cache de processo: respostas repetidas sem ida ao banco. */
const local = new Map<string, { valor: ValorCache; expira: number }>();

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Lê o feed salvo no banco (ou null quando nunca gravado). */
export async function lerCacheNoticias(): Promise<ValorCache | null> {
  const emMemoria = local.get(CHAVE);
  if (emMemoria && emMemoria.expira > Date.now()) return emMemoria.valor;
  try {
    const db = await admin();
    const { data } = await db
      .from("cotacoes_cache")
      .select("payload, atualizado_em")
      .eq("categoria", CHAVE)
      .maybeSingle();
    if (!data?.payload) return null;
    const valor: ValorCache = {
      itens: data.payload as unknown as Noticia[],
      atualizadoEm: data.atualizado_em,
    };
    local.set(CHAVE, { valor, expira: Date.now() + 10_000 });
    return valor;
  } catch {
    return null;
  }
}

/** Grava o feed recém-buscado no cache compartilhado. */
export async function gravarCacheNoticias(itens: Noticia[]) {
  const valor: ValorCache = { itens, atualizadoEm: new Date().toISOString() };
  local.set(CHAVE, { valor, expira: Date.now() + 10_000 });
  try {
    const db = await admin();
    await db.from("cotacoes_cache").upsert(
      {
        categoria: CHAVE,
        payload: JSON.parse(JSON.stringify(itens)),
        parcial: false,
        atualizado_em: valor.atualizadoEm,
      },
      { onConflict: "categoria" },
    );
  } catch {
    /* cache é best-effort: falha de gravação não pode derrubar a resposta */
  }
}

export function idadeMs(valor: ValorCache) {
  const t = Date.parse(valor.atualizadoEm);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : Date.now() - t;
}
