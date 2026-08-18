/**
 * Validação amigável das variáveis do backend (URL e chave pública) antes de
 * qualquer tentativa de criar o client Supabase.
 *
 * Sem isso, um valor ausente vira a string "undefined" e o SDK quebra a tela
 * inteira com "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.".
 */

export type ConfigBackend = { ok: true } | { ok: false; mensagem: string };

function limpar(valor: unknown): string {
  if (typeof valor !== "string") return "";
  const v = valor.trim().replace(/^["']|["']$/g, "");
  return v === "undefined" || v === "null" ? "" : v;
}

function urlValida(valor: string): boolean {
  try {
    const u = new URL(valor);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Lê as variáveis do ambiente (browser via VITE_*, servidor via process.env). */
export function lerConfigBackend(): { url: string; chave: string } {
  const env = import.meta.env as Record<string, string | undefined>;
  const proc = typeof process !== "undefined" ? (process.env ?? {}) : {};
  return {
    url: limpar(env.VITE_SUPABASE_URL) || limpar(proc.SUPABASE_URL),
    chave:
      limpar(env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
      limpar(env.VITE_SUPABASE_ANON_KEY) ||
      limpar(proc.SUPABASE_PUBLISHABLE_KEY),
  };
}

/** Diz se dá para criar o client e, se não, explica em linguagem simples. */
export function verificarConfigBackend(): ConfigBackend {
  const { url, chave } = lerConfigBackend();

  if (!url && !chave) {
    return {
      ok: false,
      mensagem:
        "A conexão com o backend não está configurada. Recarregue a página em alguns instantes — se o aviso continuar, reative o backend do projeto.",
    };
  }
  if (!url) {
    return {
      ok: false,
      mensagem:
        "O endereço do backend não foi encontrado. Recarregue a página para tentar de novo.",
    };
  }
  if (!urlValida(url)) {
    return {
      ok: false,
      mensagem:
        "O endereço do backend está inválido (precisa começar com https://). Recarregue a página para tentar de novo.",
    };
  }
  if (!chave) {
    return {
      ok: false,
      mensagem:
        "A chave pública de acesso ao backend não foi encontrada. Recarregue a página para tentar de novo.",
    };
  }
  return { ok: true };
}

/** Atalho booleano para trechos que só precisam saber se pode usar o backend. */
export function backendConfigurado(): boolean {
  return verificarConfigBackend().ok;
}
