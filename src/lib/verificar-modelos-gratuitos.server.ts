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
  /**
   * Resultado da sondagem real (chat/completions de 1 token):
   * true = respondeu, false = falhou (HTTP erro, rede ou timeout).
   * undefined = não sondado (ex.: sem chave ou limite de sondagens).
   */
  funcionando?: boolean;
  /** Detalhe do teste: HTTP status, "erro de rede" ou "timeout". */
  statusTeste?: string;
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
  /**
   * Nome do header de autenticacao (default: "Authorization: Bearer ..."); use "x-api-key" para provedores como Token Router.
   */
  authHeader?: string;
  /**
   * Provedores sem endpoint /models: modelos gratuitos a sondar diretamente
   * via chat/completions (pedido mínimo de 1 token) para confirmar se existem.
   */
  modelosProbe?: string[];
  /** true = o endpoint de chat usa o mesmo caminho do catálogo (Gemini). */
  caminhoChat?: string;
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
    caminhoChat: "/openai/chat/completions",
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

async function sondarModelos(
  provedor: VerificadorProvedor,
  env: NodeJS.ProcessEnv,
): Promise<VerificacaoProvedor | null> {
  const chave = chaveDoProvedor(provedor, env);
  const modelos = provedor.modelosProbe ?? [];
  if (!chave || modelos.length === 0) return null;

  const resultados = await sondarListaModelos(provedor, chave, modelos);

  const disponiveis = resultados.filter((r) => r.funcionando);
  return {
    chave: provedor.chave,
    nome: provedor.nome,
    status: resultados.length > 0 ? "ok" : "erro",
    mensagem: `${disponiveis.length}/${resultados.length} modelos gratuitos respondendo`,
    modelosGratuitos: resultados,
  };
}

/**
 * Sonda cada modelo com uma chamada real de chat/completions (1 token),
 * com concorrência limitada para não estourar rate limits dos provedores.
 * Retorna os modelos com o resultado do teste (funcionando true/false).
 */
async function sondarListaModelos(
  provedor: VerificadorProvedor,
  chave: string,
  modelos: readonly string[],
): Promise<ModeloGratuito[]> {
  const base = provedor.baseUrl.replace(/\/$/, "");
  const caminhoChat = provedor.caminhoChat ?? "/chat/completions";
  const resultados: ModeloGratuito[] = [];
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(3, modelos.length) }, async () => {
    while (proximo < modelos.length) {
      const id = modelos[proximo++]!;
      const inicio = Date.now();
      const url = `${base}${caminhoChat}`;
      const headers: Record<string, string> = {
        "User-Agent": "viverderenda-verificador/1.0",
        "Content-Type": "application/json",
      };
      headers[provedor.authHeader ?? "Authorization"] =
        provedor.authHeader === "x-api-key" ? chave : `Bearer ${chave}`;
      try {
        const resposta = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: id,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (resposta.ok) {
          resultados.push({ id, ctx: null, funcionando: true, statusTeste: `HTTP ${resposta.status}` });
        } else if (resposta.status === 429) {
          resultados.push({
            id,
            ctx: null,
            funcionando: undefined,
            statusTeste: "rate limit (429) — não confirma",
          });
        } else {
          resultados.push({
            id,
            ctx: null,
            funcionando: false,
            statusTeste: `HTTP ${resposta.status}`,
          });
        }
      } catch (e) {
        resultados.push({
          id,
          ctx: null,
          funcionando: false,
          statusTeste:
            e instanceof Error && e.name === "TimeoutError"
              ? "timeout (20s)"
              : `erro de rede: ${e instanceof Error ? e.message : "desconhecido"}`,
        });
      }
      const gasto = Date.now() - inicio;
      const espera = Math.max(0, 250 - gasto);
      if (espera > 0) {
        await new Promise((resolve) => setTimeout(resolve, espera));
      }
    }
  });
  await Promise.all(trabalhadores);
  return resultados.sort((a, b) => (a.funcionando === b.funcionando ? 0 : a.funcionando ? -1 : 1));
}

async function buscarCatalogo(
  provedor: VerificadorProvedor,
  env: NodeJS.ProcessEnv,
  sondar: boolean,
  idsPrioritarios: ReadonlySet<string> = new Set(),
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
          ...(chaveTentativa && !provedor.chaveViaQuery && provedor.authHeader !== "x-api-key"
            ? { Authorization: `Bearer ${chaveTentativa}` }
            : {}),
          ...(chaveTentativa && provedor.authHeader === "x-api-key"
            ? { "x-api-key": chaveTentativa }
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
        if (resposta.status === 404 || resposta.status === 405) {
          const sondagem = await sondarModelos(provedor, env);
          if (sondagem) return sondagem;
        }
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
      const modelos: ModeloGratuito[] = lista
        .map((item) => {
          const m = item as {
            id?: unknown;
            name?: unknown;
            context_length?: unknown;
            contextWindow?: unknown;
          };
          const id =
            typeof m.id === "string"
              ? m.id.trim()
              : typeof m.name === "string"
                ? m.name.replace(/^models\//, "").trim()
                : "";
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

      if (sondar && chave) {
        let ids = modelos.map((m) => m.id);
        const foraDoLimite = ids.length - LIMITE_SONDAGEM_POR_PROVEDOR;
        if (foraDoLimite > 0) {
          const prioridade = new Set(
            modelos
              .filter((m) => idsPrioritarios.has(m.id.toLowerCase()))
              .map((m) => m.id),
          );
          const semPrioridade = ids.filter((id) => !prioridade.has(id));
          for (const id of prioridade) semPrioridade.unshift(id);
          ids = semPrioridade.slice(0, LIMITE_SONDAGEM_POR_PROVEDOR);
        }
        const sondados = await sondarListaModelos(provedor, chave, ids);
        const porId = new Map(sondados.map((s) => [s.id.toLowerCase(), s]));
        for (const m of modelos) {
          const s = porId.get(m.id.toLowerCase());
          if (s) {
            m.funcionando = s.funcionando;
            m.statusTeste = s.statusTeste;
          }
        }
        const funcionando = modelos.filter((m) => m.funcionando).length;
        return {
          chave: provedor.chave,
          nome: provedor.nome,
          status: "ok",
          mensagem: `${modelos.length} modelos gratuitos no catálogo · ${funcionando} respondendo`,
          modelosGratuitos: modelos,
        };
      }

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
  ["groq", "groq"],
  ["gemini", "gemini"],
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
    const modelos =
      p.modelosGratuitos && p.modelosGratuitos.length > 0 ? p.modelosGratuitos : p.modelos;
    for (const modelo of modelos) {
      const id = `${chave}:${modelo.toLowerCase()}`;
      if (vistos.has(id)) continue;
      vistos.add(id);
      resultado.push({ provedor: chave, modelo });
    }
  }
  return resultado;
}

export const LIMITE_SUGESTOES = 15;

/**
 * Máximo de modelos sondados por provedor a cada execução, para não estourar
 * rate limits dos provedores gratuitos. Os modelos configurados no código
 * (presets/provedores-env) têm prioridade na seleção.
 */
export const LIMITE_SONDAGEM_POR_PROVEDOR = 20;

/** Consulta o catálogo de todos os provedores e compara com os configurados. */
export async function verificarModelosGratuitos(
  env: NodeJS.ProcessEnv,
  configurados: readonly ModeloConfigurado[] = [],
  opcoes: { sondar?: boolean } = {},
): Promise<RelatorioVerificacao> {
  const { sondar = false } = opcoes;
  const prioritariosPorProvedor = new Map<string, Set<string>>();
  for (const c of configurados) {
    const conjunto = prioritariosPorProvedor.get(c.provedor) ?? new Set<string>();
    conjunto.add(c.modelo.toLowerCase());
    prioritariosPorProvedor.set(c.provedor, conjunto);
  }
  const provedores = await comLimite(VERIFICADORES, 4, (p) =>
    buscarCatalogo(p, env, sondar, prioritariosPorProvedor.get(p.chave) ?? new Set()),
  );

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
  const respondendo = provedores.reduce(
    (s, p) => s + p.modelosGratuitos.filter((m) => m.funcionando === true).length,
    0,
  );
  const limitados = provedores.reduce(
    (s, p) => s + p.modelosGratuitos.filter((m) => m.funcionando === undefined).length,
    0,
  );
  const falhando = provedores.reduce(
    (s, p) => s + p.modelosGratuitos.filter((m) => m.funcionando === false).length,
    0,
  );
  const resumo =
    sondar
      ? `${comChave}/${provedores.length} provedores verificados · ${totalGratuitos} modelos gratuitos no catálogo · ${respondendo} respondendo · ${limitados} com rate limit · ${falhando} falhando · ${desaparecidos.length} configurados sumiram`
      : `${comChave}/${provedores.length} provedores verificados · ${totalGratuitos} modelos gratuitos encontrados · ${desaparecidos.length} modelos configurados sumiram do catálogo · ${novosSugeridos.length} novos gratuitos sugeridos`;

  return {
    geradoEm: new Date().toISOString(),
    provedores,
    desaparecidos,
    novosSugeridos: novosSugeridos.slice(0, LIMITE_SUGESTOES),
    resumo,
  };
}
