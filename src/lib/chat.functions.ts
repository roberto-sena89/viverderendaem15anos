/**
 * SECURITY: Chat functions with input validation and SQL injection prevention
 * All inputs are validated with Zod schemas before database operations.
 *
 * As operações de banco usam o cliente admin (server-side) filtrado pelo
 * userId extraído do token validado pelo middleware — a leitura/escrita do
 * histórico não depende de políticas RLS da tabela.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MensagemSalvaSchema,
  ClearConversationInputSchema,
  ChatMessageDBSchema,
} from "@/shared/validators/chatValidators";

/**
 * List chat messages with validation
 * Safe against: SQL injection, type confusion, oversized payloads
 */
export const listarMensagens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<
      Array<{
        id: string;
        role: "user" | "assistant";
        texto: string;
      }>
    > => {
      try {
        // ✅ Admin client: userId vem do token validado no middleware (não do cliente)
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const result = await supabaseAdmin
          .from("chat_mensagens")
          .select("id, role, parts, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: true })
          .limit(1000); // ✅ Prevent DoS via large result sets

        const { data, error } = result;

        if (error) {
          console.error("[Security] Database query failed (redacted)", {
            userId: context.userId,
            timestamp: new Date().toISOString(),
          });
          return []; // ✅ Não derruba o chat: histórico vazio é degradação segura
        }

        // ✅ Validate each message with Zod
        const validMessages: Array<{
          id: string;
          role: "user" | "assistant";
          texto: string;
        }> = [];

        for (const row of data ?? []) {
          try {
            // Validate database structure
            const validatedRow = ChatMessageDBSchema.parse(row);

            // Extract text from parts safely
            const parts = Array.isArray(validatedRow.parts) ? validatedRow.parts : [];

            const texto = [
              ...parts
                .filter(
                  (p): p is (typeof parts)[number] & { text: string } =>
                    p.type === "text" && !!p.text,
                )
                .map((p) => p.text),
            ].join("\n");

            // Validate final message
            const mensagem = MensagemSalvaSchema.parse({
              id: validatedRow.id,
              role: validatedRow.role,
              texto: texto || "",
            });

            validMessages.push(mensagem);
          } catch {
            // ✅ Skip malformed messages instead of failing
            console.warn(`[Security] Invalid message structure for user ${context.userId}`, {
              messageId: row.id,
            });
            continue;
          }
        }

        return validMessages;
      } catch {
        // ✅ Generic error message - doesn't expose database details
        console.error("[Security] Message retrieval failed (redacted)", {
          userId: context.userId,
        });
        return []; // ✅ Não derruba o chat: histórico vazio é degradação segura
      }
    },
  );

/**
 * Clear conversation with validation
 * Usa admin client filtrado pelo userId validado no token (independente de RLS).
 */
export const limparConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      // ✅ Validate input
      const input = ClearConversationInputSchema.parse({
        userId: context.userId,
      });

      // ✅ Admin client: só apaga as mensagens do usuário validado no token
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error, count } = await supabaseAdmin
        .from("chat_mensagens")
        .delete()
        .eq("user_id", input.userId);

      if (error) {
        console.error("[Security] Delete operation failed (redacted)", {
          userId: context.userId,
        });
        throw new Error("Falha ao limpar conversa. Tente novamente.");
      }

      // ✅ Audit log
      console.info(`[Audit] User ${context.userId} cleared messages`, {
        deletedCount: count,
        timestamp: new Date().toISOString(),
      });

      return { ok: true, deletedCount: count };
    } catch {
      // ✅ Generic error message
      console.error("[Security] Clear conversation failed (redacted)", {
        userId: context.userId,
      });
      throw new Error("Falha ao limpar conversa. Tente novamente.");
    }
  });
