/**
 * Observador de Mercado — varredura periódica do Radar com a IA do usuário.
 *
 * A cada execução (pg_cron a cada 20 min via hook público, ou botão na
 * página) o observador monta os melhores candidatos do universo inteiro
 * (Ações + FIIs), submete à IA do provedor configurado nas variáveis de
 * ambiente (os provedores gratuitos do usuário — NUNCA o gateway pago) e
 * persiste um briefing profissional em `cotacoes_cache` chave
 * `observador:mercado` (com a varredura anterior para destacar novidades).
 *
 * Proteções: intervalo mínimo entre varreduras (10 min) e deduplicação de
 * execuções concorrentes — o provedor gratuito não é bombardeado.
 */

import type { Json } from "@/integrations/supabase/types";
import {
  isNovaOportunidade,
  montarCandidatos,
  parseRespostaObservador,
  type LinhaObservador,
  type VarreduraObservador,
} from "@/lib/observador-mercado-base";
import { baseUrlProvedorEnv, provedorEnvAtivo } from "@/lib/provedores-env.server";
import type { LinhaAcao } from "@/lib/acoes-base";
import type { LinhaFii } from "@/lib/fiis-base";

export type { VarreduraObservador } from "@/lib/observador-mercado-base";

export interface EstadoObservador {
  atual: VarreduraObservador | null;
  anterior: VarreduraObservador | null;
}

/** Intervalo mínimo entre varreduras (proteção dos provedores gratuitos). */
export const INTERVALO_MINIMO_MS = 10 * 60 * 1000;

const CHAVE_CACHE = "observador:mercado";

let varreduraEmVoo: Promise<ResultadoVarredura> | null = null;
let estadoMemoria: { valor: EstadoObservador; em: number } | null = null;
const TTL_ESTADO_MEMORIA_MS = 60 * 1000;

async function lerEstadoDoBanco(): Promise<EstadoObservador> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("cotacoes_cache")
      .select("payload")
      .eq("categoria", CHAVE_CACHE)
      .maybeSingle();
    if (!data?.payload) return { atual: null, anterior: null };
    const p = data.payload as unknown as EstadoObservador | null;
    if (!p || typeof p !== "object") return { atual: null, anterior: null };
    return { atual: p.atual ?? null, anterior: p.anterior ?? null };
  } catch {
    return { atual: null, anterior: null };
  }
}

/** Última varredura persistida (com cache curto em memória). */
export async function lerEstadoObservador(): Promise<EstadoObservador> {
  if (estadoMemoria && Date.now() - estadoMemoria.em < TTL_ESTADO_MEMORIA_MS) {
    return estadoMemoria.valor;
  }
  const valor = await lerEstadoDoBanco();
  estadoMemoria = { valor, em: Date.now() };
  return valor;
}

async function gravarEstado(nova: EstadoObservador) {
  estadoMemoria = { valor: nova, em: Date.now() };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("cotacoes_cache").upsert(
      {
        categoria: CHAVE_CACHE,
        payload: JSON.parse(JSON.stringify(nova)) as Json,
        parcial: false,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "categoria" },
    );
  } catch {
    /* best-effort: memória cobre a sessão */
  }
}

export type ResultadoVarredura =
  | { ignorado: true; proximaEm: number; estado: EstadoObservador }
  | { ignorado: false; varredura: VarreduraObservador; estado: EstadoObservador };

function fmtNum(v: number | null | undefined, casas = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

function linhaParaObservador(l: LinhaAcao | LinhaFii, categoria: "acao" | "fii"): LinhaObservador {
  return {
    ticker: l.ticker.toUpperCase(),
    nome: l.nome,
    categoria,
    setor: "setor" in l ? (l.setor ?? null) : "tipo" in l ? (l.tipo ?? null) : null,
    preco: l.preco ?? null,
    variacaoDia: l.variacaoPercent ?? null,
    dy12: l.dy12 ?? null,
    pvp: l.pvp ?? null,
  };
}

const SYSTEM = [
  "Você é o Observador de Mercado de uma mesa proprietária de investimentos: um",
  "sênior de renda variável brasileira que vigia o mercado inteiro em turnos",
  "curtos e emite briefings executivos sóbrios, sem ruído.",
  "",
  "Disciplina profissional:",
  "1. TOP-DOWN: contexto macro primeiro (juros, inflação), depois valuation,",
  "   posição do preço na própria história e risco. Não pule etapas.",
  "2. PREMISSAS COM NÚMEROS: toda conclusão cita os dados do briefing. Se",
  "   faltar dado, diga que falta. Não invente número nem preço-alvo.",
  "3. ASSIMETRIA: só vira 'comprar' o que junta preço barato na história com",
  "   fundamento em dia e risco dimensionável. 'Caiu muito' não é tese.",
  "4. CETICISMO: manchete não é tese; notícia urgente pesa, mas não decide",
  "   sozinha. Prefira omitir a afirmar sem base.",
  "5. O veredito é educacional, não recomendação formal.",
  "",
  "Responda SOMENTE com JSON válido, sem markdown, com exatamente esta forma:",
  '{"resumo":"parágrafo executivo com o estado do mercado e a leitura geral, até 6 frases",',
  '"oportunidades":[{"ticker":"PETR4","veredito":"comprar|manter|observar|vender",',
  '"conviccao":"alta|media|baixa","motivo":"por que agora, citando números, até 40 palavras",',
  '"gatilho":"o que confirmaria/invalidaria, até 25 palavras"}],',
  '"alertas":["risco ou choque que merece atenção, até 3 itens"]}',
  "Limites: no máximo 12 oportunidades, só as realmente relevantes; sem",
  "preço-alvo preciso; motivos curtos e objetivos.",
].join("\n");

/** Executa (ou deduplica/throttle) uma varredura do Observador de Mercado. */
export async function executarVarredura(agora = new Date()): Promise<ResultadoVarredura> {
  if (varreduraEmVoo) return varreduraEmVoo;
  varreduraEmVoo = executarVarreduraInterna(agora).finally(() => {
    varreduraEmVoo = null;
  });
  return varreduraEmVoo;
}

async function executarVarreduraInterna(agora: Date): Promise<ResultadoVarredura> {
  const estadoAnterior = await lerEstadoObservador();
  const ultima = estadoAnterior.atual;
  if (ultima) {
    const desde = agora.getTime() - new Date(ultima.executadaEm).getTime();
    if (desde < INTERVALO_MINIMO_MS) {
      return {
        ignorado: true,
        proximaEm: INTERVALO_MINIMO_MS - desde,
        estado: estadoAnterior,
      };
    }
  }

  const iniciadoEm = Date.now();
  const falha = (erro: string): ResultadoVarredura => {
    const varredura: VarreduraObservador = {
      executadaEm: agora.toISOString(),
      provedor: "",
      modelo: "",
      duracaoMs: Date.now() - iniciadoEm,
      macro: { selic: null, ipca: null },
      totalCandidatos: 0,
      resumo: "",
      oportunidades: [],
      alertas: [],
      erro,
    };
    void gravarEstado({ atual: varredura, anterior: estadoAnterior.atual });
    return {
      ignorado: false,
      estado: { atual: varredura, anterior: estadoAnterior.atual },
      varredura,
    };
  };

  const envProvedor = provedorEnvAtivo(process.env);
  if (!envProvedor) {
    return falha(
      "Nenhum provedor de IA configurado nas variáveis de ambiente (KILO_API_KEY, OPENROUTER_API_KEY, NVIDIA_API_KEY, OPENCODE_API_KEY, GROQ_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY). Configure uma chave no painel do deploy para o Observador funcionar.",
    );
  }

  try {
    const [acoesMod, fiisMod, radarFx, noticiasMod] = await Promise.all([
      import("@/lib/acoes.server").catch(() => null),
      import("@/lib/fiis.server").catch(() => null),
      import("@/lib/radar.server"),
      import("@/lib/noticias.server").catch(() => null),
    ]);
    const [gradeAcoes, gradeFiis, bancoPosicoes, feed, macro] = await Promise.all([
      acoesMod?.gradeAcoesComCache().catch(() => null) ?? null,
      fiisMod?.gradeFiisComCache().catch(() => null) ?? null,
      radarFx.lerPosicoesBanco().catch(() => ({ posicoes: {} })),
      noticiasMod?.agregarNoticias().catch(() => []) ?? [],
      radarFx
        .contextoMacro()
        .catch(() => ({ selic: null as number | null, ipca: null as number | null })),
    ]);

    const noticiasImpacto: Record<string, string[]> = {};
    for (const n of feed) {
      for (const t of n.tickers) {
        const chave = t.toUpperCase();
        if (!noticiasImpacto[chave]) noticiasImpacto[chave] = [];
        noticiasImpacto[chave].push(n.titulo);
      }
    }
    const urgentes = feed
      .filter((n) => n.urgente)
      .sort((a, b) => new Date(b.publicadoEm).getTime() - new Date(a.publicadoEm).getTime())
      .slice(0, 5)
      .map((n) => `- (${n.fonte}) ${n.titulo}`);

    const linhas: LinhaObservador[] = [
      ...(gradeAcoes?.linhas ?? []).map((l: LinhaAcao) => linhaParaObservador(l, "acao")),
      ...(gradeFiis?.linhas ?? []).map((l: LinhaFii) => linhaParaObservador(l, "fii")),
    ];
    const candidatos = montarCandidatos(linhas, bancoPosicoes.posicoes, noticiasImpacto);

    const varredura: VarreduraObservador = {
      executadaEm: agora.toISOString(),
      provedor: envProvedor.provedor.nome,
      modelo: envProvedor.provedor.modelo,
      duracaoMs: 0,
      macro: { selic: macro.selic, ipca: macro.ipca },
      totalCandidatos: candidatos.length,
      resumo: "",
      oportunidades: [],
      alertas: [],
      erro: null,
    };

    if (candidatos.length === 0) {
      varredura.duracaoMs = Date.now() - iniciadoEm;
      varredura.resumo =
        "Ainda não há histórico suficiente no Radar para montar os candidatos da varredura. Continue usando o Radar (ou o botão de completar histórico) para a IA começar a observar o mercado.";
      void gravarEstado({ atual: varredura, anterior: estadoAnterior.atual });
      return {
        ignorado: false,
        estado: { atual: varredura, anterior: estadoAnterior.atual },
        varredura,
      };
    }

    const linhasDoPrompt = candidatos
      .map(
        (c) =>
          `${c.ticker} ${c.nome} (${c.categoria === "acao" ? "ação" : "FII"}${c.setor ? ` · ${c.setor}` : ""}) | preço ${fmtNum(c.preco)} | var dia ${fmtNum(c.variacaoDia)}% | DY 12m ${fmtNum(c.dy12)}% | P/VP ${fmtNum(c.pvp)} | percentil ${fmtNum(c.percentil, 0)}% | dist. mín. 52s ${fmtNum(c.distMinima52sPct, 1)}% | drawdown máx ${fmtNum(c.drawdownMaximoPct, 1)}% | vol. anual ${fmtNum(c.volatilidadeAnualPct, 1)}% | score ${c.score}/100 | sinal ${c.sinal.tipo}`,
      )
      .join("\n");

    const prompt = [
      `Data/hora da varredura: ${agora.toISOString()}`,
      "",
      "Contexto macro (Banco Central):",
      `- Meta Selic: ${macro.selic !== null ? `${macro.selic}%` : "—"}`,
      `- IPCA mensal: ${macro.ipca !== null ? `${macro.ipca}%` : "—"}`,
      "",
      "Notícias urgentes do feed (atenção, mas com ceticismo):",
      ...(urgentes.length ? urgentes : ["- Nenhuma notícia urgente no momento."]),
      "",
      `Candidatos ordenados por score de oportunidade (${candidatos.length} melhores do universo ${linhas.length} ativos):`,
      linhasDoPrompt,
    ].join("\n");

    const { generateText } = await import("ai");
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const modeloIA = createOpenAICompatible({
      name: "observador-mercado",
      baseURL: baseUrlProvedorEnv(envProvedor.provedor, process.env),
      headers: envProvedor.chave
        ? { Authorization: `Bearer ${envProvedor.chave}` }
        : {},
    })(envProvedor.provedor.modelo);

    const resultado = await generateText({
      model: modeloIA,
      system: SYSTEM,
      prompt,
      maxOutputTokens: 1400,
    });

    const parsed = parseRespostaObservador(resultado.text);
    varredura.duracaoMs = Date.now() - iniciadoEm;
    varredura.resumo = parsed.resumo;
    varredura.oportunidades = parsed.oportunidades;
    varredura.alertas = parsed.alertas;
    varredura.erro = null;

    void gravarEstado({ atual: varredura, anterior: estadoAnterior.atual });
    return {
      ignorado: false,
      estado: { atual: varredura, anterior: estadoAnterior.atual },
      varredura,
    };
  } catch (e) {
    console.error("Observador de Mercado falhou:", e);
    return falha(e instanceof Error ? e.message : "Erro desconhecido na varredura.");
  }
}

/** Oportunidades novas/mudadas entre a varredura atual e a anterior. */
export function novidadesDaUltimaVarredura(estado: EstadoObservador): Set<string> {
  if (!estado.atual || !estado.anterior) return new Set();
  return isNovaOportunidade(estado.atual.oportunidades, estado.anterior.oportunidades);
}
