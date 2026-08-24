/**
 * Carteira Pública Compartilhável — cria e lê snapshots públicos da carteira.
 *
 * O usuário cria um link público com um token único. O snapshot contém os
 * ativos (opcionalmente com valores) e metadados (DY, total, renda estimada).
 * A rota pública /compartilhada/[token] renderiza o snapshot sem login.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Ativo, Dividendo } from "@/lib/portfolio";
import { resumoCarteira } from "@/lib/portfolio";

export interface AtivoSnapshot {
  ticker: string;
  categoria: string;
  quantidade: number;
  precoAtual: number | null;
  valor: number | null;
  dy: number | null;
}

export interface CarteiraCompartilhada {
  id: string;
  token: string;
  nome: string;
  ativos: AtivoSnapshot[];
  totalPatrimonio: number;
  dividendYield: number | null;
  rendaMensalEstimada: number | null;
  incluirValores: boolean;
  criadoEm: string;
  expiraEm: string | null;
}

/**
 * Cria um snapshot público da carteira do usuário logado.
 * Retorna o token único para compartilhamento.
 */
export async function criarCarteiraCompartilhada(opts: {
  nome?: string;
  incluirValores?: boolean;
  expirarEmDias?: number;
  ativos: Ativo[];
  dividendos: Dividendo[];
}): Promise<{ ok: true; token: string; url: string } | { ok: false; erro: string }> {
  try {
    const { data: sessao } = await supabase.auth.getSession();
    const userId = sessao.session?.user?.id;
    if (!userId) return { ok: false, erro: "Faça login para compartilhar sua carteira." };

    const { ativos, dividendos, nome, incluirValores, expirarEmDias } = opts;
    const resumo = resumoCarteira(ativos);
    const dividendos12m = dividendos
      .filter((d) => new Date(d.data) >= new Date(Date.now() - 366 * 86_400_000))
      .reduce((s, d) => s + Number(d.valor), 0);
    const rendaMensal = dividendos12m / 12;
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const expiraEm = expirarEmDias
      ? new Date(Date.now() + expirarEmDias * 86_400_000).toISOString()
      : null;

    const ativosSnapshot = ativos
      .filter((a) => Number(a.quantidade) > 0)
      .map((a) => ({
        ticker: a.ticker,
        categoria: a.categoria,
        quantidade: Number(a.quantidade),
        precoAtual: incluirValores ? Number(a.precoAtual) : null,
        valor: incluirValores ? Number(a.quantidade) * Number(a.precoAtual) : null,
        dy: incluirValores ? Number(a.dy) : null,
      }));

    const { error } = await supabase.from("carteiras_compartilhadas").insert({
      user_id: userId,
      token,
      nome: nome?.trim() || "Minha carteira",
      ativos: ativosSnapshot,
      total_patrimonio: incluirValores ? resumo.totalAtual : 0,
      dividend_yield: incluirValores ? resumo.dyCarteira : null,
      renda_mensal_estimada: incluirValores ? Math.round(rendaMensal * 100) / 100 : null,
      incluir_valores: incluirValores ?? true,
      expira_em: expiraEm,
    });

    if (error) return { ok: false, erro: error.message };

    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://viverderendaem15anos.lovable.app";
    return {
      ok: true,
      token,
      url: `${baseUrl}/compartilhada/${token}`,
    };
  } catch (error) {
    return { ok: false, erro: error instanceof Error ? error.message : "Erro inesperado" };
  }
}

/**
 * Lista as carteiras compartilhadas do usuário.
 */
export async function listarCarteirasCompartilhadas() {
  const { data: sessao } = await supabase.auth.getSession();
  const userId = sessao.session?.user?.id;
  if (!userId) return [];
  const { data } = await supabase
    .from("carteiras_compartilhadas")
    .select("id, token, nome, criado_em, expira_em, total_patrimonio, incluir_valores")
    .eq("user_id", userId)
    .order("criado_em", { ascending: false });
  return (data ?? []) as unknown as {
    id: string;
    token: string;
    nome: string;
    criado_em: string;
    expira_em: string | null;
    total_patrimonio: number;
    incluir_valores: boolean;
  }[];
}

/**
 * Exclui uma carteira compartilhada (desativa o link).
 */
export async function excluirCarteiraCompartilhada(id: string) {
  const { data: sessao } = await supabase.auth.getSession();
  const userId = sessao.session?.user?.id;
  if (!userId) return { ok: false, erro: "Não autenticado" };
  const { error } = await supabase
    .from("carteiras_compartilhadas")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

/**
 * Linha tipada da tabela nova `carteiras_compartilhadas` — remova quando o
 * typegen do Supabase incluir a tabela.
 */
interface LinhaCarteiraCompartilhada {
  id: string;
  token: string;
  nome: string;
  ativos: AtivoSnapshot[];
  total_patrimonio: number;
  dividend_yield: number | null;
  renda_mensal_estimada: number | null;
  incluir_valores: boolean;
  criado_em: string;
  expira_em: string | null;
}

/**
 * Lê uma carteira compartilhada pelo token (rota pública, sem auth).
 * Usa supabaseAdmin para contornar RLS.
 */
export async function lerCarteiraPorToken(token: string): Promise<CarteiraCompartilhada | null> {
  if (!token || token.length < 6) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("carteiras_compartilhadas")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    const linha = data as unknown as LinhaCarteiraCompartilhada | null;

    if (!linha) return null;

    // Verifica expiração
    if (linha.expira_em && new Date(linha.expira_em) < new Date()) return null;

    return {
      id: linha.id,
      token: linha.token,
      nome: linha.nome,
      ativos: Array.isArray(linha.ativos) ? linha.ativos : [],
      totalPatrimonio: Number(linha.total_patrimonio),
      dividendYield: linha.dividend_yield != null ? Number(linha.dividend_yield) : null,
      rendaMensalEstimada:
        linha.renda_mensal_estimada != null ? Number(linha.renda_mensal_estimada) : null,
      incluirValores: linha.incluir_valores,
      criadoEm: linha.criado_em,
      expiraEm: linha.expira_em,
    };
  } catch {
    return null;
  }
}
