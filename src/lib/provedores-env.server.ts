/** Provedor de IA configurável por variável de ambiente no servidor. */
export interface ProvedorEnv {
  /** Variável de ambiente que guarda a chave (ex.: TOKEN_ROUTER_API_KEY). */
  variavel: string;
  nome: string;
  baseUrl: string;
  /** Modelo gratuito padrão do provedor (usado quando nada é configurado na tela). */
  modelo: string;
  /** URL onde gerar a chave (para referência). */
  urlChave: string;
}

/**
 * Provedores disponíveis via variável de ambiente do servidor.
 *
 * A chave NUNCA vai para o cliente nem para o repositório — o usuário cola
 * cada chave uma única vez nas variáveis de ambiente do deploy (ou no
 * .env.local em desenvolvimento).
 *
 * Ordem de precedência quando mais de uma chave existir: a primeira da lista.
 */
export const PROVEDORES_ENV: readonly ProvedorEnv[] = [
  {
    variavel: "TOKEN_ROUTER_API_KEY",
    nome: "Token Router",
    baseUrl: "https://api.tokenrouter.com/v1",
    modelo: "deepseek/deepseek-v4-pro-0813-free",
    urlChave: "https://www.tokenrouter.com/dashboard",
  },
  {
    variavel: "ORCAROUTER_API_KEY",
    nome: "OrcaRouter",
    baseUrl: "https://api.orcarouter.ai/v1",
    modelo: "qwen/qwen3.8-27b-free",
    urlChave: "https://www.orcarouter.ai",
  },
  {
    variavel: "OPENROUTER_API_KEY",
    nome: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    modelo: "nvidia/nemotron-3-ultra-550b-a55b:free",
    urlChave: "https://openrouter.ai/keys",
  },
  {
    variavel: "NVIDIA_API_KEY",
    nome: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modelo: "z-ai/glm-5.2",
    urlChave: "https://build.nvidia.com/settings/api-keys",
  },
  {
    variavel: "OPENCODE_API_KEY",
    nome: "OpenCode Zen",
    baseUrl: "https://opencode.ai/zen/v1",
    modelo: "deepseek-v4-flash-free",
    urlChave: "https://opencode.ai/auth",
  },
  {
    variavel: "GROQ_API_KEY",
    nome: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    modelo: "llama-3.3-70b-versatile",
    urlChave: "https://console.groq.com/keys",
  },
  {
    variavel: "CEREBRAS_API_KEY",
    nome: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    modelo: "gpt-oss-120b",
    urlChave: "https://cerebras.ai/cloud",
  },
  {
    variavel: "GOOGLE_GENERATIVE_AI_API_KEY",
    nome: "Google Generative AI",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelo: "gemini-3.5-flash",
    urlChave: "https://aistudio.google.com/apikey",
  },
  {
    variavel: "CLINE_API_KEY",
    nome: "Cline",
    baseUrl: "https://api.cline.bot/api/v1",
    modelo: "minimax/minimax-m2.5",
    urlChave: "https://app.cline.bot",
  },
  ];

/** Encontra o primeiro provedor com chave configurada nas variáveis de ambiente. */
export function provedorEnvAtivo(
  env: NodeJS.ProcessEnv,
): { provedor: ProvedorEnv; chave: string } | null {
  for (const provedor of PROVEDORES_ENV) {
    const chave = env[provedor.variavel]?.trim();
    if (chave) return { provedor, chave };
  }
  return null;
}

/** Base URL do provedor, com opção de override via variável <PREFIXO>_BASE_URL. */
export function baseUrlProvedorEnv(provedor: ProvedorEnv, env: NodeJS.ProcessEnv): string {
  const prefixo = provedor.variavel.replace(/_API_KEY$/, "");
  return env[`${prefixo}_BASE_URL`]?.trim() || provedor.baseUrl;
}

