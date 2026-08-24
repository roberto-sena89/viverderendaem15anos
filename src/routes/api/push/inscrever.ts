import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Registra a assinatura Web Push do dispositivo, vinculada ao usuário autenticado.
 * Chamado por src/lib/push-assinatura.ts (client).
 */

type CorpoInscricao = {
  assinatura: {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string } | null;
  };
};

export const Route = createFileRoute("/api/push/inscrever")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const token = request.headers
          .get("Authorization")
          ?.replace(/^Bearer\s+/i, "")
          .trim();
        if (!token) return new Response("Não autenticado", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey)
          return new Response("Backend não configurado", { status: 500 });

        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        const userId = userData?.user?.id;
        if (userError || !userId) return new Response("Sessão inválida", { status: 401 });

        let corpo: CorpoInscricao;
        try {
          corpo = (await request.json()) as CorpoInscricao;
        } catch {
          return new Response("Corpo inválido", { status: 400 });
        }

        const { endpoint, keys } = corpo.assinatura ?? {};
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
          return new Response("Assinatura incompleta", { status: 400 });
        }

        // upsert por endpoint (um dispositivo = uma linha)
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint,
            keys: { p256dh: keys.p256dh, auth: keys.auth },
            user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          },
          { onConflict: "endpoint" },
        );

        if (error) {
          console.error("[push] falha ao salvar assinatura:", error.message);
          return new Response("Falha ao salvar assinatura", { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
