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
}

export interface PresetProvedor {
  id: string;
  nome: string;
  descricao: string;
  baseUrl: string;
  modelos: string[];
  urlChave: string;
}

/** Provedores com camada gratuita (free tier) compatíveis com a API OpenAI. */
export const PRESETS_PROVEDOR: PresetProvedor[] = [
  {
    id: "openrouter",
    nome: "OpenRouter (modelos :free)",
    descricao: "Catálogo com dezenas de modelos gratuitos (sufixo :free). Chave grátis.",
    baseUrl: "https://openrouter.ai/api/v1",
    modelos: [
      "deepseek/deepseek-chat-v3-0324:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "google/gemma-3-27b-it:free",
    ],
    urlChave: "https://openrouter.ai/keys",
  },
  {
    id: "groq",
    nome: "Groq Cloud",
    descricao: "Camada gratuita muito rápida com modelos Llama e Qwen.",
    baseUrl: "https://api.groq.com/openai/v1",
    modelos: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b"],
    urlChave: "https://console.groq.com/keys",
  },
  {
    id: "gemini",
    nome: "Google AI Studio (Gemini)",
    descricao: "Camada gratuita do Gemini via endpoint compatível com OpenAI.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelos: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
    urlChave: "https://aistudio.google.com/apikey",
  },
  {
    id: "moonshot",
    nome: "Moonshot AI (Kimi)",
    descricao: "Créditos gratuitos iniciais e modelos Kimi de contexto longo.",
    baseUrl: "https://api.moonshot.ai/v1",
    modelos: ["kimi-k2-0905-preview", "moonshot-v1-8k"],
    urlChave: "https://platform.moonshot.ai/console/api-keys",
  },
  {
    id: "cerebras",
    nome: "Cerebras",
    descricao: "Camada gratuita com inferência de altíssima velocidade.",
    baseUrl: "https://api.cerebras.ai/v1",
    modelos: ["llama-3.3-70b", "qwen-3-32b"],
    urlChave: "https://cloud.cerebras.ai",
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

export const CONFIG_PADRAO: ConfigProvedorIA = {
  preset: "lovable",
  baseUrl: "",
  modelo: "",
  chave: "",
};

export function lerConfigProvedor(): ConfigProvedorIA {
  if (typeof window === "undefined") return CONFIG_PADRAO;
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return CONFIG_PADRAO;
    const dados = JSON.parse(bruto) as Partial<ConfigProvedorIA>;
    return {
      preset: dados.preset ?? "lovable",
      baseUrl: dados.baseUrl ?? "",
      modelo: dados.modelo ?? "",
      chave: dados.chave ?? "",
    };
  } catch {
    return CONFIG_PADRAO;
  }
}

/** Config válida = provedor externo com URL, modelo e chave preenchidos. */
export function provedorAtivo(config: ConfigProvedorIA) {
  return Boolean(
    config.preset !== "lovable" && config.baseUrl.trim() && config.modelo.trim() && config.chave.trim(),
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
    window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(novo));
    window.dispatchEvent(new CustomEvent(EVENTO));
    setConfig(novo);
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
