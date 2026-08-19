/**
 * Observador de Mercado — lógica pura (sem I/O).
 *
 * Seleção dos candidatos da varredura (mesmo score/sinal do radar), parsing
 * da resposta JSON do LLM e detecção de novidades entre varreduras. Tudo
 * testável sem banco nem rede.
 */
import { scoreOportunidade, sinalRadar, type SinalRadar } from "@/lib/radar-base";
import type { PosicaoHistorica } from "@/lib/radar.server";

export type CategoriaObservador = "acao" | "fii";

/** Linha genérica da grade (ação ou FII) que alimenta o observador. */
export interface LinhaObservador {
  ticker: string;
  nome: string;
  categoria: CategoriaObservador;
  setor: string | null;
  preco: number | null;
  variacaoDia: number | null;
  dy12: number | null;
  pvp: number | null;
}

export interface CandidatoObservador {
  ticker: string;
  nome: string;
  categoria: CategoriaObservador;
  setor: string | null;
  preco: number | null;
  variacaoDia: number | null;
  dy12: number | null;
  pvp: number | null;
  percentil: number | null;
  distMinima52sPct: number | null;
  drawdownMaximoPct: number | null;
  volatilidadeAnualPct: number | null;
  score: number | null;
  sinal: SinalRadar;
}

export const VEREDITOS = ["comprar", "manter", "vender", "observar"] as const;
export type VereditoObservador = (typeof VEREDITOS)[number];

export const CONVICCOES = ["alta", "media", "baixa"] as const;
export type ConviccaoObservador = (typeof CONVICCOES)[number];

export interface OportunidadeObservador {
  ticker: string;
  nome: string;
  categoria: CategoriaObservador;
  veredito: VereditoObservador;
  conviccao: ConviccaoObservador;
  motivo: string;
  gatilho: string;
}

export interface VarreduraObservador {
  executadaEm: string;
  provedor: string;
  modelo: string;
  duracaoMs: number;
  macro: { selic: number | null; ipca: number | null };
  totalCandidatos: number;
  resumo: string;
  oportunidades: OportunidadeObservador[];
  alertas: string[];
  erro: string | null;
}

/** Máximo de oportunidades que o observador pode listar por varredura. */
export const MAX_OPORTUNIDADES = 12;
/** Máximo de alertas por varredura. */
export const MAX_ALERTAS = 6;

/**
 * Monta os candidatos da varredura: cada linha da grade ganha posição,
 * sinal e score (mesma metodologia da página) e o resultado sai ordenado
 * pelo score, limitado a `top`. Linhas sem posição ficam fora (score null).
 */
export function montarCandidatos(
  linhas: LinhaObservador[],
  posicoes: Record<string, PosicaoHistorica>,
  noticiasImpacto: Record<string, string[]>,
  top = MAX_OPORTUNIDADES,
): CandidatoObservador[] {
  const candidatos: CandidatoObservador[] = [];
  for (const l of linhas) {
    const ticker = l.ticker.toUpperCase();
    const posicao = posicoes[ticker] ?? null;
    const noticiaImpacto = (noticiasImpacto[ticker] ?? []).length > 0;
    const sinal = sinalRadar({
      variacaoDia: l.variacaoDia,
      dy12: l.dy12,
      pvp: l.pvp,
      percentil: posicao?.percentil ?? null,
      noticiaImpacto,
    });
    const score = scoreOportunidade({
      percentil: posicao?.percentil ?? null,
      dy12: l.dy12,
      drawdownMaximoPct: posicao?.drawdownMaximoPct ?? null,
      noticiaImpacto,
    });
    if (score === null) continue;
    candidatos.push({
      ticker,
      nome: l.nome,
      categoria: l.categoria,
      setor: l.setor,
      preco: l.preco,
      variacaoDia: l.variacaoDia,
      dy12: l.dy12,
      pvp: l.pvp,
      percentil: posicao?.percentil ?? null,
      distMinima52sPct: posicao?.distMinima52sPct ?? null,
      drawdownMaximoPct: posicao?.drawdownMaximoPct ?? null,
      volatilidadeAnualPct: posicao?.volatilidadeAnualPct ?? null,
      score,
      sinal,
    });
  }
  return candidatos.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, Math.max(1, top));
}

/**
 * Extrai a resposta JSON do observador do texto bruto do LLM (tolera
 * markdown e texto ao redor), normaliza campos e aplica limites de tamanho.
 * Nunca lança: qualquer falha vira um objeto com `resumo` vazio.
 */
export function parseRespostaObservador(texto: string): {
  resumo: string;
  oportunidades: OportunidadeObservador[];
  alertas: string[];
} {
  const vazio = {
    resumo: "",
    oportunidades: [] as OportunidadeObservador[],
    alertas: [] as string[],
  };
  const bruto = String(texto ?? "").trim();
  if (!bruto) return vazio;

  const ini = bruto.indexOf("{");
  const fim = bruto.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return vazio;

  let parsed: unknown;
  try {
    parsed = JSON.parse(bruto.slice(ini, fim + 1));
  } catch {
    return vazio;
  }
  if (typeof parsed !== "object" || parsed === null) return vazio;
  const p = parsed as Record<string, unknown>;

  const oportunidades: OportunidadeObservador[] = [];
  if (Array.isArray(p.oportunidades)) {
    for (const raw of p.oportunidades.slice(0, MAX_OPORTUNIDADES)) {
      if (typeof raw !== "object" || raw === null) continue;
      const o = raw as Record<string, unknown>;
      const ticker = String(o.ticker ?? "")
        .trim()
        .toUpperCase()
        .slice(0, 12);
      if (!ticker) continue;
      const veredito = VEREDITOS.includes(String(o.veredito) as VereditoObservador)
        ? (String(o.veredito) as VereditoObservador)
        : "observar";
      const conviccao = CONVICCOES.includes(String(o.conviccao) as ConviccaoObservador)
        ? (String(o.conviccao) as ConviccaoObservador)
        : "media";
      oportunidades.push({
        ticker,
        nome: String(o.nome ?? "").slice(0, 80),
        categoria: o.categoria === "fii" ? "fii" : "acao",
        veredito,
        conviccao,
        motivo: String(o.motivo ?? "").slice(0, 240),
        gatilho: String(o.gatilho ?? "").slice(0, 240),
      });
    }
  }

  const alertas = Array.isArray(p.alertas)
    ? p.alertas
        .map((a) => String(a).slice(0, 200).trim())
        .filter(Boolean)
        .slice(0, MAX_ALERTAS)
    : [];

  return {
    resumo: String(p.resumo ?? "")
      .slice(0, 900)
      .trim(),
    oportunidades,
    alertas,
  };
}

/**
 * Oportunidades que surgiram (ou mudaram de veredito) desde a varredura
 * anterior — a "novidade" que o usuário quer ver de relance.
 */
export function isNovaOportunidade(
  atual: OportunidadeObservador[],
  anterior: OportunidadeObservador[],
): Set<string> {
  const novas = new Set<string>();
  for (const op of atual) {
    const estava = anterior.some((a) => a.ticker === op.ticker && a.veredito === op.veredito);
    if (!estava) novas.add(op.ticker);
  }
  return novas;
}
