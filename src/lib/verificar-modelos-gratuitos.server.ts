/**
 * Verificação da disponibilidade dos modelos gratuitos de cada provedor de IA.
 *
 * Consulta o catálogo (/models) de cada provedor configurado, filtra os
 * modelos gratuitos e compara com as listas cadastradas no código
 * (provedores-env.server.ts e provedor-ia.ts), sinalizando modelos que
 * sumiram do catálogo e sugerindo novos gratuitos.
 *
 * Este módulo não importa nada do projeto: roda tanto no servidor (rota
 * /api/modelos-gratuitos) quanto em linha de comando (scripts/
 * verificar-modelos.ts, executado pelo Node com type stripping).
 */

export interface ModeloGratuito {
  /** ID do modelo no catálogo do provedor. */
  id: string;
  /** Contexto em tokens, quando informado pelo catálogo. */
  ctx: number | null;
  nota?: string;
}

export interface VerificacaoProvedor {
  chave: string;
  nome: string;
  status: "ok" | "sem-chave" | "erro";
  mensagem: string;
  modelosGratuitos: ModeloGratuito[];
}

export interface ModeloConfigurado {
  provedor: string;
  modelo: string;
}

export interface RelatorioVerificacao {
  geradoEm: string;
  provedores: VerificacaoProvedor[];
  /** Modelos cadastrados no código que não estão mais gratuitos no catálogo. */
  desaparecidos: ModeloConfigurado[];
  /** Modelos gratuitos encontrados e ainda não cadastrados no código. */
  novosSugeridos: { provedor: string; modelo: string; ctx: number | null }[];
  resumo: string;
}

interface VerificadorProvedor {
  chave: string;
  nome: string;
  baseUrl: string;
  variavelChave: string;
  /** Padrões de ID que indicam modelo gratuito (ex.: sufixo -free ou :free). */
  padroesGratuitos?: RegExp[];
  /** IDs gratuitos sem marcador no nome, documentados pelo provedor. */
  idsGratuitosAdicionais?: string[];
  /** true = todo o catálogo é gratuito (com limites do free tier). */
  catalogoInteiroGratuito?: boolean;
  /** true = o catálogo exige chave de API (sem chave, marca como "sem-chave"). */
  exigeChave?: boolean;
  /** Caminho do endpoint de catálogo (padrão: /models). */
  caminhoModels?: string;
  /** true = chave vai na query string (?key=) em vez do header Authorization. */
  chaveViaQuery?: boolean;
  nota?: string;
}

const VERIFICADORES: readonly VerificadorProvedor[] = [
  {
    chave: "openrouter",
    nome: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    variavelChave: "OPENROUTER_API_KEY",
    padroesGratuitos: [/:free$/i],
  },
  {
    chave: "tokenrouter",
    nome: "Token Router",
    baseUrl: "https://api.tokenrouter.com/v1",
    variavelChave: "TOKEN_ROUTER_API_KEY",
    padroesGratuitos: [/-free$/i],
    exigeChave: true,
  },
  {
    chave: "orcarouter",
    nome: "OrcaRouter",
    baseUrl: "https://api.orcarouter.ai/v1",
    variavelChave: "ORCAROUTER_API_KEY",
    padroesGratuitos: [/-free$/i],
    idsGratuitosAdicionais: ["orcarouter/free"],
  },
  {
    chave: "nvidia",
    nome: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    variavelChave: "NVIDIA_API_KEY",
    catalogoInteiroGratuito: true,
    nota: "free tier NVIDIA (build.nvidia.com, com limites de requisição)",
  },
  {
    chave: "opencodezen",
    nome: "OpenCode Zen",
    baseUrl: "https://opencode.ai/zen/v1",
    variavelChave: "OPENCODE_API_KEY",
    padroesGratuitos: [/-free$/i],
  },
  {
    chave: "cline",
    nome: "Cline",
    baseUrl: "https://api.cline.bot/api/v1",
    variavelChave: "CLINE_API_KEY",
    padroesGratuitos: [/-free$/i],
    idsGratuitosAdicionais: ["minimax/minimax-m3", "xiaomi/mimo-v2.5", "deepseek-v4-flash"],
    exigeChave: true,
  },
  {
    chave: "groq",
    nome: "Groq Cloud",
    baseUrl: "https://api.groq.com/openai/v1",
    variavelChave: "GROQ_API_KEY",
    catalogoInteiroGratuito: true,
    nota: "free tier Groq (limites diários)",
    exigeChave: true,
  },
  {
    chave: "gemini",
    nome: "Google AI Studio (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    variavelChave: "GOOGLE_GENERATIVE_AI_API_KEY",
    padroesGratuitos: [/flash/i],
    nota: "modelos Flash da camada gratuita",
    exigeChave: true,
    caminhoModels: "/models",
    chaveViaQuery: true,
  },
  {
    chave: "cerebras",
    nome: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    variavelChave: "CEREBRAS_API_KEY",
    catalogoInteiroGratuito: true,
    nota: "free tier Cerebras (limites diários)",
    exigeChave: true,
  },
];

function chaveDoProvedor(provedor: VerificadorProvedor, env: NodeJS.ProcessEnv): string {
  const chave = env[provedor.variavelChave]?.trim() ?? "";
  if (chave) return chave;
  if (provedor.variavelChave === "GOOGLE_GENERATIVE_AI_API_KEY") {
    return env.GEMINI_API_KEY?.trim() ?? "";
  }
  return "";
}

function ehGratuito(provedor: VerificadorProvedor, id: string): boolean {
  if (provedor.catalogoInteiroGratuito) return true;
  if (provedor.padroesGratuitos?.some((re) => re.test(id)) ?? false) return true;
  return (
    provedor.idsGratuitosAdicionais?.some(
      (adicional) => id.toLowerCase() === adicional.toLowerCase(),
    ) ?? false
  );
}

async function buscarCatalogo(
  provedor: VerificadorProvedor,
  env: NodeJS.ProcessEnv,
): Promise<VerificacaoProvedor> {
  const base = provedor.baseUrl.replace(/\/$/, "");
  const chave = chaveDoProvedor(provedor, env);
  if (provedor.exigeChave && !chave) {
    return {
      chave: provedor.chave,
      nome: provedor.nome,
      status: "sem-chave",
      mensagem: "Nenhuma chave de API configurada — verificação exige chave.",
      modelosGratuitos: [],
    };
  }
  const tentativas: (string | null)[] = provedor.exigeChave
    ? [chave]
    : chave
      ? [null, chave]
      : [null];

  for (const chaveTentativa of tentativas) {
    try {
      const caminho = provedor.caminhoModels ?? "/models";
      const url = `${base}${caminho}${
        provedor.chaveViaQuery && chaveTentativa ? `?key=${encodeURIComponent(chaveTentativa)}` : ""
      }`;
      const resposta = await fetch(url, {
        headers: {
          "User-Agent": "viverderenda-verificador/1.0",
          ...(chaveTentativa && !provedor.chaveViaQuery
            ? { Authorization: `Bearer ${chaveTentativa}` }
            : {}),
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (resposta.status === 401 || resposta.status === 403) {
        if (!chaveTentativa && chave) continue;
        return {
          chave: provedor.chave,
          nome: provedor.nome,
          status: chave ? "erro" : "sem-chave",
          mensagem: chave
            ? `Sem acesso ao catálogo (HTTP ${resposta.status})`
            : "Nenhuma chave de API configurada — verificação exige chave.",
          modelosGratuitos: [],
        };
      }

      if (!resposta.ok) {
        return {
          chave: provedor.chave,
          nome: provedor.nome,
          status: "erro",
          mensagem: `HTTP ${resposta.status}`,
          modelosGratuitos: [],
        };
      }

      const corpo = (await resposta.json()) as {
        data?: unknown[];
        models?: unknown[];
      };
      const lista = Array.isArray(corpo.data) ? corpo.data : (corpo.models ?? []);
      const modelos = lista
        .map((item) => {
          const m = item as { id?: unknown; context_length?: unknown; contextWindow?: unknown };
          const id = typeof m.id === "string" ? m.id.trim() : "";
          const ctx =
            typeof m.context_length === "number"
              ? m.context_length
              : typeof m.contextWindow === "number"
                ? m.contextWindow
                : null;
          return { id, ctx };
        })
        .filter((m) => m.id && ehGratuito(provedor, m.id))
        .sort((a, b) => (b.ctx ?? 0) - (a.ctx ?? 0))
        .map((m) => ({ id: m.id, ctx: m.ctx, nota: provedor.nota }));

      return {
        chave: provedor.chave,
        nome: provedor.nome,
        status: "ok",
        mensagem: `${modelos.length} modelos gratuitos no catálogo`,
        modelosGratuitos: modelos,
      };
    } catch (e) {
      return {
        chave: provedor.chave,
        nome: provedor.nome,
        status: "erro",
        mensagem: e instanceof Error ? e.message : "Falha de rede ao consultar o catálogo.",
        modelosGratuitos: [],
      };
    }
  }

  return {
    chave: provedor.chave,
    nome: provedor.nome,
    status: "erro",
    mensagem: "Falha ao consultar o catálogo.",
    modelosGratuitos: [],
  };
}

async function comLimite<T>(
  itens: readonly T[],
  limite: number,
  executar: (item: T) => Promise<VerificacaoProvedor>,
): Promise<VerificacaoProvedor[]> {
  const resultados: VerificacaoProvedor[] = [];
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await executar(itens[indice]!);
    }
  });
  await Promise.all(trabalhadores);
  return resultados;
}

/** Mapeia o nome do provedor nas listas do código para a chave do verificador. */
const ALIASES_CHAVE: readonly [string, string][] = [
  ["tokenrouter", "tokenrouter"],
  ["orcarouter", "orcarouter"],
  ["opencodezen", "opencodezen"],
  ["openrouter", "openrouter"],
  ["nvidia", "nvidia"],
  ["cline", "cline"],
  ["groq", "groq"],
  ["gemini", "gemini"],
  ["cerebras", "cerebras"],
];

function chavePorNome(nome: string): string | null {
  const normalizado = nome.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [alias, chave] of ALIASES_CHAVE) {
    if (normalizado.includes(alias)) return chave;
  }
  return null;
}

/**
 * Monta a lista de modelos configurados como gratuitos a partir das listas do
 * código (provedores de ambiente do servidor + presets da tela).
 */
export function modelosConfiguradosDe(
  envProvedores: readonly { nome: string; modelo: string }[],
  presets: readonly { nome: string; modelos: string[]; modelosGratuitos?: string[] }[],
): ModeloConfigurado[] {
  const vistos = new Set<string>();
  const resultado: ModeloConfigurado[] = [];
  for (const p of envProvedores) {
    const chave = chavePorNome(p.nome);
    if (!chave) continue;
    const id = `${chave}:${p.modelo.toLowerCase()}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    resultado.push({ provedor: chave, modelo: p.modelo });
  }
  for (const p of presets) {
    const chave = chavePorNome(p.nome);
    if (!chave) continue;
    for (const modelo of [...(p.modelos ?? []), ...(p.modelosGratuitos ?? [])]) {
      const id = `${chave}:${modelo.toLowerCase()}`;
      if (vistos.has(id)) continue;
      vistos.add(id);
      resultado.push({ provedor: chave, modelo });
    }
  }
  return resultado;
}

export const LIMITE_SUGESTOES = 15;

/** Consulta o catálogo de todos os provedores e compara com os configurados. */
export async function verificarModelosGratuitos(
  env: NodeJS.ProcessEnv,
  configurados: readonly ModeloConfigurado[] = [],
): Promise<RelatorioVerificacao> {
  const provedores = await comLimite(VERIFICADORES, 4, (p) => buscarCatalogo(p, env));

  const configuradosPorProvedor = new Map<string, Set<string>>();
  for (const c of configurados) {
    const conjunto = configuradosPorProvedor.get(c.provedor) ?? new Set<string>();
    conjunto.add(c.modelo.toLowerCase());
    configuradosPorProvedor.set(c.provedor, conjunto);
  }

  const desaparecidos = configurados.filter((c) => {
    const verificacao = provedores.find((p) => p.chave === c.provedor);
    if (!verificacao || verificacao.status !== "ok") return false;
    const encontrado = verificacao.modelosGratuitos.some(
      (m) => m.id.toLowerCase() === c.modelo.toLowerCase(),
    );
    return !encontrado;
  });

  const novosSugeridos: { provedor: string; modelo: string; ctx: number | null }[] = [];
  for (const p of provedores) {
    if (p.status !== "ok") continue;
    const conjunto = configuradosPorProvedor.get(p.chave);
    for (const m of p.modelosGratuitos) {
      if (!conjunto?.has(m.id.toLowerCase())) {
        novosSugeridos.push({ provedor: p.chave, modelo: m.id, ctx: m.ctx });
      }
    }
  }

  const totalGratuitos = provedores.reduce((s, p) => s + p.modelosGratuitos.length, 0);
  const comChave = provedores.filter((p) => p.status === "ok").length;
  const resumo = `${comChave}/${provedores.length} provedores verificados · ${totalGratuitos} modelos gratuitos encontrados · ${desaparecidos.length} modelos configurados sumiram do catálogo · ${novosSugeridos.length} novos gratuitos sugeridos`;

  return {
    geradoEm: new Date().toISOString(),
    provedores,
    desaparecidos,
    novosSugeridos: novosSugeridos.slice(0, LIMITE_SUGESTOES),
    resumo,
  };
}
