import type { CategoriaMercado, RespostaGrade } from "@/lib/grade-mercado.server";

/**
 * Cache compartilhado das cotações.
 *
 * A grade é a mesma para todos os usuários, então guardamos o resultado no
 * banco (`public.cotacoes_cache`). Assim:
 * - cada visitante lê do cache em vez de disparar dezenas de chamadas às
 *   fontes públicas (brapi, Yahoo, CoinGecko), evitando bloqueios 429;
 * - um job agendado mantém o cache quente, de modo que o dado exibido é
 *   sempre recente mesmo quando ninguém está com a página aberta.
 */

/** Janelas de validade (ms) do cache, conforme o pregão da B3. */
export const FRESCOR_PREGAO = 45_000;
export const FRESCOR_FECHADO = 10 * 60_000;

/** Cache de processo, para servir respostas repetidas sem ida ao banco. */
const local = new Map<string, { valor: RespostaGrade; expira: number }>();

/** true quando a B3 está em pregão (dias úteis, 10h–18h de Brasília). */
export function dentroDoPregao(agora = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
  });
  const partes = Object.fromEntries(fmt.formatToParts(agora).map((p) => [p.type, p.value]));
  const dia = String(partes.weekday ?? "");
  const hora = Number(partes.hour ?? "0");
  if (dia === "Sat" || dia === "Sun") return false;
  return hora >= 10 && hora < 18;
}

export function frescorAtual() {
  return dentroDoPregao() ? FRESCOR_PREGAO : FRESCOR_FECHADO;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Lê a última grade salva de uma categoria (ou null quando nunca gravada). */
export async function lerCache(categoria: CategoriaMercado): Promise<RespostaGrade | null> {
  const emMemoria = local.get(categoria);
  if (emMemoria && emMemoria.expira > Date.now()) return emMemoria.valor;
  try {
    const db = await admin();
    const { data } = await db
      .from("cotacoes_cache")
      .select("payload, atualizado_em")
      .eq("categoria", categoria)
      .maybeSingle();
    if (!data?.payload) return null;
    const valor = {
      ...(data.payload as unknown as RespostaGrade),
      atualizadoEm: data.atualizado_em,
    };
    local.set(categoria, { valor, expira: Date.now() + 10_000 });
    return valor;
  } catch {
    return null;
  }
}

/** Grava a grade recém-buscada no cache compartilhado. */
export async function gravarCache(categoria: CategoriaMercado, grade: RespostaGrade) {
  local.set(categoria, { valor: grade, expira: Date.now() + 10_000 });
  try {
    const db = await admin();
    await db.from("cotacoes_cache").upsert(
      {
        categoria,
        payload: JSON.parse(JSON.stringify(grade)),
        parcial: grade.parcial,
        atualizado_em: grade.atualizadoEm,
      },
      { onConflict: "categoria" },
    );
  } catch {
    /* cache é best-effort: falha de gravação não pode derrubar a resposta */
  }
}

export function idadeMs(grade: RespostaGrade) {
  const t = Date.parse(grade.atualizadoEm);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : Date.now() - t;
}
