/**
 * Validação de URLs base de provedores de IA fornecidas pelo usuário.
 * Impede SSRF: exige HTTPS e bloqueia loopback, redes privadas, link-local
 * e endpoints de metadados de nuvem.
 */

const HOSTS_PERMITIDOS = [
  "api.cline.bot",
  "cline.bot",
  "openrouter.ai",
  "api.orcarouter.ai",
  "integrate.api.nvidia.com",
  "opencode.ai",
  "api.groq.com",
  "api.kilo.ai",
  "generativelanguage.googleapis.com",
  "api.openai.com",
  "api.mistral.ai",
  "api.together.xyz",
  "api.deepseek.com",
  "api.cerebras.ai",
  "api.sambanova.ai",
  "api.anthropic.com",
  "api.tokenrouter.ai",
  "tokenrouter.ai",
  "api.x.ai",
  "api.fireworks.ai",
  "api.hyperbolic.xyz",
  "api.novita.ai",
  "openai.inference.de-txl.ionos.com",
  "ai-gateway.lovable.dev",
];

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function ehIpPrivado(host: string): boolean {
  const m = IPV4.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export interface UrlProvedorValida {
  ok: true;
  url: string;
  hostname: string;
}
export interface UrlProvedorInvalida {
  ok: false;
  motivo: string;
}

/** Normaliza e valida a URL base; retorna a URL sem barra final quando aprovada. */
export function validarBaseUrlProvedor(
  entrada: string | null | undefined,
): UrlProvedorValida | UrlProvedorInvalida {
  const bruto = (entrada ?? "").trim();
  if (!bruto) return { ok: false, motivo: "URL base do provedor não informada." };

  let url: URL;
  try {
    url = new URL(bruto);
  } catch {
    return { ok: false, motivo: "URL base do provedor inválida." };
  }

  if (url.protocol !== "https:")
    return { ok: false, motivo: "A URL base do provedor precisa usar HTTPS." };

  const host = url.hostname.toLowerCase().replace(/\.$/, "");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.includes(":") ||
    ehIpPrivado(host)
  ) {
    return { ok: false, motivo: "Endereços internos ou privados não são permitidos." };
  }

  const permitido = HOSTS_PERMITIDOS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!permitido) {
    return {
      ok: false,
      motivo: `O domínio "${host}" não está na lista de provedores de IA permitidos.`,
    };
  }

  return { ok: true, url: `${url.origin}${url.pathname.replace(/\/+$/, "")}`, hostname: host };
}
