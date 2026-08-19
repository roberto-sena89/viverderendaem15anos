import { useCallback, useEffect, useState } from "react";

/** Configuração de um provedor de IA compatível com a API OpenAI. */
export interface ConfigProvedorIA {
  /** Identificador do preset escolhido (ou "personalizado"). */
  preset: string;
  /** URL base da API (ex.: https://openrouter.ai/api/v1). */
  baseUrl: string;
  /** Modelo a ser usado (ex.: deepseek/deepseek-chat-v3:free). */
  modelo: string;
  /** Chave de API do provedor — fica salva apenas neste navegador. */
  chave: string;
  /** Chaves guardadas por provedor, para lembrar ao alternar entre eles. */
  chavesPorProvedor: Record<string, string>;
}

export interface PresetProvedor {
  id: string;
  nome: string;
  descricao: string;
  baseUrl: string;
  modelos: string[];
  urlChave: string;
  /** Modelos gratuitos verificados para este provedor (o sufixo -free/:free nem sempre é confiável). */
  modelosGratuitos?: string[];
}

/** Provedores com camada gratuita (free tier) compatíveis com a API OpenAI. */
export const PRESETS_PROVEDOR: PresetProvedor[] = [
  {
    id: "openrouter",
    nome: "OpenRouter (modelos :free)",
    descricao: "Catálogo com dezenas de modelos gratuitos (sufixo :free). Chave grátis.",
    baseUrl: "https://openrouter.ai/api/v1",
    modelos: [
      "nvidia/nemotron-3.5-lightning:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "dots-studio/dots-3-note-preview:free",
      "google/gemma-4-31b-it:free",
      "google/gemma-4-26b-a4b-it:free",
      "poolside/laguna-s-2.1:free",
      "poolside/laguna-xs-2.1:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "cohere/north-mini-code:free",
      "nvidia/nemotron-3-nano-30b-a3b:free",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      "z-ai/glm-5.2:free",
      "openai/gpt-oss-20b:free",
      "nvidia/nemotron-nano-12b-v2-vl:free",
      "nvidia/nemotron-nano-9b-v2:free",
      "nvidia/nemotron-3.5-content-safety:free",
    ],
    urlChave: "https://openrouter.ai/keys",
  },
  {
    id: "groq",
    nome: "Groq Cloud",
    descricao: "Camada gratuita muito rápida com modelos Compound, GPT-OSS e Qwen.",
    baseUrl: "https://api.groq.com/openai/v1",
    modelos: [
      "groq/compound",
      "groq/compound-mini",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
      "allam-2-7b",
      "canopylabs/orpheus-v1-english",
      "whisper-large-v3-turbo",
    ],
    urlChave: "https://console.groq.com/keys",
  },
  {
    id: "gemini",
    nome: "Google AI Studio (Gemini)",
    descricao: "Camada gratuita do Gemini via endpoint compatível com OpenAI.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelos: ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3-flash"],
    urlChave: "https://aistudio.google.com/apikey",
  },
  {
    id: "cerebras",
    nome: "Cerebras",
    descricao: "Camada gratuita com inferência de altíssima velocidade.",
    baseUrl: "https://api.cerebras.ai/v1",
    modelos: ["gpt-oss-120b", "gemma-4-31b"],
    urlChave: "https://cloud.cerebras.ai",
  },
  {
    id: "tokenrouter",
    nome: "Token Router",
    descricao:
      "Roteador de modelos compatível com a API OpenAI (tokenrouter.com), com catálogo de 300+ modelos.",
    baseUrl: "https://api.tokenrouter.com/v1",
    modelos: [
      "deepseek/deepseek-v4-pro-0813-free",
      "deepseek/deepseek-v4-pro",
      "qwen/qwen3.8-max-free",
      "qwen/qwen3.8-max",
      "openai/gpt-5.4-mini",
      "google/gemini-3.5-flash",
      "minimax/minimax-m2.5",
      "z-ai/glm-5",
    ],
    // Verificado com a API real: somente estes respondem sem crédito na conta.
    modelosGratuitos: ["deepseek/deepseek-v4-pro-0813-free", "qwen/qwen3.8-max-free"],
    urlChave: "https://www.tokenrouter.com/dashboard",
  },
  {
    id: "orcarouter",
    nome: "OrcaRouter (modelos -free)",
    descricao:
      "Roteador aberto que conecta OpenAI, Anthropic, Google e DeepSeek a preço de custo, com camada gratuita de modelos DeepSeek V4.",
    baseUrl: "https://api.orcarouter.ai/v1",
    modelos: [
      "qwen/qwen3.8-27b-free",
      "deepseek/deepseek-v4-pro-free",
      "deepseek/deepseek-v4-flash-free",
      "tencent/hy3-free",
    ],
    modelosGratuitos: [
      "qwen/qwen3.8-27b-free",
      "deepseek/deepseek-v4-pro-free",
      "deepseek/deepseek-v4-flash-free",
      "tencent/hy3-free",
    ],
    urlChave: "https://www.orcarouter.ai",
  },
  {
    id: "personalizado",
    nome: "Personalizado (compatível OpenAI)",
    descricao: "Qualquer endpoint compatível com a API OpenAI (Ollama, LM Studio, etc.).",
    baseUrl: "",
    modelos: [],
    urlChave: "",
  },
];

export const CHAVE_STORAGE = "gestor-ia-provedor";

/** Configuração da IA nativa da plataforma (sem provedor externo). */
export const CONFIG_IA_NATIVA: ConfigProvedorIA = {
  preset: "lovable",
  baseUrl: "",
  modelo: "",
  chave: "",
  chavesPorProvedor: {},
};

/** Configuração padrão do Gestor IA: provedor Token Router (modelo gratuito). */
export const CONFIG_PADRAO: ConfigProvedorIA = {
  preset: "tokenrouter",
  baseUrl: "https://api.tokenrouter.com/v1",
  modelo: "deepseek/deepseek-v4-pro-0813-free",
  chave: "",
  chavesPorProvedor: {},
};

export function lerConfigProvedor(): ConfigProvedorIA {
  if (typeof window === "undefined") return CONFIG_PADRAO;
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return CONFIG_PADRAO;
    const dados = JSON.parse(bruto) as Partial<ConfigProvedorIA>;
    const preset = dados.preset ?? "tokenrouter";
    const chavesPorProvedor =
      dados.chavesPorProvedor && typeof dados.chavesPorProvedor === "object"
        ? { ...dados.chavesPorProvedor }
        : {};
    const chave = dados.chave ?? chavesPorProvedor[preset] ?? "";
    if (chave && preset !== "lovable") chavesPorProvedor[preset] = chave;
    return {
      preset,
      baseUrl: dados.baseUrl ?? "",
      modelo: dados.modelo ?? "",
      chave,
      chavesPorProvedor,
    };
  } catch {
    return CONFIG_PADRAO;
  }
}

/** Config válida = provedor externo com URL, modelo e chave preenchidos. */
export function provedorAtivo(config: ConfigProvedorIA) {
  return Boolean(
    config.preset !== "lovable" &&
    config.baseUrl.trim() &&
    config.modelo.trim() &&
    config.chave.trim(),
  );
}

const EVENTO = "gestor-ia:provedor";

export function useProvedorIA() {
  const [config, setConfig] = useState<ConfigProvedorIA>(CONFIG_PADRAO);

  useEffect(() => {
    setConfig(lerConfigProvedor());
    const sincronizar = () => setConfig(lerConfigProvedor());
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  const salvar = useCallback((novo: ConfigProvedorIA) => {
    const chavesPorProvedor = { ...novo.chavesPorProvedor };
    if (novo.preset !== "lovable" && novo.chave.trim()) {
      chavesPorProvedor[novo.preset] = novo.chave.trim();
    }
    const completo: ConfigProvedorIA = { ...novo, chavesPorProvedor };
    window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(completo));
    window.dispatchEvent(new CustomEvent(EVENTO));
    setConfig(completo);
  }, []);

  const limpar = useCallback(() => {
    window.localStorage.removeItem(CHAVE_STORAGE);
    window.dispatchEvent(new CustomEvent(EVENTO));
    setConfig(CONFIG_PADRAO);
  }, []);

  return { config, salvar, limpar, ativo: provedorAtivo(config) };
}

/** Cabeçalhos enviados ao /api/chat quando há provedor externo configurado. */
export function cabecalhosProvedor(config: ConfigProvedorIA): Record<string, string> {
  if (!provedorAtivo(config)) return {};
  return {
    "X-IA-Base-Url": config.baseUrl.trim(),
    "X-IA-Modelo": config.modelo.trim(),
    "X-IA-Chave": config.chave.trim(),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Histórico de testes de conexão (localStorage — diagnóstico client-side)
// ──────────────────────────────────────────────────────────────────────────

export interface RegistroTesteConexao {
  /** ISO timestamp do teste. */
  timestamp: string;
  /** Nome amigável do provedor testado (ex.: "OpenRouter (modelos :free)"). */
  provedor: string;
  /** true = sucesso, false = falha. */
  ok: boolean;
  /** Código HTTP retornado (0 para erros de rede). */
  status: number;
  /** Resumo do resultado (ex.: "Conexão validada · 42 modelos"). */
  resumo: string;
}

const CHAVE_HISTORICO = "gestor-ia-testes-conexao";
const LIMITE_HISTORICO = 12;

function isRegistroTesteConexao(valor: unknown): valor is RegistroTesteConexao {
  if (!valor || typeof valor !== "object") return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r.timestamp === "string" &&
    typeof r.provedor === "string" &&
    typeof r.ok === "boolean" &&
    typeof r.status === "number" &&
    typeof r.resumo === "string"
  );
}

export function lerHistoricoTestes(): RegistroTesteConexao[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_HISTORICO);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter(isRegistroTesteConexao) : [];
  } catch {
    return [];
  }
}

/** Adiciona um registro ao histórico (mantém os últimos 12, mais novos primeiro). */
export function registrarTeste(registro: Omit<RegistroTesteConexao, "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    const atual = lerHistoricoTestes();
    const novo: RegistroTesteConexao = { timestamp: new Date().toISOString(), ...registro };
    const atualizado = [novo, ...atual].slice(0, LIMITE_HISTORICO);
    window.localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(atualizado));
  } catch {
    /* ignore — só diagnóstico client-side */
  }
}

export function limparHistoricoTestes() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CHAVE_HISTORICO);
}
