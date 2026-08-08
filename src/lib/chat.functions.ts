import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface MensagemSalva {
  id: string;
  role: "user" | "assistant";
  texto: string;
}

export const listarMensagens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MensagemSalva[]> => {
    const { data, error } = await context.supabase
      .from("chat_mensagens")
      .select("id, role, parts")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const parts = Array.isArray(row.parts) ? row.parts : [];
      const texto = parts
        .map((p) =>
          p && typeof p === "object" && "text" in p
            ? String((p as { text?: string }).text ?? "")
            : "",
        )
        .join("");
      return { id: row.id, role: row.role as "user" | "assistant", texto };
    });
  });

export const limparConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("chat_mensagens")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
