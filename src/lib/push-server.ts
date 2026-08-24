/**
 * Push Server-side — envia notificações via Web Push (VAPID) para assinaturas
 * salvas no Supabase.
 *
 * Dependências:
 *   - web-push (npm)
 *   - Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: ou URL)
 *
 * As funções usam o service role do Supabase (supabaseAdmin) para ler as
 * assinaturas, então só devem ser chamadas de hooks internos (com CRON_SECRET)
 * ou de server functions restritas.
 */

import webPush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Linha da tabela push_subscriptions (select parcial: endpoint + keys). */
interface AssinaturaPushRow {
  endpoint: string;
  keys: { p256dh: string; auth: string } | null;
}

/* ------------------------------------------------------------------ *
 * Configuração VAPID (lazy, validada no primeiro envio)
 * ------------------------------------------------------------------ */
let vapidConfigurado = false;

function configurarVapid() {
  if (vapidConfigurado) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:contato@viverderendaem15anos.app";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys não configuradas. Gere-as com `npm run gerar:vapid` e " +
        "adicione VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY ao .env.local.",
    );
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigurado = true;
}

/* ------------------------------------------------------------------ *
 * Tipos
 * ------------------------------------------------------------------ */

export interface PushSubscriptionRow {
  user_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string } | null;
  user_agent: string | null;
  created_at: string;
}

export interface NotificacaoPush {
  titulo: string;
  corpo: string;
  tag?: string;
  url?: string;
  renotify?: boolean;
}

/* ------------------------------------------------------------------ *
 * Envio para um usuário
 * ------------------------------------------------------------------ */

/**
 * Busca as assinaturas push do usuário e envia a notificação para cada uma.
 * Retorna o número de notificações enviadas com sucesso e as falhas.
 */
export async function enviarPushParaUsuario(
  supabase: SupabaseClient,
  userId: string,
  notificacao: NotificacaoPush,
): Promise<{ enviadas: number; falhas: number }> {
  configurarVapid();

  const { data: assinaturas, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, keys")
    .eq("user_id", userId);

  if (error || !assinaturas?.length) return { enviadas: 0, falhas: 0 };

  let enviadas = 0;
  let falhas = 0;

  const payload = JSON.stringify(notificacao);

  for (const row of assinaturas as AssinaturaPushRow[]) {
    if (!row.keys || !row.endpoint) continue;
    try {
      const subscription: PushSubscriptionJSON = {
        endpoint: row.endpoint,
        keys: { p256dh: row.keys.p256dh, auth: row.keys.auth },
      };
      await webPush.sendNotification(subscription as unknown as webPush.PushSubscription, payload, {
        TTL: 86400, // 24h
      });
      enviadas++;
    } catch (err) {
      // 410/404 = assinatura expirada — remover
      if (
        err instanceof webPush.WebPushError &&
        (err.statusCode === 410 || err.statusCode === 404)
      ) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
      }
      falhas++;
    }
  }

  return { enviadas, falhas };
}

/**
 * Envia para TODAS as assinaturas (broadcast). Útil para hooks administrados
 * (ex.: "O radar encontrou novas oportunidades"). Use com moderação.
 */
export async function enviarPushBroadcast(
  supabase: SupabaseClient,
  notificacao: NotificacaoPush,
): Promise<{ enviadas: number; falhas: number }> {
  configurarVapid();
  const { data: assinaturas, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, keys");

  if (error || !assinaturas?.length) return { enviadas: 0, falhas: 0 };

  let enviadas = 0;
  let falhas = 0;
  const payload = JSON.stringify(notificacao);

  for (const row of assinaturas as AssinaturaPushRow[]) {
    if (!row.keys || !row.endpoint) continue;
    try {
      const subscription: PushSubscriptionJSON = {
        endpoint: row.endpoint,
        keys: { p256dh: row.keys.p256dh, auth: row.keys.auth },
      };
      await webPush.sendNotification(subscription as unknown as webPush.PushSubscription, payload, {
        TTL: 86400,
      });
      enviadas++;
    } catch (err) {
      if (
        err instanceof webPush.WebPushError &&
        (err.statusCode === 410 || err.statusCode === 404)
      ) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
      }
      falhas++;
    }
  }

  return { enviadas, falhas };
}
