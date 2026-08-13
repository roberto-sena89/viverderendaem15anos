import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publishRunId = (value?: string) => {
    const nextRunId = value?.trim() || undefined;
    if (!runId && nextRunId) runId = nextRunId;
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    },
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

export function createLovableAiGatewayProvider(
  lovableApiKey: string,
  initialRunId?: string,
  options?: { structuredOutputs?: boolean },
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);

  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: options?.structuredOutputs ?? false,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  return Object.assign(provider, {
    getRunId: runIdFetch.getRunId,
    waitForRunId: runIdFetch.waitForRunId,
  });
}

/**
 * Provedor OpenAI-compatível configurável pelo usuário (ex.: OpenRouter com
 * modelos gratuitos). É ativado quando USER_LLM_API_KEY está definida.
 */
export function createUserLlmProvider(options: {
  apiKey: string;
  baseUrl: string;
  siteUrl?: string;
  siteName?: string;
}) {
  return createOpenAICompatible({
    name: "user-llm",
    baseURL: options.baseUrl,
    supportsStructuredOutputs: false,
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      ...(options.siteUrl ? { "HTTP-Referer": options.siteUrl } : {}),
      ...(options.siteName ? { "X-Title": options.siteName } : {}),
    },
  });
}

export const MODELO_LOVABLE = "openai/gpt-5.5";
export const MODELO_PADRAO_OPENROUTER = "google/gemma-4-31b-it:free";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const SITE_URL = "https://viverderendaem15anos.lovable.app";
const SITE_NAME = "Investidor em 15 Anos";

export type ProvedorIA = {
  gateway:
    | ReturnType<typeof createLovableAiGatewayProvider>
    | ReturnType<typeof createUserLlmProvider>;
  modelo: string;
  provedor: "lovable" | "user-llm";
};

/**
 * Resolve o provedor de IA preferencial: o configurado pelo usuário
 * (USER_LLM_*, ex.: OpenRouter com modelos gratuitos) tem prioridade; sem ele,
 * cai no gateway pago da Lovable. Retorna null quando nenhum está configurado.
 */
export function criarProvedorIA(options?: { lovableRunId?: string }): ProvedorIA | null {
  const userLlmApiKey = process.env.USER_LLM_API_KEY;
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  if (userLlmApiKey) {
    return {
      gateway: createUserLlmProvider({
        apiKey: userLlmApiKey,
        baseUrl: process.env.USER_LLM_BASE_URL ?? OPENROUTER_BASE_URL,
        siteUrl: SITE_URL,
        siteName: SITE_NAME,
      }),
      modelo: process.env.USER_LLM_MODEL ?? MODELO_PADRAO_OPENROUTER,
      provedor: "user-llm",
    };
  }
  if (lovableApiKey) {
    return {
      gateway: createLovableAiGatewayProvider(lovableApiKey, options?.lovableRunId),
      modelo: MODELO_LOVABLE,
      provedor: "lovable",
    };
  }
  return null;
}

export function getLovableAiGatewayRunId(request: Request) {
  return request.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
}
