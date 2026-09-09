/**
 * Auditoria real da carteira: lê os dados do usuário no banco, calcula os
 * números, pede a análise ao provedor de IA (Kilo Code por padrão) e grava o
 * resultado em `relatorios` para alimentar o painel de auditorias.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ALOCACAO_POR_PERFIL,
  analisarCarteiraDe,
  planoDeRebalanceamento,
  type AtivoLinha,
  type PerfilInvestidor,
} from "@/lib/auditoria";
import { planoPadrao, projetar, type ProjecaoInput } from "@/lib/portfolio";

/** Valor serializável para trafegar no RPC do servidor. */
export type ValorResumo =
  | string
  | number
  | boolean
  | null
  | ValorResumo[]
  | { [chave: string]: ValorResumo };

export type StatusAuditoria =
  | "concluida"
  | "parcial"
  | "falhou"
  | "pendente"
  | "em_andamento"
  | "cancelada";

export const STATUS_AUDITORIA = [
  "concluida",
  "parcial",
  "falhou",
  "pendente",
  "em_andamento",
  "cancelada",
] as const;

export interface AuditoriaRegistro {
  id: string;
  titulo: string;
  status: StatusAuditoria;
  perfil: string | null;
  score_diversificacao: number | null;
  patrimonio_total: number | null;
  analise_ia: string | null;
  provedor_ia: string | null;
  resposta: string | null;
  respondida_em: string | null;
  resumo: { [chave: string]: ValorResumo } | null;
  created_at: string;
}

type Linha = Record<string, unknown>;

type Resultado = Promise<{ data: Linha | null; error: { message: string } | null }>;

/** Shim tipado: a tabela `relatorios` tem colunas novas ainda ausentes no typegen. */
function tabelaRelatorios(supabase: unknown) {
  return supabase as unknown as {
    from: (t: string) => {
      insert: (v: Linha) => {
        select: (c: string) => { single: () => Resultado };
      };
      update: (v: Linha) => {
        eq: (
          col: string,
          val: string,
        ) => {
          eq: (
            col: string,
            val: string,
          ) => { select: (c: string) => { single: () => Resultado } };
        };
      };
      select: (c: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            limit: (n: number) => Promise<{ data: Linha[] | null; error: { message: string } | null }>;
          };
        };
      };
      delete: () => {
        eq: (
          col: string,
          val: string,
        ) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  };
}

function paraRegistro(l: Linha): AuditoriaRegistro {
  return {
    id: String(l["id"]),
    titulo: String(l["titulo"] ?? "Auditoria da carteira"),
    status: (String(l["status"] ?? "concluida") as StatusAuditoria) ?? "concluida",
    perfil: (l["perfil"] as string | null) ?? null,
    score_diversificacao:
      l["score_diversificacao"] == null ? null : Number(l["score_diversificacao"]),
    patrimonio_total: l["patrimonio_total"] == null ? null : Number(l["patrimonio_total"]),
    analise_ia: (l["analise_ia"] as string | null) ?? null,
    provedor_ia: (l["provedor_ia"] as string | null) ?? null,
    resposta: (l["resposta"] as string | null) ?? null,
    respondida_em: (l["respondida_em"] as string | null) ?? null,
    resumo: (l["resumo"] as { [chave: string]: ValorResumo } | null) ?? null,
    created_at: String(l["created_at"]),
  };
}


const SISTEMA_AUDITORIA = `Você é um analista CNPI brasileiro auditando a carteira de um investidor pessoa física.

Escreva SEMPRE em português do Brasil, usando os termos do mercado nacional (proventos, dividend yield, renda fixa pós-fixada, Tesouro Selic/IPCA+, FIIs, aporte mensal, rebalanceamento, patrimônio, Copom, CDI, IPCA). NUNCA responda em inglês nem misture idiomas.

Formato da resposta (texto puro, sem markdown, sem asteriscos):
1. Diagnóstico — 2 a 3 frases sobre a situação atual da carteira.
2. Concentração e diversificação — o que está desequilibrado, com percentuais reais.
3. Renda passiva — o que os proventos estimados representam hoje.
4. Plano de independência — se o aporte e a rentabilidade do plano sustentam a meta.
5. Metas — como estão frente ao patrimônio atual.
6. Próximos passos — 3 ações objetivas, na ordem de prioridade.

Regras: use apenas números que estejam nos dados enviados; valores em reais no formato R$ 1.234,56; sem recomendação formal de compra ou venda; máximo de 2000 caracteres.`;

export const solicitarAuditoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z
      .object({ perfil: z.enum(["conservador", "moderado", "agressivo"]).optional() })
      .parse(value ?? {}),
  )
  .handler(async ({ context, data }): Promise<AuditoriaRegistro> => {
    const { supabase, userId } = context;
    const perfil: PerfilInvestidor = data?.perfil ?? "moderado";

    const [{ data: ativos }, { data: plano }, { data: metas }, { data: aportes }, { data: divs }] =
      await Promise.all([
        supabase
          .from("ativos")
          .select("ticker, categoria, quantidade, preco_medio, preco_atual, dy"),
        supabase
          .from("plano_config")
          .select(
            "idade_atual, idade_aposentadoria, aporte_mensal, aumento_anual, rentabilidade_anual, inflacao_anual, taxa_retirada",
          )
          .maybeSingle(),
        supabase.from("metas").select("nome, alvo").order("ordem", { ascending: true }),
        supabase.from("aportes").select("data, ticker, quantidade, preco"),
        supabase.from("dividendos").select("data, valor"),
      ]);

    // Sincroniza com o card "Rentabilidade" do Dashboard: usa cotações ao
    // vivo (mesma fonte do useAtivosAoVivo) em vez do preco_atual salvo.
    const { buscarCotacao } = await import("@/lib/market.server");
    const cotacoes = await Promise.all(
      (ativos ?? []).map(async (a) => {
        try {
          const c = await buscarCotacao(a.ticker);
          return { ticker: a.ticker, preco: c.preco != null && c.preco > 0 ? c.preco : null };
        } catch {
          return { ticker: a.ticker, preco: null };
        }
      }),
    );
    const precoAoVivo = new Map(cotacoes.map((c) => [c.ticker, c.preco]));

    const linhas: AtivoLinha[] = (ativos ?? []).map((a) => ({
      ticker: a.ticker,
      categoria: a.categoria,
      quantidade: Number(a.quantidade),
      preco_medio: Number(a.preco_medio),
      preco_atual: precoAoVivo.get(a.ticker) ?? Number(a.preco_atual),
      dy: Number(a.dy),
    }));

    const auditoria = analisarCarteiraDe(linhas);
    const rebalanceamento = planoDeRebalanceamento(linhas, ALOCACAO_POR_PERFIL[perfil]);

    const planoConfig: ProjecaoInput = {
      idadeAtual: Number(plano?.idade_atual) || planoPadrao.idadeAtual,
      idadeAposentadoria: Number(plano?.idade_aposentadoria) || planoPadrao.idadeAposentadoria,
      aporteMensal: Number(plano?.aporte_mensal) || planoPadrao.aporteMensal,
      aumentoAnual: Number(plano?.aumento_anual) || planoPadrao.aumentoAnual,
      rentabilidadeAnual: Number(plano?.rentabilidade_anual) || planoPadrao.rentabilidadeAnual,
      inflacaoAnual: Number(plano?.inflacao_anual) || planoPadrao.inflacaoAnual,
      taxaRetirada: Number(plano?.taxa_retirada) || planoPadrao.taxaRetirada,
      patrimonioAtual: Math.round(auditoria.patrimonio_total),
    };
    const projecao = projetar(planoConfig);
    const final = projecao[projecao.length - 1];

    const totalAportado = (aportes ?? []).reduce(
      (s, a) => s + Number(a.quantidade) * Number(a.preco),
      0,
    );
    const totalProventos = (divs ?? []).reduce((s, d) => s + Number(d.valor), 0);

    const metasLinhas = (metas ?? []).map((m) => ({
      nome: m.nome,
      alvo: Number(m.alvo),
      progresso_pct:
        Number(m.alvo) > 0
          ? Math.round((auditoria.patrimonio_total / Number(m.alvo)) * 1000) / 10
          : 0,
    }));

    const resumo: { [chave: string]: ValorResumo } = {
      perfil,
      patrimonio_total: Math.round(auditoria.patrimonio_total),
      total_investido: Math.round(auditoria.total_investido),
      // Mesma fórmula do card "Lucro total" do Dashboard: ganho de capital + proventos recebidos.
      lucro_total: Math.round(auditoria.lucro_total + totalProventos),
      ganho_capital: Math.round(auditoria.lucro_total),
      proventos_acumulados: Math.round(totalProventos),
      rentabilidade_pct: auditoria.rentabilidade_pct,
      dy_carteira_pct: auditoria.dy_carteira_pct,
      proventos_estimados_12m: Math.round(auditoria.dividendos_estimados_12m),
      numero_ativos: auditoria.numero_ativos,
      selo: auditoria.selo,
      concentracao: { ...auditoria.concentracao },
      alocacao_por_classe: auditoria.alocacao_por_classe.map((c) => ({ ...c })),
      rebalanceamento: rebalanceamento.por_classe.map((r) => ({
        classe: r.classe,
        pct_atual: r.pct_atual,
        pct_alvo: r.pct_alvo,
        status: r.status,
        diferenca: Math.round(r.diferenca),
      })),
      plano: { ...planoConfig },
      projecao_final: {
        idade: final?.idade ?? planoConfig.idadeAposentadoria,
        patrimonio: Math.round(final?.patrimonio ?? 0),
        renda_passiva_mensal: Math.round(final?.rendaPassivaMensal ?? 0),
      },
      metas: metasLinhas,
      aportes: { total: Math.round(totalAportado), lancamentos: (aportes ?? []).length },
      proventos_recebidos: Math.round(totalProventos),
      pontos_fortes: auditoria.pontos_fortes,
      pontos_fracos: auditoria.pontos_fracos,
    };

    let analise: string | null = null;
    let provedor: string | null = null;
    let status: AuditoriaRegistro["status"] = "parcial";
    try {
      const { gerarTextoIA } = await import("@/lib/ia-texto.server");
      const r = await gerarTextoIA({
        sistema: SISTEMA_AUDITORIA,
        prompt: `Dados reais da carteira e do plano (JSON):\n${JSON.stringify(resumo)}`,
        maxTokens: 9000,
      });
      analise = r.texto;
      provedor = r.provedor;
      status = "concluida";
    } catch (e) {
      analise = null;
      provedor = null;
      status = "parcial";
      console.error("[auditoria] IA indisponível:", e instanceof Error ? e.message : String(e));
    }

    const db = tabelaRelatorios(supabase);
    const { data: inserido, error } = await db
      .from("relatorios")
      .insert({
        user_id: userId,
        tipo: "auditoria",
        titulo: `Auditoria da carteira · ${new Date().toLocaleDateString("pt-BR")}`,
        perfil,
        status,
        analise_ia: analise,
        provedor_ia: provedor,
        score_diversificacao: auditoria.score_diversificacao,
        patrimonio_total: Math.round(auditoria.patrimonio_total),
        resumo,
      })
      .select("*")
      .single();

    if (error || !inserido) throw new Error(error?.message ?? "Falha ao salvar a auditoria.");
    return paraRegistro(inserido);
  });

export const listarAuditorias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditoriaRegistro[]> => {
    const db = tabelaRelatorios(context.supabase);
    const { data, error } = await db
      .from("relatorios")
      .select("*")
      .eq("tipo", "auditoria")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map(paraRegistro);
  });

export const excluirAuditoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ context, data }) => {
    const db = tabelaRelatorios(context.supabase);
    const { error } = await db
      .from("relatorios")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Grava a resposta escrita pelo usuário e conclui a auditoria. */
export const responderAuditoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z.object({ id: z.string().uuid(), resposta: z.string().trim().min(1).max(4000) }).parse(value),
  )
  .handler(async ({ context, data }): Promise<AuditoriaRegistro> => {
    const db = tabelaRelatorios(context.supabase);
    const { data: linha, error } = await db
      .from("relatorios")
      .update({
        resposta: data.resposta,
        respondida_em: new Date().toISOString(),
        status: "concluida",
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error || !linha) throw new Error(error?.message ?? "Auditoria não encontrada.");
    return paraRegistro(linha);
  });

/** Reabre, cancela ou marca a auditoria como pendente/em andamento. */
export const atualizarStatusAuditoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pendente", "em_andamento", "cancelada", "concluida"]),
      })
      .parse(value),
  )
  .handler(async ({ context, data }): Promise<AuditoriaRegistro> => {
    const db = tabelaRelatorios(context.supabase);
    const { data: linha, error } = await db
      .from("relatorios")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error || !linha) throw new Error(error?.message ?? "Auditoria não encontrada.");
    return paraRegistro(linha);
  });
