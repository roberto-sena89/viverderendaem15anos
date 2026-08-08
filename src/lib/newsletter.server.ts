/**
 * Inscrições da newsletter.
 *
 * Guarda o e-mail em `public.newsletter` (Supabase). Upsert por e-mail:
 * repetir o envio não duplica nem notifica o usuário.
 */

export async function inscreverNewsletter(email: string, fonte: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("newsletter")
      .upsert({ email, fonte }, { onConflict: "email" });
    if (error) return { ok: false as const, erro: error.message };
    return { ok: true as const };
  } catch {
    return { ok: false as const, erro: "Erro inesperado" };
  }
}
