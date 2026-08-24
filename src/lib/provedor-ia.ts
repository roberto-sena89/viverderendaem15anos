import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  /* 1. OpenRouter */
  {
    id: "openrouter",
    nome: "OpenRouter",
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
    modelosGratuitos: [
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
  /* 2. OrcaRouter */
  {
    id: "orcarouter",
    nome: "OrcaRouter",
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
  /* 4. Nvidia */
  {
    id: "nvidia",
    nome: "Nvidia",
    descricao: "Camada gratuita NVIDIA (build.nvidia.com, com limites de requisição).",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modelos: [],
    modelosGratuitos: [],
    urlChave: "https://build.nvidia.com/",
  },
  /* 5. OpenCode Zen */
  {
    id: "opencodezen",
    nome: "OpenCode Zen",
    descricao: "Camada gratuita do OpenCode Zen.",
    baseUrl: "https://opencode.ai/zen/v1",
    modelos: [],
    modelosGratuitos: [],
    urlChave: "https://opencode.ai/",
  },
  /* 7. Groq */
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
    ],
    modelosGratuitos: [
      "groq/compound",
      "groq/compound-mini",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
      "allam-2-7b",
    ],
    urlChave: "https://console.groq.com/keys",
  },
  /* 8. Cline Bot — OX Alpha (grátis) */
  {
    id: "cline",
    nome: "Cline Bot",
    descricao:
      "Gateway Cline Bot (api.cline.bot) — OX Alpha (stealth/ox-alpha) com 1M de contexto, gratuito no preview, além de 100+ modelos (Claude, GPT, Gemini) via chave única.",
    baseUrl: "https://api.cline.bot/api/v1",
    modelos: [
      "stealth/ox-alpha",
      "minimax/minimax-m2.5",
      "anthropic/claude-sonnet-4-6",
      "openai/gpt-4o",
      "google/gemini-2.5-pro",
      "deepseek/deepseek-chat",
    ],
    modelosGratuitos: ["stealth/ox-alpha", "minimax/minimax-m2.5"],
    urlChave: "https://app.cline.bot",
  },
  /* B.AI */
  {
    id: "nous",
    nome: "B.AI",
    descricao:
      "B.AI — agregação de modelos (Claude, GPT, Gemini, DeepSeek, Kimi, GLM, MiniMax). Serviço pago por crédito.",
    baseUrl: "https://api.b.ai/v1",
    modelos: [
      "gpt-5.4",
      "gpt-5.2",
      "gpt-5.4-mini",
      "claude-sonnet-4-6",
      "claude-opus-4-7",
      "claude-haiku-4-5",
      "gemini-3.5-flash",
      "gemini-3-flash",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "kimi-k2.5",
      "glm-5.1",
      "minimax-m3",
    ],
    modelosGratuitos: [],
    urlChave: "https://docs.b.ai",
  },

  /* 9. Kilo Code */
  {
    id: "kilocode",
    nome: "Kilo Code",
    descricao:
      "AI Gateway da Kilo — modelos gratuitos (:free) com acesso anônimo limitado (200 req/hora/IP) ou com chave grátis.",
    baseUrl: "https://api.kilo.ai/api/gateway",
    modelos: [
      "kilo-auto/free",
      "stepfun/step-3.7-flash:free",
      "tencent/hy3:free",
      "openrouter/free",
      "poolside/laguna-s-2.1:free",
      "poolside/laguna-xs-2.1:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
    ],
    modelosGratuitos: [
      "stepfun/step-3.7-flash:free",
      "tencent/hy3:free",
      "openrouter/free",
      "poolside/laguna-s-2.1:free",
      "poolside/laguna-xs-2.1:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
    ],
    urlChave: "https://kilo.ai",
  },
  /* 9. Personalizado */
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

/** Configuração padrão do Gestor IA: Kilo Code (AI Gateway, modelo gratuito). */
export const CONFIG_PADRAO: ConfigProvedorIA = {
  preset: "kilocode",
  baseUrl: "https://api.kilo.ai/api/gateway",
  modelo: "stepfun/step-3.7-flash:free",
  chave: "",
  chavesPorProvedor: {},
};

export function lerConfigProvedor(): ConfigProvedorIA {
  if (typeof window === "undefined") return CONFIG_PADRAO;
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return CONFIG_PADRAO;
    const dados = JSON.parse(bruto) as Partial<ConfigProvedorIA>;
    const preset = dados.preset ?? "kilocode";
    if (!PRESETS_PROVEDOR.some((p) => p.id === preset)) {
      window.localStorage.removeItem(CHAVE_STORAGE);
      return CONFIG_PADRAO;
    }
    const chavesPorProvedor =
      dados.chavesPorProvedor && typeof dados.chavesPorProvedor === "object"
        ? { ...dados.chavesPorProvedor }
        : {};
    const chave = dados.chave ?? chavesPorProvedor[preset] ?? "";
    if (chave) chavesPorProvedor[preset] = chave;
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

/**
 * Config válida = provedor com URL e modelo preenchidos, e com chave própria OU
 * vínculo com uma variável de ambiente do servidor (ex.: Kilo, que aceita
 * acesso anônimo; a chave então fica no servidor e nunca vai para o navegador).
 */
export function provedorAtivo(config: ConfigProvedorIA) {
  const temChave = Boolean(config.chave.trim());
  const usaChaveDoServidor = Boolean(
    PRESET_PARA_VARIAVEL_BACKEND[config.preset] && config.baseUrl.trim() && config.modelo.trim(),
  );
  return Boolean(config.baseUrl.trim() && config.modelo.trim() && (temChave || usaChaveDoServidor));
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
    if (novo.chave.trim()) {
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
export const PRESET_PARA_VARIAVEL_BACKEND: Record<string, string> = {
  orcarouter: "ORCAROUTER_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  opencodezen: "OPENCODE_API_KEY",
  groq: "GROQ_API_KEY",
  cline: "CLINE_API_KEY",
  kilocode: "KILO_API_KEY",
  nous: "BAI_API_KEY",
};

export function cabecalhosProvedor(config: ConfigProvedorIA): Record<string, string> {
  const variavelBackend = PRESET_PARA_VARIAVEL_BACKEND[config.preset];

  if (variavelBackend && !config.chave.trim() && config.baseUrl.trim() && config.modelo.trim()) {
    return {
      "X-IA-Provedor": variavelBackend,
      "X-IA-Modelo": config.modelo.trim(),
    };
  }

  if (provedorAtivo(config)) {
    return {
      "X-IA-Base-Url": config.baseUrl.trim(),
      "X-IA-Modelo": config.modelo.trim(),
      "X-IA-Chave": config.chave.trim(),
    };
  }

  return {};
}

export interface ProvedorBackend {
  id: string;
  nome: string;
  baseUrl: string;
  modelo: string;
  urlChave: string;
  configurado: boolean;
}

export async function listarProvedoresBackend(): Promise<ProvedorBackend[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Não autenticado");
  }

  const response = await fetch("/api/ia/provedores", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar provedores: ${response.status}`);
  }

  const dados: unknown = await response.json();
  if (Array.isArray(dados)) return dados as ProvedorBackend[];
  const lista = (dados as { provedores?: unknown })?.provedores;
  return Array.isArray(lista) ? (lista as ProvedorBackend[]) : [];
}
// --------------------------------------------------------------------------
// Histórico de testes de conexão (localStorage — diagnóstico client-side)
// --------------------------------------------------------------------------

export interface RegistroTesteConexao {
  /** ISO timestamp do teste. */
  timestamp: string;
  /** Nome amigável do provedor testado (ex.: "OpenRouter (modelos :free)"). */
  provedor: string;
  /** true = sucesso, false = falha. */
  ok: boolean;
  /** Código HTTP retornado (0 para erros de rede). */
  status: number;
  /** Resumo do resultado (ex.: "Conexão validada — 42 modelos"). */
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
