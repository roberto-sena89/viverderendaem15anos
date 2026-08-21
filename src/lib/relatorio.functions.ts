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

export interface LinhaMetaRelatorio {
  nome: string;
  alvo: number;
  progresso_pct: number;
  falta: number;
  atingida: boolean;
}

export interface DadosRelatorioAuditoria {
  gerado_em: string;
  perfil: PerfilInvestidor;
  auditoria: ReturnType<typeof analisarCarteiraDe>;
  rebalanceamento: ReturnType<typeof planoDeRebalanceamento>;
  plano_utilizado: ProjecaoInput;
  projecao: {
    patrimonio_projetado: number;
    patrimonio_projetado_real: number;
    renda_passiva_mensal_projetada: number;
    total_aportado_projetado: number;
    primeiro_milhao_em: number | null;
    projecao_ano_a_ano: {
      ano: number;
      idade: number;
      patrimonio: number;
      renda_passiva_mensal: number;
    }[];
  };
  metas: LinhaMetaRelatorio[];
  aportes: {
    total_aportado: number;
    numero_aportes: number;
    media_mensal: number;
    ultimos: { data: string; ticker: string; valor: number }[];
  };
  dividendos: {
    total_recebido: number;
    media_mensal: number;
    yield_on_cost_pct: number;
    ultimos: { data: string; ticker: string; valor: number }[];
  };
  resumo_ativos: {
    ticker: string;
    categoria: string;
    quantidade: number;
    preco_medio: number;
    preco_atual: number;
    valor_atual: number;
    pct: number;
    dy: number;
  }[];
}

export const gerarRelatorioAuditoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => {
    const schema = z.object({
      perfil: z.enum(["conservador", "moderado", "agressivo"]).optional(),
    });
    return schema.parse(value);
  })
  .handler(async ({ context, data }): Promise<DadosRelatorioAuditoria> => {
    const { supabase, userId } = context;
    const perfil = data?.perfil ?? "moderado";
    const perfilValido: PerfilInvestidor =
      perfil === "conservador" || perfil === "agressivo" ? perfil : "moderado";

    const [
      { data: ativos },
      { data: aportes },
      { data: dividendos },
      { data: plano },
      { data: metas },
    ] = await Promise.all([
      supabase.from("ativos").select("ticker, categoria, quantidade, preco_medio, preco_atual, dy"),
      supabase
        .from("aportes")
        .select("data, ticker, quantidade, preco")
        .order("data", { ascending: true }),
      supabase.from("dividendos").select("data, ticker, valor").order("data", { ascending: true }),
      supabase
        .from("plano_config")
        .select(
          "idade_atual, idade_aposentadoria, aporte_mensal, aumento_anual, rentabilidade_anual, inflacao_anual, taxa_retirada",
        )
        .maybeSingle(),
      supabase.from("metas").select("nome, alvo, ordem").order("ordem", { ascending: true }),
    ]);

    const ativosLinha: AtivoLinha[] = (ativos ?? []).map((a) => ({
      ticker: a.ticker,
      categoria: a.categoria,
      quantidade: Number(a.quantidade),
      preco_medio: Number(a.preco_medio),
      preco_atual: Number(a.preco_atual),
      dy: Number(a.dy),
    }));

    const totalAtual = ativosLinha.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
    const totalInvestido = ativosLinha.reduce((s, a) => s + a.quantidade * a.preco_medio, 0);

    const planoConfig: ProjecaoInput = {
      idadeAtual: Number(plano?.idade_atual) || planoPadrao.idadeAtual,
      idadeAposentadoria: Number(plano?.idade_aposentadoria) || planoPadrao.idadeAposentadoria,
      aporteMensal: Number(plano?.aporte_mensal) || planoPadrao.aporteMensal,
      aumentoAnual: Number(plano?.aumento_anual) || planoPadrao.aumentoAnual,
      rentabilidadeAnual: Number(plano?.rentabilidade_anual) || planoPadrao.rentabilidadeAnual,
      inflacaoAnual: Number(plano?.inflacao_anual) || planoPadrao.inflacaoAnual,
      taxaRetirada: Number(plano?.taxa_retirada) || planoPadrao.taxaRetirada,
      patrimonioAtual: Math.round(totalAtual),
    };

    const linhas = projetar(planoConfig);
    const final = linhas[linhas.length - 1];

    const linhasAportes = (aportes ?? []).map((a) => ({
      data: a.data,
      ticker: a.ticker,
      valor: Number(a.quantidade) * Number(a.preco),
    }));
    const totalAportado = linhasAportes.reduce((s, l) => s + l.valor, 0);
    const mesesAporte = new Set(linhasAportes.map((l) => l.data.slice(0, 7)));

    const linhasDividendos = (dividendos ?? []).map((d) => ({
      data: d.data,
      ticker: d.ticker,
      valor: Number(d.valor),
    }));
    const totalRecebido = linhasDividendos.reduce((s, l) => s + l.valor, 0);
    const mesesDividendo = new Set(linhasDividendos.map((l) => l.data.slice(0, 7)));
    const ultimos12 = linhasDividendos
      .filter(
        (l) =>
          l.data >=
          new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10),
      )
      .reduce((s, l) => s + l.valor, 0);

    const metasRelatorio: LinhaMetaRelatorio[] = (metas ?? []).map((m) => {
      const pct = m.alvo > 0 ? (totalAtual / m.alvo) * 100 : 0;
      return {
        nome: m.nome,
        alvo: m.alvo,
        progresso_pct: Math.round(pct * 100) / 100,
        falta: Math.round(Math.max(0, m.alvo - totalAtual)),
        atingida: totalAtual >= m.alvo,
      };
    });

    const ordenados = [...ativosLinha].sort(
      (x, y) => y.quantidade * y.preco_atual - x.quantidade * x.preco_atual,
    );

    const auditoria = analisarCarteiraDe(ativosLinha);
    const rebalanceamento = planoDeRebalanceamento(ativosLinha, ALOCACAO_POR_PERFIL[perfilValido]);

    const resposta: DadosRelatorioAuditoria = {
      gerado_em: new Date().toISOString(),
      perfil: perfilValido,
      auditoria,
      rebalanceamento,
      plano_utilizado: planoConfig,
      projecao: {
        patrimonio_projetado: Math.round(final.patrimonio),
        patrimonio_projetado_real: Math.round(final.patrimonioReal),
        renda_passiva_mensal_projetada: Math.round(final.rendaPassivaMensal),
        total_aportado_projetado: Math.round(final.aportado),
        primeiro_milhao_em: linhas.find((l) => l.patrimonio >= 1_000_000)?.ano ?? null,
        projecao_ano_a_ano: linhas.map((l) => ({
          ano: l.ano,
          idade: l.idade,
          patrimonio: Math.round(l.patrimonio),
          renda_passiva_mensal: Math.round(l.rendaPassivaMensal),
        })),
      },
      metas: metasRelatorio,
      aportes: {
        total_aportado: Math.round(totalAportado),
        numero_aportes: linhasAportes.length,
        media_mensal: mesesAporte.size ? Math.round(totalAportado / mesesAporte.size) : 0,
        ultimos: linhasAportes.slice(-10).reverse(),
      },
      dividendos: {
        total_recebido: Math.round(totalRecebido),
        media_mensal: mesesDividendo.size ? Math.round(totalRecebido / mesesDividendo.size) : 0,
        yield_on_cost_pct:
          Math.round((totalInvestido > 0 ? (ultimos12 / totalInvestido) * 100 : 0) * 100) / 100,
        ultimos: linhasDividendos.slice(-10).reverse(),
      },
      resumo_ativos: ordenados.map((a) => ({
        ticker: a.ticker,
        categoria: a.categoria,
        quantidade: a.quantidade,
        preco_medio: a.preco_medio,
        preco_atual: a.preco_atual,
        valor_atual: Math.round(a.quantidade * a.preco_atual),
        pct:
          totalAtual > 0
            ? Math.round(((a.quantidade * a.preco_atual) / totalAtual) * 10000) / 100
            : 0,
        dy: a.dy,
      })),
    };

    // Persiste o histórico do relatório (função PRO/PREMIUM).
    const { error: erroRelatorio } = await supabase.from("relatorios").insert({
      user_id: userId,
      tipo: "auditoria",
      titulo: `Auditoria da carteira · ${new Date().toLocaleDateString("pt-BR")}`,
      perfil: perfilValido,
      score_diversificacao: auditoria.score_diversificacao,
      patrimonio_total: auditoria.patrimonio_total,
      resumo: {
        selo: auditoria.selo,
        rentabilidade_pct: auditoria.rentabilidade_pct,
        dy_carteira_pct: auditoria.dy_carteira_pct,
        numero_ativos: auditoria.numero_ativos,
        total_investido: auditoria.total_investido,
        dividendos_estimados_12m: auditoria.dividendos_estimados_12m,
      },
    });
    if (erroRelatorio) console.error("Falha ao salvar relatório:", erroRelatorio.message);

    return resposta;
  });
