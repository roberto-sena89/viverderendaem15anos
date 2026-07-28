import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/** Cliente Supabase que age como o usuário autenticado do MCP (RLS aplicada). */
export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function textResult(text: string, structuredContent?: Record<string, unknown>) {
  return structuredContent ? { content: [{ type: "text" as const, text }], structuredContent } : { content: [{ type: "text" as const, text }] };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function requireAuth(ctx: ToolContext) {
  return ctx.isAuthenticated() ? null : errorResult("Não autenticado. Conecte sua conta do Investidor em 15 Anos.");
}
