import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Remove a assinatura Web Push do dispositivo. Chamado por src/lib/push-assinatura.ts
 * quando o usuário desativa as notificações push.
 */

export const Route = createFileRoute("/api/push/desinscrever")({
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

        let corpo: { endpoint?: string };
        try {
          corpo = (await request.json()) as { endpoint?: string };
        } catch {
          return new Response("Corpo inválido", { status: 400 });
        }

        if (!corpo.endpoint) return new Response("Endpoint obrigatório", { status: 400 });

        // Só remove se a assinatura pertencer ao usuário autenticado
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", corpo.endpoint)
          .eq("user_id", userId);

        if (error) {
          console.error("[push] falha ao remover assinatura:", error.message);
          return new Response("Falha ao remover assinatura", { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
