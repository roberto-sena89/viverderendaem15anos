import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import {
  alocacaoIdeal,
  brl,
  classeDoAtivo,
  CLASSE_POS_FIXADO,
  planoPadrao,
  projetar,
  resumoCarteira,
  type ProjecaoInput,
} from "@/lib/portfolio";
import { agregarNoticias } from "@/lib/noticias.server";
import type { Database } from "@/integrations/supabase/types";

type PerfilInvestidor = "conservador" | "moderado" | "agressivo";

/** Alocação estratégica recomendada para cada perfil de investidor. */
const ALOCACAO_POR_PERFIL: Record<PerfilInvestidor, Record<string, number>> = {
  conservador: {
    [CLASSE_POS_FIXADO]: 70,
    "ETFs - Brasil": 12,
    "ETFs - Global": 12,
    FIIs: 6,
  },
  moderado: {
    [CLASSE_POS_FIXADO]: 50,
    "ETFs - Brasil": 20,
    "ETFs - Global": 20,
    FIIs: 10,
  },
  agressivo: {
    [CLASSE_POS_FIXADO]: 30,
    "ETFs - Brasil": 30,
    "ETFs - Global": 25,
    FIIs: 10,
    Ações: 5,
  },
};

interface AtivoLinha {
  ticker: string;
  categoria: string;
  quantidade: number;
  preco_medio: number;
  preco_atual: number;
  dy: number;
}

interface PlanoLinha {
  idade_atual?: number | null;
  idade_aposentadoria?: number | null;
  aporte_mensal?: number | null;
  aumento_anual?: number | null;
  rentabilidade_anual?: number | null;
  inflacao_anual?: number | null;
  taxa_retirada?: number | null;
}

const SISTEMA = `Você é o "Técnico IA", consultor PRO da plataforma Investidor em 15 Anos — um serviço premium de assessoria financeira educativa.

Sua missão: guiar o usuário em toda a jornada de investimento — diagnóstico da carteira, aportes, dividendos, rebalanceamento, metas e independência financeira — com análises profundas, números reais e planos de ação concretos.

Ferramentas de mercado (use sempre que a pergunta envolver preços, desempenho, comparações ou juros):
- cotacao: preço em tempo quase real de uma ação, FII, ETF ou índice.
- historico: série histórica de até 10 anos, com retorno total, retorno anualizado, drawdown máximo, volatilidade e desempenho ano a ano.
- procurarAtivo: descobre o código correto quando o usuário cita o nome da empresa/fundo.
- indicadorEconomico: séries do Banco Central (Selic, CDI, IPCA, IGP-M, dólar, poupança).
- projecaoJuros: projeções do Boletim Focus para os próximos anos (Selic, IPCA, PIB, câmbio).
- compararAtivos: compara dois ou mais ativos lado a lado (retorno anualizado, drawdown, volatilidade). Prefira esta ferramenta a chamar historico várias vezes.
- noticiasMercado: últimas notícias financeiras (InfoMoney, Money Times, Investing Brasil).
- agendaEconomica: próximos eventos (Copom, FOMC, IPCA, payroll, balanços).

Ferramentas de análise da carteira:
- analisarCarteira: auditoria completa da carteira (saúde, concentração, diversificação, risco, pontos fortes e fracos). Use em perguntas do tipo "analise minha carteira", "como está minha diversificação", "qual o risco da minha carteira".
- projetarIndependencia: projeta patrimônio ano a ano, renda passiva e data da independência financeira usando o plano salvo + patrimônio real. Simula aportes/rentabilidade alternativos.
- projetarRendaPassiva: projeta a evolução dos dividendos/renda passiva da carteira nos próximos anos.
- sugerirRebalanceamento: compara a alocação atual com a estratégia ideal e indica quanto aportar/vender em cada classe.
- avaliarMetas: mostra o progresso das metas financeiras do usuário (reserva, primeiro milhão etc.).
- alocacaoRecomendada: devolve a alocação estratégica ideal para o perfil do usuário.
- sugerirAtivos: lista ativos da B3 (ações, FIIs, BDRs) por dividend yield, valor de mercado ou receita.

Regras com dados de mercado:
- Nunca invente cotações, retornos, projeções ou notícias — chame a ferramenta correspondente.
- Cite a data/período dos dados e a fonte quando apresentar números de mercado.
- Se um código não existir, use procurarAtivo antes de responder.

Regras de projeção e análise:
- Use analisarCarteira antes de emitir diagnóstico sobre diversificação, risco ou concentração.
- Use projetarIndependencia para qualquer pergunta sobre aposentadoria, independência financeira ou renda passiva. Não calcule manualmente.
- Para "quanto devo aportar", projete o cenário atual e simule aportes maiores para mostrar a antecipação da meta.
- Explique a regra dos 4% (taxa de retirada) quando falar de renda passiva.
- Ao sugerir rebalanceamento, use sugerirRebalanceamento e alocacaoRecomendada (perfil do usuário) em conjunto.

Como responder (estilo PRO):
- Estruture respostas como um consultor: Diagnóstico → Números → Plano de ação (3-5 passos concretos) → Cuidados.
- Use markdown (títulos curtos, listas, tabelas, negrito em números) e monte tabelas para comparativos.
- Traga contexto educacional breve quando ajudar, sem encher.
- Nunca prometa rentabilidade. Deixe claro que são análises educativas, não recomendação personalizada regulada pela CVM.
- Se a carteira estiver vazia, ajude a montar a estratégia inicial e oriente a registrar os primeiros aportes.

Perfil do investidor do usuário: "{PERFIL}"`;

function textoDaCarteira(
  ativos: {
    ticker: string;
    categoria: string;
    quantidade: number;
    preco_medio: number;
    preco_atual: number;
    dy: number;
  }[],
  aportes: { data: string; ticker: string; quantidade: number; preco: number }[],
  dividendos: { data: string; ticker: string; valor: number }[],
) {
  if (ativos.length === 0 && aportes.length === 0) {
    return "O usuário ainda não cadastrou ativos nem aportes na plataforma.";
  }

  const linhas = ativos.map((a) => {
    const atual = a.quantidade * a.preco_atual;
    const investido = a.quantidade * a.preco_medio;
    const rent = investido > 0 ? ((atual - investido) / investido) * 100 : 0;
    return `- ${a.ticker} (${a.categoria}): ${a.quantidade} cotas, PM R$ ${a.preco_medio.toFixed(2)}, preço atual R$ ${a.preco_atual.toFixed(2)}, valor R$ ${atual.toFixed(2)}, rentabilidade ${rent.toFixed(1)}%, DY ${a.dy}%`;
  });

  const totalAtual = ativos.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const totalInvestido = ativos.reduce((s, a) => s + a.quantidade * a.preco_medio, 0);
  const proventos = dividendos.reduce((s, d) => s + d.valor, 0);

  const porClasse = new Map<string, number>();
  for (const a of ativos) {
    const classe = classeDoAtivo({
      id: "",
      ticker: a.ticker,
      nome: a.ticker,
      categoria: a.categoria as never,
      quantidade: a.quantidade,
      precoMedio: a.preco_medio,
      precoAtual: a.preco_atual,
      dy: a.dy,
    });
    porClasse.set(classe, (porClasse.get(classe) ?? 0) + a.quantidade * a.preco_atual);
  }
  const alocacao = [...porClasse.entries()]
    .sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0))
    .map(([classe, valor]) => {
      const pct = totalAtual > 0 ? (valor / totalAtual) * 100 : 0;
      return `${classe}: ${pct.toFixed(1)}% (${brl(valor)})`;
    })
    .join(" | ");

  const dividendosEstimados = ativos.reduce(
    (s, a) => s + (a.quantidade * a.preco_atual * a.dy) / 100,
    0,
  );
  const dyCarteira = totalAtual > 0 ? (dividendosEstimados / totalAtual) * 100 : 0;

  return [
    `Patrimônio atual: ${brl(totalAtual)} | Total investido: ${brl(totalInvestido)}`,
    `Rentabilidade geral: ${totalInvestido > 0 ? (((totalAtual - totalInvestido) / totalInvestido) * 100).toFixed(2) : 0}%`,
    `Proventos registrados (últimos lançamentos): ${brl(proventos)} | DY estimado da carteira: ${dyCarteira.toFixed(2)}%`,
    `Alocação por classe: ${alocacao}`,
    "Ativos:",
    ...linhas,
    aportes.length
      ? `Últimos aportes: ${aportes
          .slice(0, 10)
          .map((a) => `${a.data} ${a.ticker} ${a.quantidade}x R$ ${a.preco.toFixed(2)}`)
          .join("; ")}`
      : "Nenhum aporte registrado.",
  ].join("\n");
}

function textoDaMensagem(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

const ARRED = (v: number) => Math.round(v * 100) / 100;

function ativosParaModelo(linhas: AtivoLinha[]): Parameters<typeof resumoCarteira>[0] {
  return linhas.map((a) => ({
    id: a.ticker,
    ticker: a.ticker,
    nome: a.ticker,
    categoria: a.categoria as never,
    quantidade: a.quantidade,
    precoMedio: a.preco_medio,
    precoAtual: a.preco_atual,
    dy: a.dy,
  }));
}

function alocacaoAtualPorClasse(
  ativos: AtivoLinha[],
): { classe: string; valor: number; pct: number }[] {
  const total = ativos.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const mapa = new Map<string, number>();
  for (const a of ativos) {
    const classe = classeDoAtivo({
      id: "",
      ticker: a.ticker,
      nome: a.ticker,
      categoria: a.categoria as never,
      quantidade: a.quantidade,
      precoMedio: a.preco_medio,
      precoAtual: a.preco_atual,
      dy: a.dy,
    });
    mapa.set(classe, (mapa.get(classe) ?? 0) + a.quantidade * a.preco_atual);
  }
  return [...mapa.entries()]
    .map(([classe, valor]) => ({
      classe,
      valor,
      pct: total > 0 ? (valor / total) * 100 : 0,
    }))
    .sort((x, y) => y.valor - x.valor);
}

function analisarCarteiraDe(ativos: AtivoLinha[]) {
  const total = ativos.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const investido = ativos.reduce((s, a) => s + a.quantidade * a.preco_medio, 0);
  const dividendos = ativos.reduce((s, a) => s + (a.quantidade * a.preco_atual * a.dy) / 100, 0);
  const dy = total > 0 ? (dividendos / total) * 100 : 0;
  const classes = alocacaoAtualPorClasse(ativos);

  const ordenados = [...ativos].sort(
    (x, y) => y.quantidade * y.preco_atual - x.quantidade * x.preco_atual,
  );
  const top1 = ordenados[0];
  const top1Valor = top1 ? top1.quantidade * top1.preco_atual : 0;
  const top3Valor = ordenados.slice(0, 3).reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const top5Valor = ordenados.slice(0, 5).reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const top1Pct = total > 0 ? (top1Valor / total) * 100 : 0;
  const top3Pct = total > 0 ? (top3Valor / total) * 100 : 0;
  const top5Pct = total > 0 ? (top5Valor / total) * 100 : 0;

  const concentracao = classes.length === 0 ? 0 : Math.max(...classes.map((c) => c.pct));
  const temRendaFixa = classes.some((c) => c.classe === CLASSE_POS_FIXADO);
  const temEquities = classes.some((c) =>
    ["Ações", "ETFs - Brasil", "ETFs - Global", "BDRs", "Stocks"].includes(c.classe),
  );
  const temFiis = classes.some((c) => c.classe === "FIIs");

  const pontosFracos: string[] = [];
  const pontosFortes: string[] = [];

  if (ativos.length === 0) {
    pontosFracos.push("Carteira vazia: comece definindo o perfil e faça o primeiro aporte.");
  }
  if (top1Pct > 50)
    pontosFracos.push(
      `Concentração alta no topo: ${top1?.ticker} sozinho pesa ${top1Pct.toFixed(0)}% do patrimônio.`,
    );
  else if (top1Pct > 30)
    pontosFracos.push(
      `Concentração relevante: ${top1?.ticker} responde por ${top1Pct.toFixed(0)}% da carteira.`,
    );
  else if (top1Pct > 0 && top1Pct <= 30)
    pontosFortes.push(
      `Boa distribuição: nenhum ativo passa de ${top1Pct.toFixed(0)}% da carteira.`,
    );
  if (ativos.length > 0 && ativos.length < 5)
    pontosFracos.push(`Poucos ativos (${ativos.length}): risco individual ainda alto.`);
  else if (ativos.length >= 10)
    pontosFortes.push(`Carteira com ${ativos.length} ativos: boa capilaridade de posições.`);
  if (!temRendaFixa && ativos.length > 0)
    pontosFracos.push(
      "Sem reserva/renda fixa: carteira fica exposta a quedas sem colchão de segurança.",
    );
  if (!temEquities && ativos.length > 0)
    pontosFracos.push("Sem exposição a ações/ETFs: baixo potencial de crescimento de longo prazo.");
  if (!temFiis && ativos.length > 0)
    pontosFracos.push("Sem FIIs: faltam ativos geradores de renda recorrente (dividendos).");
  if (temEquities && temRendaFixa && ativos.length > 0)
    pontosFortes.push("Mix equilibrado entre renda fixa e renda variável.");
  if (dy >= 6)
    pontosFortes.push(`DY elevado (${dy.toFixed(1)}% a.a.): boa geração de renda passiva.`);
  else if (dy > 0 && dy < 2 && ativos.length > 0)
    pontosFracos.push(`DY baixo (${dy.toFixed(1)}%): renda passiva ainda tímida.`);
  if (top3Pct < 60 && ativos.length >= 5)
    pontosFortes.push("Os 3 maiores ativos somam menos de 60%: concentração sob controle.");
  if (concentracao > 70)
    pontosFracos.push(
      `A classe dominante concentra ${concentracao.toFixed(0)}%: rebalancear para a estratégia-alvo reduz risco.`,
    );

  const score = Math.max(
    0,
    Math.min(
      100,
      (ativos.length >= 10 ? 25 : ativos.length >= 5 ? 18 : ativos.length >= 3 ? 12 : 4) +
        (top1Pct <= 15 ? 25 : top1Pct <= 30 ? 18 : top1Pct <= 50 ? 8 : 2) +
        (temRendaFixa ? 15 : 0) +
        (temEquities ? 15 : 0) +
        (temFiis ? 10 : 0) +
        (dy >= 4 ? 10 : dy >= 2 ? 5 : 0),
    ),
  );

  return {
    patrimonio_total: Math.round(total),
    total_investido: Math.round(investido),
    lucro_total: Math.round(total - investido),
    rentabilidade_pct: ARRED(investido > 0 ? ((total - investido) / investido) * 100 : 0),
    dividendos_estimados_12m: Math.round(dividendos),
    dy_carteira_pct: ARRED(dy),
    numero_ativos: ativos.length,
    numero_classes: classes.length,
    alocacao_por_classe: classes.map((c) => ({
      classe: c.classe,
      valor: Math.round(c.valor),
      pct: ARRED(c.pct),
    })),
    concentracao: {
      maior_ativo: top1?.ticker ?? null,
      top1_pct: ARRED(top1Pct),
      top3_pct: ARRED(top3Pct),
      top5_pct: ARRED(top5Pct),
    },
    score_diversificacao: score,
    pontos_fortes: pontosFortes,
    pontos_fracos: pontosFracos,
    selo:
      score >= 75
        ? "Saúde financeira sólida"
        : score >= 50
          ? "Carteira em construção"
          : "Riscos a corrigir",
  };
}

function planoDeRebalanceamento(
  ativos: AtivoLinha[],
  alvo: Record<string, number>,
): Record<string, unknown> {
  const atual = alocacaoAtualPorClasse(ativos);
  const total = ativos.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
  const presentes = new Set(atual.map((c) => c.classe));
  const todas = [...new Set([...Object.keys(alvo), ...presentes])];

  const linhas = todas.map((classe) => {
    const linha = atual.find((c) => c.classe === classe);
    const pctAtual = linha?.pct ?? 0;
    const pctAlvo = alvo[classe] ?? 0;
    const valorAtual = linha?.valor ?? 0;
    const valorAlvo = (pctAlvo / 100) * total;
    const diferenca = valorAlvo - valorAtual;
    return {
      classe,
      pct_atual: ARRED(pctAtual),
      pct_alvo: pctAlvo,
      valor_atual: Math.round(valorAtual),
      valor_alvo: Math.round(valorAlvo),
      diferenca: Math.round(diferenca),
      status: Math.abs(diferenca) < 100 ? "ok" : diferenca > 0 ? "aportar" : "reduzir",
    };
  });

  const aportar = linhas
    .filter((l) => l.status === "aportar")
    .sort((a, b) => b.diferenca - a.diferenca);
  const reduzir = linhas
    .filter((l) => l.status === "reduzir")
    .sort((a, b) => a.diferenca - b.diferenca);

  return {
    patrimonio_atual: Math.round(total),
    alvo_utilizado: alvo,
    por_classe: linhas,
    prioridades_de_aporte: aportar.slice(0, 4).map((l) => ({
      classe: l.classe,
      pct_atual: l.pct_atual,
      pct_alvo: l.pct_alvo,
      quanto_aportar: l.diferenca,
    })),
    classes_sobrealocadas: reduzir.slice(0, 4).map((l) => ({
      classe: l.classe,
      pct_atual: l.pct_atual,
      pct_alvo: l.pct_alvo,
      quanto_reduzir: Math.abs(l.diferenca),
    })),
  };
}

interface EventoAgenda {
  id: string;
  titulo: string;
  detalhe: string;
  quando: string;
  tipo: "Brasil" | "EUA" | "Empresas";
}

function proximosEventos(): EventoAgenda[] {
  const agora = new Date();
  const eventos: EventoAgenda[] = [];

  const copom = [
    "2026-01-28",
    "2026-03-18",
    "2026-05-06",
    "2026-06-17",
    "2026-08-05",
    "2026-09-16",
    "2026-11-04",
    "2026-12-09",
  ];
  const fomc = [
    "2026-01-28",
    "2026-03-18",
    "2026-04-29",
    "2026-06-17",
    "2026-07-29",
    "2026-09-16",
    "2026-11-04",
    "2026-12-16",
  ];

  for (const data of copom) {
    eventos.push({
      id: `copom-${data}`,
      titulo: "Decisão do Copom",
      detalhe: "Taxa Selic · Banco Central",
      quando: `${data}T21:30:00.000Z`,
      tipo: "Brasil",
    });
  }
  for (const data of fomc) {
    eventos.push({
      id: `fomc-${data}`,
      titulo: "Decisão do Fed (FOMC)",
      detalhe: "Juros dos EUA",
      quando: `${data}T19:00:00.000Z`,
      tipo: "EUA",
    });
  }

  const primeiraSexta = (ano: number, mes: number) => {
    const d = new Date(Date.UTC(ano, mes, 1));
    while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  };

  for (let i = 0; i < 4; i++) {
    const base = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + i, 1));
    const ano = base.getUTCFullYear();
    const mes = base.getUTCMonth();
    eventos.push({
      id: `ipca-${ano}-${mes}`,
      titulo: "IPCA do mês",
      detalhe: "Inflação oficial · IBGE",
      quando: new Date(Date.UTC(ano, mes, 10, 12, 0)).toISOString(),
      tipo: "Brasil",
    });
    eventos.push({
      id: `ipca15-${ano}-${mes}`,
      titulo: "IPCA-15",
      detalhe: "Prévia da inflação · IBGE",
      quando: new Date(Date.UTC(ano, mes, 25, 12, 0)).toISOString(),
      tipo: "Brasil",
    });
    const sexta = primeiraSexta(ano, mes);
    sexta.setUTCHours(12, 30);
    eventos.push({
      id: `payroll-${ano}-${mes}`,
      titulo: "Payroll (EUA)",
      detalhe: "Relatório de emprego norte-americano",
      quando: sexta.toISOString(),
      tipo: "EUA",
    });
    if ([1, 4, 7, 10].includes(mes)) {
      eventos.push({
        id: `balancos-${ano}-${mes}`,
        titulo: "Temporada de balanços",
        detalhe: "Resultados trimestrais das companhias da B3",
        quando: new Date(Date.UTC(ano, mes, 5, 21, 0)).toISOString(),
        tipo: "Empresas",
      });
    }
  }

  return eventos
    .filter((e) => new Date(e.quando).getTime() > agora.getTime() - 3 * 3_600_000)
    .sort((a, b) => a.quando.localeCompare(b.quando))
    .slice(0, 8);
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const token = request.headers
          .get("Authorization")
          ?.replace(/^Bearer\s+/i, "")
          .trim();
        if (!token) return new Response("Não autenticado", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const lovableApiKey = process.env.LOVABLE_API_KEY;
        if (!supabaseUrl || !supabaseKey)
          return new Response("Backend não configurado", { status: 500 });
        if (!lovableApiKey) return new Response("IA não configurada", { status: 500 });

        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        const userId = userData?.user?.id;
        if (userError || !userId) return new Response("Sessão inválida", { status: 401 });

        const body = (await request.json()) as { messages?: UIMessage[] };
        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Mensagens obrigatórias", { status: 400 });
        }

        const perfil =
          request.headers.get("x-perfil-investidor")?.trim().toLowerCase() ?? "moderado";
        const perfilValido =
          perfil === "conservador" || perfil === "agressivo" ? perfil : "moderado";

        const ultima = messages[messages.length - 1];
        if (ultima?.role === "user") {
          const texto = textoDaMensagem(ultima);
          if (texto.length > 8000) return new Response("Mensagem muito longa", { status: 400 });
          const { error } = await supabase
            .from("chat_mensagens")
            .insert({ user_id: userId, role: "user", parts: [{ type: "text", text: texto }] });
          if (error) console.error("Falha ao salvar mensagem do usuário:", error.message);
        }

        const [
          { data: ativos },
          { data: aportes },
          { data: dividendos },
          { data: plano },
          { data: metas },
        ] = await Promise.all([
          supabase
            .from("ativos")
            .select("ticker, categoria, quantidade, preco_medio, preco_atual, dy"),
          supabase
            .from("aportes")
            .select("data, ticker, quantidade, preco")
            .order("data", { ascending: false })
            .limit(20),
          supabase
            .from("dividendos")
            .select("data, ticker, valor")
            .order("data", { ascending: false })
            .limit(50),
          supabase
            .from("plano_config")
            .select(
              "idade_atual, idade_aposentadoria, aporte_mensal, aumento_anual, rentabilidade_anual, inflacao_anual, taxa_retirada",
            )
            .maybeSingle(),
          supabase.from("metas").select("nome, alvo, ordem").order("ordem", { ascending: true }),
        ]);

        const totalAtual = (ativos ?? []).reduce(
          (s, a) => s + Number(a.quantidade) * Number(a.preco_atual),
          0,
        );
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

        const contexto = textoDaCarteira(
          (ativos ?? []).map((a) => ({
            ticker: a.ticker,
            categoria: a.categoria,
            quantidade: Number(a.quantidade),
            preco_medio: Number(a.preco_medio),
            preco_atual: Number(a.preco_atual),
            dy: Number(a.dy),
          })),
          (aportes ?? []).map((a) => ({
            data: a.data,
            ticker: a.ticker,
            quantidade: Number(a.quantidade),
            preco: Number(a.preco),
          })),
          (dividendos ?? []).map((d) => ({
            data: d.data,
            ticker: d.ticker,
            valor: Number(d.valor),
          })),
        );

        const contextoMetas = (metas ?? []).length
          ? (metas ?? [])
              .map((m) => {
                const pct = m.alvo > 0 ? (totalAtual / m.alvo) * 100 : 0;
                return `- ${m.nome}: alvo ${brl(m.alvo)} → ${pct.toFixed(0)}% concluído (falta ${brl(Math.max(0, m.alvo - totalAtual))})`;
              })
              .join("\n")
          : "Nenhuma meta cadastrada.";

        const ativosLinha = (ativos ?? []).map((a) => ({
          ticker: a.ticker,
          categoria: a.categoria,
          quantidade: Number(a.quantidade),
          preco_medio: Number(a.preco_medio),
          preco_atual: Number(a.preco_atual),
          dy: Number(a.dy),
        }));

        const gateway = createLovableAiGatewayProvider(
          lovableApiKey,
          getLovableAiGatewayRunId(request),
        );

        const mercado = await import("@/lib/market.server");
        const erro = (e: unknown) => ({
          erro: e instanceof Error ? e.message : "Falha ao consultar a fonte de dados.",
        });

        const ferramentas = {
          cotacao: tool({
            description:
              "Cotação atual de uma ação, FII, ETF ou índice (B3 e bolsas internacionais). Ex.: PETR4, HGLG11, BOVA11, IBOVESPA, AAPL, DOLAR.",
            inputSchema: z.object({
              ticker: z.string().describe("Código do ativo ou nome do índice"),
            }),
            execute: async ({ ticker }) => mercado.buscarCotacao(ticker).catch(erro),
          }),
          historico: tool({
            description:
              "Série histórica de preços (até 10 anos ou máximo disponível) com retorno total, retorno anualizado, drawdown máximo, volatilidade e desempenho ano a ano.",
            inputSchema: z.object({
              ticker: z.string(),
              periodo: z.enum(["1mo", "6mo", "1y", "2y", "5y", "10y", "max"]).optional(),
              intervalo: z.enum(["1d", "1wk", "1mo"]).optional(),
            }),
            execute: async ({ ticker, periodo, intervalo }) => {
              try {
                const h = await mercado.buscarHistorico(
                  ticker,
                  periodo ?? "10y",
                  intervalo ?? "1mo",
                );
                // devolve resumo + série reduzida para não estourar o contexto
                const passo = Math.max(1, Math.ceil(h.serie.length / 60));
                return {
                  ...h,
                  serie: h.serie.filter((_, i) => i % passo === 0 || i === h.serie.length - 1),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          procurarAtivo: tool({
            description:
              "Procura o código (ticker) de uma empresa, fundo imobiliário, ETF ou índice pelo nome.",
            inputSchema: z.object({ termo: z.string() }),
            execute: async ({ termo }) => mercado.procurarAtivo(termo).catch(erro),
          }),
          indicadorEconomico: tool({
            description:
              "Série histórica de indicadores do Banco Central: selic, cdi, ipca, igpm, dolar, poupanca.",
            inputSchema: z.object({
              indicador: z.enum(["selic", "cdi", "ipca", "igpm", "dolar", "poupanca"]),
              ultimos: z
                .number()
                .int()
                .optional()
                .describe("Quantidade de observações mais recentes"),
            }),
            execute: async ({ indicador, ultimos }) =>
              mercado.buscarIndicador(indicador, ultimos ?? 12).catch(erro),
          }),
          projecaoJuros: tool({
            description:
              "Projeções do Boletim Focus do Banco Central para os próximos anos: taxa de juros (Selic), IPCA, PIB e câmbio.",
            inputSchema: z.object({
              indicador: z.enum(["selic", "ipca", "pib", "cambio", "igpm"]).optional(),
            }),
            execute: async ({ indicador }) =>
              mercado.buscarProjecoes(indicador ?? "selic").catch(erro),
          }),
          projetarIndependencia: tool({
            description:
              "Projeta o patrimônio ano a ano, a renda passiva e a data provável de independência financeira usando o plano salvo do usuário (idade, aportes, rentabilidade, inflação, taxa de retirada) somado ao patrimônio real da carteira. Aceita aporte mensal ou rentabilidade alternativos para simular cenários ('e se eu aportar X por mês?').",
            inputSchema: z.object({
              aporteMensal: z
                .number()
                .positive()
                .optional()
                .describe("Aporte mensal alternativo em reais para simulação"),
              rentabilidadeAnual: z
                .number()
                .positive()
                .optional()
                .describe("Rentabilidade anual alternativa em % (ex.: 12 para 12% a.a.)"),
            }),
            execute: async ({ aporteMensal, rentabilidadeAnual }) => {
              const entrada: ProjecaoInput = {
                ...planoConfig,
                ...(aporteMensal ? { aporteMensal } : {}),
                ...(rentabilidadeAnual ? { rentabilidadeAnual } : {}),
              };
              const linhas = projetar(entrada);
              const final = linhas[linhas.length - 1];
              return {
                plano_utilizado: {
                  idade_atual: entrada.idadeAtual,
                  idade_aposentadoria: entrada.idadeAposentadoria,
                  aporte_mensal: entrada.aporteMensal,
                  aumento_anual_pct: entrada.aumentoAnual,
                  rentabilidade_anual_pct: entrada.rentabilidadeAnual,
                  inflacao_anual_pct: entrada.inflacaoAnual,
                  taxa_retirada_pct: entrada.taxaRetirada,
                  patrimonio_atual: entrada.patrimonioAtual,
                },
                patrimonio_projetado: Math.round(final.patrimonio),
                patrimonio_projetado_em_valor_de_hoje: Math.round(final.patrimonioReal),
                renda_passiva_mensal_projetada: Math.round(final.rendaPassivaMensal),
                total_aportado_projetado: Math.round(final.aportado),
                ultimo_ano_projetado: final.ano,
                idade_no_ultimo_ano: final.idade,
                primeiro_milhao_em: linhas.find((l) => l.patrimonio >= 1_000_000)?.ano ?? null,
                projecao_ano_a_ano: linhas.map((l) => ({
                  ano: l.ano,
                  idade: l.idade,
                  patrimonio: Math.round(l.patrimonio),
                  renda_passiva_mensal: Math.round(l.rendaPassivaMensal),
                })),
              };
            },
          }),
          sugerirAtivos: tool({
            description:
              "Lista ativos da B3 (ações, FIIs ou BDRs) com melhor dividend yield, valor de mercado ou receita, para sugerir compras que fortalecem a carteira conforme o perfil do investidor e o rebalanceamento. Não é recomendação personalizada regulada pela CVM.",
            inputSchema: z.object({
              tipo: z.enum(["acoes", "fiis", "bdrs"]).optional().describe("Tipo de ativo a listar"),
              foco: z
                .enum(["dy", "valorMercado", "receita"])
                .optional()
                .describe("Critério de ordenação: dividend yield, valor de mercado ou receita"),
            }),
            execute: async ({ tipo, foco }) => {
              try {
                const r = await mercado.buscarRankingsB3(tipo ?? "acoes");
                const lista =
                  foco === "receita"
                    ? r.receitas
                    : foco === "valorMercado"
                      ? r.valorMercado
                      : r.dividendYield;
                return {
                  tipo: r.tipo,
                  criterio: foco ?? "dy",
                  atualizado_em: r.atualizadoEm,
                  sugestoes: lista.slice(0, 12).map((a) => ({
                    ticker: a.ticker,
                    nome: a.nome,
                    preco: a.preco,
                    dy_pct: a.dy,
                    valor_de_mercado: a.valorMercado,
                    receita: a.receita,
                    variacao_pct: a.variacaoPercent,
                  })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          analisarCarteira: tool({
            description:
              "Auditoria completa da carteira do usuário: saúde financeira, concentração, diversificação por classe, riscos, pontos fortes e fracos. Use antes de dar diagnóstico sobre a carteira.",
            inputSchema: z.object({}),
            execute: async () => analisarCarteiraDe(ativosLinha),
          }),
          sugerirRebalanceamento: tool({
            description:
              "Compara a alocação atual da carteira com a estratégia-alvo (perfil do usuário) e indica quanto aportar em cada classe subalocada e quanto reduzir nas sobrealocadas. Use junto com alocacaoRecomendada.",
            inputSchema: z.object({}),
            execute: async () =>
              planoDeRebalanceamento(ativosLinha, ALOCACAO_POR_PERFIL[perfilValido]),
          }),
          alocacaoRecomendada: tool({
            description:
              "Devolve a alocação estratégica ideal por classe de ativos para um perfil de investidor (conservador, moderado ou agressivo). Use ao responder sobre diversificação ou rebalanceamento.",
            inputSchema: z.object({
              perfil: z
                .enum(["conservador", "moderado", "agressivo"])
                .optional()
                .describe("Perfil a consultar; usa o perfil do usuário se omitido"),
            }),
            execute: async ({ perfil }) => {
              const p = perfil ?? perfilValido;
              const alvo = ALOCACAO_POR_PERFIL[p];
              return {
                perfil: p,
                alocacao: Object.entries(alvo).map(([classe, pct]) => ({ classe, pct })),
              };
            },
          }),
          compararAtivos: tool({
            description:
              "Compara dois ou mais ativos lado a lado (retorno anualizado, drawdown máximo, volatilidade, desempenho ano a ano) no mesmo período. Prefira esta ferramenta a chamar historico várias vezes.",
            inputSchema: z.object({
              tickers: z
                .array(z.string())
                .min(2)
                .max(5)
                .describe('Códigos dos ativos (ex.: ["PETR4", "VALE3"])'),
              periodo: z.enum(["1mo", "6mo", "1y", "2y", "5y", "10y", "max"]).optional(),
              intervalo: z.enum(["1d", "1wk", "1mo"]).optional(),
            }),
            execute: async ({ tickers, periodo, intervalo }) => {
              const resumos = [];
              for (const t of tickers) {
                try {
                  const h = await mercado.buscarHistorico(t, periodo ?? "5y", intervalo ?? "1mo");
                  resumos.push({
                    ticker: h.simbolo,
                    nome: h.nome,
                    moeda: h.moeda,
                    retorno_total_pct: ARRED(h.resumo.retornoTotalPercent ?? 0),
                    retorno_anualizado_pct: ARRED(h.resumo.retornoAnualizadoPercent ?? 0),
                    drawdown_maximo_pct: ARRED(h.resumo.drawdownMaximoPercent ?? 0),
                    volatilidade_anual_pct: ARRED(h.resumo.volatilidadeAnualPercent ?? 0),
                    preco_atual: h.resumo.ultimoPreco,
                    preco_inicio: h.resumo.primeiroPreco,
                    desempenho_ano_a_ano: h.resumo.anos.map((a) => ({
                      ano: a.ano,
                      variacao_pct: ARRED(a.variacaoPercent),
                    })),
                  });
                } catch (e) {
                  resumos.push({
                    ticker: t,
                    nome: null,
                    moeda: null,
                    erro: e instanceof Error ? e.message : "Sem histórico disponível",
                  });
                }
              }
              return {
                periodo: periodo ?? "5y",
                intervalo: intervalo ?? "1mo",
                comparacao: resumos,
              };
            },
          }),
          projetarRendaPassiva: tool({
            description:
              "Projeta a evolução dos dividendos/renda passiva da carteira nos próximos anos, usando o DY atual, os aportes e a rentabilidade do plano. Use em perguntas sobre renda passiva, dividendos e 'viver de renda'.",
            inputSchema: z.object({
              anos: z
                .number()
                .int()
                .min(1)
                .max(40)
                .optional()
                .describe("Horizonte em anos (padrão: até a aposentadoria do plano)"),
            }),
            execute: async ({ anos }) => {
              const entrada: ProjecaoInput = { ...planoConfig };
              if (anos && anos > 0) {
                entrada.idadeAposentadoria = entrada.idadeAtual + anos;
              }
              const linhas = projetar(entrada);
              const modelo = ativosParaModelo(ativosLinha);
              const dyAtual = ativosLinha.length ? resumoCarteira(modelo).dyCarteira : 0;
              return {
                dy_carteira_atual_pct: ARRED(dyAtual),
                dividendos_estimados_12m_atual: Math.round(
                  resumoCarteira(modelo).dividendosEstimados12m,
                ),
                premissas: {
                  rentabilidade_anual_pct: entrada.rentabilidadeAnual,
                  inflacao_anual_pct: entrada.inflacaoAnual,
                  aporte_mensal: entrada.aporteMensal,
                  taxa_retirada_pct: entrada.taxaRetirada,
                },
                projecao_renda_passiva: linhas.map((l) => ({
                  ano: l.ano,
                  idade: l.idade,
                  patrimonio: Math.round(l.patrimonio),
                  renda_passiva_mensal_estimada: Math.round(l.rendaPassivaMensal),
                  renda_passiva_anual_estimada: Math.round(l.rendaPassivaMensal * 12),
                })),
              };
            },
          }),
          avaliarMetas: tool({
            description:
              "Mostra o progresso das metas financeiras do usuário (reserva de emergência, primeiro milhão etc.) comparado com o patrimônio atual da carteira.",
            inputSchema: z.object({}),
            execute: async () => ({
              patrimonio_atual: Math.round(totalAtual),
              metas: (metas ?? []).map((m) => ({
                nome: m.nome,
                alvo: m.alvo,
                progresso_pct: m.alvo > 0 ? ARRED((totalAtual / m.alvo) * 100) : 0,
                falta: Math.round(Math.max(0, m.alvo - totalAtual)),
                atingida: totalAtual >= m.alvo,
              })),
            }),
          }),
          noticiasMercado: tool({
            description:
              "Últimas notícias financeiras agregadas (InfoMoney, Money Times, Investing Brasil etc.), com manchete, resumo, fonte e link. Use quando o usuário perguntar sobre o que está acontecendo no mercado.",
            inputSchema: z.object({
              categoria: z
                .string()
                .optional()
                .describe(
                  "Filtra por categoria: Mercados, Ações, Renda Fixa, Fundos Imobiliários, Câmbio & Cripto, Economia, Internacional, Empresas",
                ),
              limite: z.number().int().min(1).max(15).optional(),
            }),
            execute: async ({ categoria, limite }) => {
              try {
                const todas = await agregarNoticias();
                const filtradas = categoria
                  ? todas.filter((n) => n.categoria.toLowerCase().includes(categoria.toLowerCase()))
                  : todas;
                return filtradas.slice(0, limite ?? 8).map((n) => ({
                  titulo: n.titulo,
                  resumo: n.resumo,
                  fonte: n.fonte,
                  url: n.url,
                  categoria: n.categoria,
                  publicado_em: n.publicadoEm,
                  tickers: n.tickers,
                  urgente: n.urgente,
                }));
              } catch (e) {
                return erro(e);
              }
            },
          }),
          agendaEconomica: tool({
            description:
              "Próximos eventos econômicos: decisões do Copom (Selic), do Fed (FOMC), IPCA, IPCA-15, payroll (EUA) e temporada de balanços da B3, com data e horário.",
            inputSchema: z.object({}),
            execute: async () => ({
              eventos: proximosEventos().map((e) => ({
                titulo: e.titulo,
                detalhe: e.detalhe,
                quando: e.quando,
                tipo: e.tipo,
              })),
            }),
          }),
        };

        const result = streamText({
          model: gateway("openai/gpt-5.5"),
          system: SISTEMA.replace("{PERFIL}", perfilValido).concat(
            `\n\n### Carteira atual do usuário\n${contexto}\n\n### Metas financeiras do usuário\n${contextoMetas}\n\nData de hoje: ${new Date().toISOString().slice(0, 10)}`,
          ),
          messages: await convertToModelMessages(messages),
          tools: ferramentas,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            const texto = textoDaMensagem(responseMessage);
            if (!texto) return;
            const { error } = await supabase.from("chat_mensagens").insert({
              user_id: userId,
              role: "assistant",
              parts: [{ type: "text", text: texto }],
            });
            if (error) console.error("Falha ao salvar resposta do assistente:", error.message);
          },
        });
      },
    },
  },
});
