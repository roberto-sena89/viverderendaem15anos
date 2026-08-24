/**
 * Processamento dos webhooks do Pluggy (server-only).
 *
 * O endpoint (src/routes/api/public/hooks/pluggy-webhook.ts) responde 2XX
 * imediatamente e agenda aqui o processamento assíncrono. Este módulo nunca
 * lança exceção (best-effort): erros são logados e o webhook não é reenviado
 * em vão.
 *
 * Eventos tratados:
 * - `item/created` / `item/updated`: busca o item (GET /items/:id) para obter o
 *   `clientUserId` e sincroniza as posições de investimento do usuário.
 * - `item/error`: apenas registra o erro.
 * - demais eventos: ignorados (com log informativo).
 *
 * Deduplicação: o Pluggy reenvia o mesmo `eventId` nas retries. Guardamos os ids
 * vistos em memória (com TTL) para não processar duas vezes o mesmo evento.
 */

/** Webhook de dados da API Pluggy (só os campos que usamos). */
export interface WebhookPluggyDados {
  clientId?: string;
  event: string;
  eventId?: string;
  itemId?: string;
  error?: { code?: string; description?: string; detail?: string };
}

/** Cache de deduplicação por eventId (evita reprocessar retries). */
const processados = new Map<string, number>();
const DEDUP_TTL_MS = 10 * 60 * 1000;

function jaProcessado(eventId: string): boolean {
  const ate = processados.get(eventId);
  if (ate !== undefined && ate > Date.now()) return true;
  processados.set(eventId, Date.now() + DEDUP_TTL_MS);
  // limpar entradas antigas para não crescer sem limite
  if (processados.size > 500) {
    const agora = Date.now();
    for (const [k, v] of processados) if (v < agora) processados.delete(k);
  }
  return false;
}

/** Sincroniza os ativos de um usuário a partir de todos os itens conectados. */
async function sincronizarPosicoesDoUsuario(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { listarPosicoesPluggy } = await import("@/lib/pluggy.server");
  const posicoes = await listarPosicoesPluggy();

  for (const p of posicoes) {
    if (!p.quantidade || p.valorAtual <= 0) continue;

    const { data: existente } = await supabaseAdmin
      .from("ativos")
      .select("id")
      .eq("user_id", userId)
      .eq("ticker", p.ticker)
      .maybeSingle();

    const preco = p.valorAtual / (p.quantidade || 1);
    const media = p.valorCusto ? p.valorCusto / (p.quantidade || 1) : preco;
    const payload = {
      quantidade: p.quantidade,
      preco_atual: preco,
      preco_medio: media,
      categoria: p.categoria,
      nome: p.nome,
    };

    if (existente) {
      const { error } = await supabaseAdmin.from("ativos").update(payload).eq("id", existente.id);
      if (error) console.error(`[pluggy-webhook] update ${p.ticker}:`, error.message);
    } else {
      const { error } = await supabaseAdmin.from("ativos").insert({
        ticker: p.ticker,
        user_id: userId,
        ...payload,
        dy: 0,
      });
      if (error) console.error(`[pluggy-webhook] insert ${p.ticker}:`, error.message);
    }
  }
}

/** Busca um item e sincroniza as posições do usuário dono da conexão. */
async function sincronizarItem(itemId: string): Promise<void> {
  const { obterItemPluggy } = await import("@/lib/pluggy.server");
  const item = await obterItemPluggy(itemId);
  if (item?.clientUserId) {
    await sincronizarPosicoesDoUsuario(item.clientUserId);
  } else {
    // Sem clientUserId não dá para saber o dono; apenas loga (best-effort).
    console.warn(
      `[pluggy-webhook] item ${itemId} sem clientUserId — sincronização manual necessária`,
    );
  }
}

/** Ponto de entrada assíncrono chamado pela rota do webhook. */
export async function processarWebhookPluggy(dados: WebhookPluggyDados): Promise<void> {
  try {
    if (dados.eventId && jaProcessado(dados.eventId)) return;

    console.log(`[pluggy-webhook] recebido: ${dados.event} (eventId=${dados.eventId ?? "?"})`);
    const { itemId } = dados;

    switch (dados.event) {
      case "item/created":
      case "item/updated":
        if (itemId) await sincronizarItem(itemId);
        break;

      case "item/error":
        console.warn(
          `[pluggy-webhook] erro no item ${itemId ?? "?"}:`,
          dados.error?.code ?? "?",
          dados.error?.description ?? "",
          dados.error?.detail ?? "",
        );
        break;

      default:
        console.log(
          `[pluggy-webhook] evento não tratado: ${dados.event} (itemId=${itemId ?? "?"})`,
        );
    }
  } catch (e) {
    // Nunca deixa a exceção alcançar a resposta ao Pluggy.
    console.error("[pluggy-webhook] falha no processamento:", e);
  }
}
