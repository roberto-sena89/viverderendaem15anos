import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { PROVEDORES_ENV } from "@/lib/provedores-env.server";

export const Route = createFileRoute("/api/ia/provedores")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Nao autenticado", { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "").trim();
        if (!token) {
          return new Response("Nao autenticado", { status: 401 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return new Response("Backend nao configurado", { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData?.user?.id) {
          return new Response("Sessao invalida", { status: 401 });
        }

        const provedores = PROVEDORES_ENV.map((p) => {
          const chave = (process.env[p.variavel] ?? "").trim();
          return {
            id: p.variavel,
            nome: p.nome,
            baseUrl: p.baseUrl,
            modelo: p.modelo,
            urlChave: p.urlChave,
            configurado: chave.length > 0 || Boolean(p.aceitaAnonimo),
          };
        });

        const provedorAtivo = provedores.find((p) => p.configurado) ?? null;

        return Response.json({ provedores, provedorAtivo });
      },
    },
  },
});