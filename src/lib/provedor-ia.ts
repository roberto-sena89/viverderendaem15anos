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
    id: "tokenrouter",
    nome: "Token Router",
    descricao: "Roteador de modelos compatível com a API OpenAI, com opções gratuitas.",
    baseUrl: "https://api.tokenrouter.io/v1",
    modelos: ["auto", "openai/gpt-4o-mini", "deepseek/deepseek-chat"],
    urlChave: "https://tokenrouter.io/keys",
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
  chavesPorProvedor: {},
};

export function lerConfigProvedor(): ConfigProvedorIA {
  if (typeof window === "undefined") return CONFIG_PADRAO;
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return CONFIG_PADRAO;
    const dados = JSON.parse(bruto) as Partial<ConfigProvedorIA>;
    const preset = dados.preset ?? "lovable";
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

export function lerHistoricoTestes(): RegistroTesteConexao[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_HISTORICO);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados)
      ? dados.filter(
          (d) =>
            d &&
            typeof d.timestamp === "string" &&
            typeof d.provedor === "string" &&
            typeof d.ok === "boolean" &&
            typeof d.status === "number",
        )
      : [];
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

