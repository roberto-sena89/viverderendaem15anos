import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import {
  brl,
  classeDoAtivo,
  CLASSE_POS_FIXADO,
  planoPadrao,
  projetar,
  resumoCarteira,
  type ProjecaoInput,
} from "@/lib/portfolio";
import {
  ALOCACAO_POR_PERFIL,
  ARRED,
  analisarCarteiraDe,
  planoDeRebalanceamento,
  type AtivoLinha,
} from "@/lib/auditoria";
import { agregarNoticias } from "@/lib/noticias.server";
import { reconciliarHistoricoAportes } from "@/lib/historico-aportes";
import {
  diversificacao,
  exposicaoPorMoeda,
  metricasDeSerieMensal,
  montarBenchmarkGlobal,
  retornoPonderado12m,
} from "@/lib/analise-carteira";
import type { Database } from "@/integrations/supabase/types";

const SISTEMA = `Você é o "Gestor IA", consultor PRO da plataforma Investidor em 15 Anos — um serviço premium de assessoria financeira educativa.

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
- panoramaMercado: fotografia do mercado hoje (destaques de ações, FIIs, ETFs, índices, cripto e commodities + amplitude).
- indicesMercado: Ibovespa, IFIX, IBrX, Small Caps, S&P 500, Nasdaq, CDI, Selic, IPCA, IGP-M (benchmarks).
- mercadoCripto e mercadoCommodities: cotações e variações de criptomoedas e commodities.

Ferramentas fundamentalistas (grades completas da B3):
- fundamentosAcao: todos os indicadores de uma ação (P/L, P/VP, PSR, EV/EBIT, DY, ROE, ROIC, margens, dívida/PL, LPA, VPA, preço-teto de Bazin e preço justo de Graham).
- rastrearAcoes: screener de ações por setor, DY, P/L, P/VP, ROE ou pontuação.
- fundamentosFii e rastrearFiis: P/VP, VPA, DY, vacância, cap rate, tipo e segmento dos fundos imobiliários.
- listarEtfs: ETFs nacionais e internacionais com DY, capitalização e variações de 30d, 12m, 24m e 60m.
- tesouroDireto: títulos públicos com vencimento, taxa e preço unitário.

Ferramentas de análise da carteira:
- analisarCarteira: auditoria completa da carteira (saúde, concentração, diversificação, risco, pontos fortes e fracos). Use em perguntas do tipo "analise minha carteira", "como está minha diversificação", "qual o risco da minha carteira".
- projetarIndependencia: projeta patrimônio ano a ano, renda passiva e data da independência financeira usando o plano salvo + patrimônio real. Simula aportes/rentabilidade alternativos.
- projetarRendaPassiva: projeta a evolução dos dividendos/renda passiva da carteira nos próximos anos.
- sugerirRebalanceamento: compara a alocação atual com a estratégia ideal e indica quanto aportar/vender em cada classe.
- avaliarMetas: mostra o progresso das metas financeiras do usuário (reserva, primeiro milhão etc.).
- alocacaoRecomendada: devolve a alocação estratégica ideal para o perfil do usuário.
- sugerirAtivos: lista ativos da B3 (ações, FIIs, BDRs) por dividend yield, valor de mercado ou receita.
- historicoAportes: aportes do usuário mês a mês e por ativo (disciplina, média mensal, constância).
- historicoDividendos: proventos recebidos mês a mês e por ativo, com yield on cost.
- desempenhoCarteira12m: desempenho de 12 meses de cada ativo da carteira.
- benchmarkCarteira: retorno de 12 meses da carteira comparado aos benchmarks Ibovespa, IFIX, CDI acumulado e S&P 500 (excedente em pontos percentuais). Use em perguntas de desempenho da carteira frente ao mercado.
- compararBenchmark: retorno ponderado de 12 meses da carteira vs Ibovespa e IVVB11 (proxy global) com notas 0-10, excedente (alpha), cobertura dos dados e exposição por moeda (BRL/USD/cripto). Use em perguntas do tipo "minha carteira bate o mercado?", "meu desempenho vs Ibovespa".
- metricasRiscoCarteira: métricas de risco da carteira em 12 meses — volatilidade anual, drawdown máximo, Índice de Sharpe, melhor/pior mês — mais diversificação efetiva (HHI/nº de ativos efetivos) e exposição por moeda. Use em perguntas do tipo "qual o risco da minha carteira", "minha carteira é diversificada".
- educacaoPush: detecta lacunas (gaps) entre carteira/plano e a estratégia ideal (reserva de emergência, renda fixa, concentração, diversificação, metas, plano, disciplina de aportes) e devolve conteúdo educativo + ações do plano. Use ao final de auditorias e sempre que detectar um gap no diagnóstico.
- calcularTributos: estima a tributação da carteira (dividendos isentos, JCP 15%, renda fixa regressiva, ganho de capital em ações/FIIs/ETFs). Use em perguntas sobre imposto de renda, DARF, planejamento tributário.

Recursos premium (função PRO/PREMIUM do assistente):
- O botão "Relatório PDF dos Auditores" na interface gera um PDF profissional completo: visão geral, KPIs, alocação, concentração, pontos fortes e de atenção, plano de rebalanceamento, projeção de independência, metas e detalhamento da carteira. Ao ser acionado, basta o usuário clicar; informe que o relatório está disponível quando solicitado e explique seus principais números.
- Analise sempre com profundidade de consultoria: combine dados da carteira com contexto de mercado, benchmark e premissas do plano.

Regras com dados de mercado:
- Nunca invente cotações, retornos, projeções ou notícias — chame a ferramenta correspondente.
- Cite a data/período dos dados e a fonte quando apresentar números de mercado.
- Se um código não existir, use procurarAtivo antes de responder.
- Antes de opinar se um ativo está "caro" ou "barato", chame fundamentosAcao/fundamentosFii e compare com o setor.

Base de conhecimento (use como referência analítica, sempre com bom senso e contexto):
- Ações: P/L compara preço e lucro (baixo pode ser barato ou armadilha de valor); P/VP < 1 indica desconto sobre o patrimônio; ROE acima de 15% sugere boa rentabilidade; dívida líquida/patrimônio acima de 1,5 pede cautela; margens e crescimento de receita mostram qualidade.
- Preço-teto de Bazin: dividendo dos últimos 12 meses ÷ 6% (yield mínimo desejado) — foco em dividendos estáveis. Preço justo de Graham: √(22,5 × LPA × VPA) — foco em valor. Ambos são filtros, não verdades absolutas.
- Dividend yield muito alto (acima de ~12%) costuma ser evento não recorrente ou queda de preço — verifique o histórico antes de recomendar.
- FIIs: P/VP próximo de 1 é referência de preço justo; vacância alta pressiona a distribuição; fundos de papel (CRI) acompanham IPCA/CDI, fundos de tijolo dependem de contratos e vacância; FOFs diversificam mas cobram dupla taxa; liquidez diária baixa dificulta a saída.
- Renda fixa: Tesouro Selic para reserva de emergência; Prefixado trava a taxa (marcação a mercado se vender antes); IPCA+ protege o poder de compra. Compare sempre o prêmio sobre o CDI/Selic vigente.
- Risco: diversificar por classe, setor e moeda; nenhuma posição individual acima de ~10-15% do patrimônio; exposição internacional (ETFs globais/BDRs) protege contra risco Brasil e câmbio.
- Custos e impostos: ações têm isenção de IR em vendas até R$ 20 mil/mês (day trade não), 15% sobre o ganho acima disso; FIIs pagam 20% sobre ganho de capital e distribuem rendimento isento a pessoa física; renda fixa segue tabela regressiva (22,5% a 15%); dividendos de ações hoje são isentos, JCP tem 15% na fonte.
- Reserva de emergência: 6 a 12 meses de custo de vida em liquidez diária, antes de qualquer renda variável.
- Independência financeira: regra dos 4% (patrimônio ≈ 25× o gasto anual); juros compostos e constância de aporte pesam mais que acertar o "timing".

Conhecimento profissional (nível PRO — use para elevar a qualidade das análises):
- Renda passiva por ativo: ações pagam dividendos (isenção para PF); FIIs distribuem rendimento isento (tijolo/papel/FOF têm dinâmicas diferentes); renda fixa paga juros (prefixado/IPCA/Selic); ETFs de dividendos concentram exposição com custo baixo. Fale de renda passiva sempre com o DY projetado, não só o histórico.
- Análise de valuation: P/L abaixo do setor + ROE alto sugere subavaliação; EV/EBIT é mais robusto que P/L para comparar empresas com estruturas de capital diferentes; PSR ajuda em empresas sem lucro; margem líquida e dívida líquida/EBITDA mostram qualidade do balanço.
- Renda fixa estratégica: escada de títulos (laddering) reduz risco de reinvestimento; IPCA+ vence a inflação real; prefixado paga mais se juros caírem; compare sempre o prêmio em relação à Selic/CDI vigente e à inflação implícita.
- Alocação de longo prazo: diversificação entre classes (renda fixa, ações, FIIs, exterior) é o principal controle de risco; rebalancear periodicamente (ex.: anual ou ao desviar >5%) mantém o risco do plano; reduza concentração em moeda e em setor.
- Perfis: conservador prioriza preservação e liquidez; moderado equilibra crescimento e estabilidade; agressivo aceita maior volatilidade por retorno. Adapte o tom e o nível de risco às respostas, respeitando o perfil salvo do usuário.
- Juros compostos: o tempo é o multiplicador mais importante; aportes regulares e crescentes aceleram a meta; evite rupturas de aporte; reinvista proventos para potencializar o efeito.
- Técnicas de gestão de risco: posição máxima de 10-15% por ativo, stop disciplinado quando aplicável, exposição cambial controlada e reserva de oportunidade em liquidez.

Regras de projeção e análise:
- Use analisarCarteira antes de emitir diagnóstico sobre diversificação, risco ou concentração.
- Use projetarIndependencia para qualquer pergunta sobre aposentadoria, independência financeira ou renda passiva. Não calcule manualmente.
- Para "quanto devo aportar", projete o cenário atual e simule aportes maiores para mostrar a antecipação da meta.
- Explique a regra dos 4% (taxa de retirada) quando falar de renda passiva.
- Ao sugerir rebalanceamento, use sugerirRebalanceamento e alocacaoRecomendada (perfil do usuário) em conjunto.
- Em auditorias completas, combine analisarCarteira + desempenhoCarteira12m + benchmarkCarteira + historicoAportes + historicoDividendos + indicesMercado (comparação com benchmarks) + educacaoPush (conteúdo educativo e ações do plano para cada lacuna detectada).
- Ao detectar um gap no plano ou na carteira (sem reserva de emergência, concentração alta, poucos ativos, sem FIIs, DY baixo, sem metas, plano não configurado, disciplina de aporte fraca), chame educacaoPush e apresente ao usuário o conteúdo educativo e as ações do plano — isso é a entrega de valor do consultor PRO.
- Em perguntas sobre impostos, use calcularTributos e complemente com contexto educacional de planejamento tributário.

Regras de conciliação de valores (CRÍTICO em auditorias e sugestões de aporte):
- "Patrimônio atual" e "Total investido (hoje)" vêm SEMPRE da carteira atual (posições da janela Carteira, via analisarCarteira/contexto). São os números que o usuário vê na tela — eles prevalecem sobre qualquer outro.
- "Total aportado (histórico)" é o fluxo acumulado de compras/vendas ao longo do tempo. Ele PODE ser diferente do total investido atual (vendas parciais, taxas, ajustes de preço médio). Ao falar de aportes, traga a conciliação do historicoAportes (total_aportado_liquido vs total_investido_carteira) e explique qualquer diferença em linguagem simples — nunca apresente o valor DOBRADO com rótulos contraditórios.
- Aportes mês a mês: use SEMPRE historicoAportes.por_mes — é a mesma origem da janela "Histórico de Aportes" que o usuário vê na tela.
- Lucro/prejuízo da carteira: use analisarCarteira (lucro_total, rentabilidade_pct) e a conciliação do historicoAportes — total_investido_carteira corresponde à coluna "Investido" da janela Carteira e patrimonio_atual_carteira ao "Patrimônio" da janela Resumo. Esses são os números que o usuário vê.
- Se um ativo aparecer em avisos_consistencia (analisarCarteira) ou alertas_consistencia/possivel_inconsistencia (historicoAportes), o preço atual dele no banco está fora do plausível frente ao preço médio (ex.: renda fixa variando mais de 80%). NESSE CASO: não apresente o valor como fato — diga que o preço atual do ativo no sistema parece incorreto, cruze com a ferramenta cotacao/tesouroDireto quando puder e oriente o usuário a conferir/editar o preço na janela Carteira. Nunca construa diagnóstico (concentração, lucro, rebalanceamento) sobre um valor sinalizado como inconsistente.
- Para sugerir aportes, use SEMPRE sugerirRebalanceamento (que calcula sobre a carteira atual: patrimônio, posições e lacunas por classe) + alocacaoRecomendada. Os valores sugeridos saem da ferramenta — nunca chute ou invente quanto aportar.
- Nunca misture projeções futuras (projetarIndependencia usa o aporte mensal do plano) com valores reais da carteira sem deixar claro o que é projeção e o que é realidade. Em auditorias, apresente primeiro os números reais da carteira, depois as projeções do plano.
- Se dois números divergirem, prevalecem os da carteira atual (ativos) e informe a divergência ao usuário.

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
  const totalAportadoHistorico = aportes.reduce((s, a) => s + a.quantidade * a.preco, 0);
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
    `Patrimônio atual: ${brl(totalAtual)} | Total investido (carteira): ${brl(totalInvestido)}`,
    `Conciliação: total aportado no histórico ${brl(totalAportadoHistorico)} (pode divergir do investido atual por vendas/taxas) | Total investido hoje (carteira) ${brl(totalInvestido)}`,
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

const MODELO_CHAT = "openai/gpt-5.5";

function textoDaMensagem(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

/**
 * Teto de caracteres do histórico enviado ao modelo. Cada mensagem reenvia a
 * conversa inteira; sem limite, conversas longas explodem o pedido e o gateway
 * rejeita com erro "AN ERROR OCCURRED". Descarta do início até caber, sempre
 * mantendo a mensagem atual do usuário.
 */
const TETO_HISTORICO_CHARS = 60_000;

function apararHistorico(hist: UIMessage[]): UIMessage[] {
  const mantidas = hist.slice();
  let total = mantidas.reduce((s, m) => s + textoDaMensagem(m).length, 0);
  while (mantidas.length > 1 && total > TETO_HISTORICO_CHARS) {
    const removida = mantidas.shift();
    if (removida) total -= textoDaMensagem(removida).length;
  }
  return mantidas.map((m) =>
    textoDaMensagem(m).length > TETO_HISTORICO_CHARS
      ? {
          ...m,
          parts: m.parts.map((p) =>
            p.type === "text" && p.text.length > TETO_HISTORICO_CHARS
              ? {
                  ...p,
                  text: `${p.text.slice(0, TETO_HISTORICO_CHARS)}\n… Conteúdo antigo muito longo foi resumido para caber no limite do assistente.`,
                }
              : p,
          ),
        }
      : m,
  );
}

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
        const modoCitacoes = request.headers.get("x-modo-citacoes")?.trim().toLowerCase() === "on";

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
          { data: habilidades },
        ] = await Promise.all([
          supabase
            .from("ativos")
            .select("ticker, categoria, quantidade, preco_medio, preco_atual, dy"),
          supabase
            .from("aportes")
            .select("data, ticker, quantidade, preco")
            .order("data", { ascending: false }),
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
          supabase
            .from("ia_habilidades")
            .select("nome, titulo, instrucao")
            .eq("ativo", true)
            .order("criado_em", { ascending: true }),
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
              "Cotação atual de uma ação, FII, ETF, índice (B3 e bolsas internacionais) ou título do Tesouro Direto. Ex.: PETR4, HGLG11, BOVA11, IBOVESPA, AAPL, DOLAR, TESOURO SELIC 2029, TESOURO PREFIXADO 2032, TESOURO IPCA+ 2035. Títulos do Tesouro são cotados na fonte oficial (Tesouro Transparente).",
            inputSchema: z.object({
              ticker: z.string().describe("Código do ativo, nome do índice ou título do Tesouro"),
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
              "Auditoria completa da carteira do usuário: saúde financeira, concentração, diversificação por classe, riscos, pontos fortes e fracos, e avisos_consistencia (ativos cujo preço atual parece incorreto — cruze com a janela Carteira antes de afirmar valores). Use antes de dar diagnóstico sobre a carteira.",
            inputSchema: z.object({}),
            execute: async () => analisarCarteiraDe(ativosLinha),
          }),
          sugerirRebalanceamento: tool({
            description:
              "Compara a alocação atual da carteira com a estratégia-alvo (perfil do usuário) e indica quanto aportar em cada classe subalocada e quanto reduzir nas sobrealocadas. Os valores são calculados sobre a carteira ATUAL do usuário (patrimônio e posições reais). Use junto com alocacaoRecomendada e apresente os números exatamente como vêm da ferramenta.",
            inputSchema: z.object({}),
            execute: async () => {
              const plano = planoDeRebalanceamento(ativosLinha, ALOCACAO_POR_PERFIL[perfilValido]);
              const totalInvestido = ativosLinha.reduce(
                (s, a) => s + a.quantidade * a.preco_medio,
                0,
              );
              return {
                ...plano,
                base_de_calculo: {
                  patrimonio_atual_carteira: plano.patrimonio_atual,
                  total_investido_carteira: Math.round(totalInvestido),
                  perfil_utilizado: perfilValido,
                  nota: "Valores calculados sobre as posições atuais da janela Carteira (preços de hoje). Quanto_aportar é o valor necessário em cada classe para chegar ao alvo do perfil, sem considerar o empréstimo do próximo aporte.",
                },
              };
            },
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
          educacaoPush: tool({
            description:
              "Detecta lacunas (gaps) entre a carteira/plano do usuário e a estratégia ideal — reserva de emergência, renda fixa, concentração, diversificação, metas, plano e disciplina de aportes — e devolve, para cada gap, conteúdo educativo e ações concretas do plano. Use ao final de auditorias, rebalanceamentos ou sempre que detectar um gap no diagnóstico (ex.: sem reserva de emergência).",
            inputSchema: z.object({
              gap: z
                .enum([
                  "carteira_vazia",
                  "reserva_emergencia",
                  "sem_renda_fixa",
                  "concentracao",
                  "poucos_ativos",
                  "sem_acoes",
                  "sem_fiis",
                  "dy_baixo",
                  "sem_metas",
                  "plano_nao_definido",
                  "aporte_irregular",
                ])
                .optional()
                .describe("Gap específico a detalhar; sem ele, devolve todos os detectados"),
            }),
            execute: async ({ gap }) => {
              try {
                const { educacaoPush } = await import("@/lib/educacao-push");
                return educacaoPush(
                  {
                    ativos: ativosLinha,
                    aportes: (aportes ?? []).map((a) => ({
                      data: a.data,
                      ticker: a.ticker,
                      quantidade: Number(a.quantidade),
                      preco: Number(a.preco),
                    })),
                    metas: (metas ?? []).map((m) => ({
                      nome: m.nome,
                      alvo: m.alvo,
                      ordem: m.ordem,
                    })),
                    planoConfig,
                    perfil: perfilValido,
                    planoSalvo: Boolean(plano),
                  },
                  gap,
                );
              } catch (e) {
                return erro(e);
              }
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
                  "Filtra por categoria: Mercados, Ações, Renda Fixa, FIIS, Câmbio & Cripto, Economia, Internacional, Empresas",
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
          fundamentosAcao: tool({
            description:
              "Indicadores fundamentalistas completos de uma ação da B3: P/L, P/VP, PSR, EV/EBIT, DY 12m, ROE, ROIC, margens, dívida/patrimônio, crescimento de receita, LPA, VPA, preço-teto de Bazin e preço justo de Graham com o upside de cada método. Use sempre que o usuário perguntar se uma ação está cara/barata ou pedir análise fundamentalista.",
            inputSchema: z.object({ ticker: z.string() }),
            execute: async ({ ticker }) => {
              try {
                const { gradeAcoesComCache } = await import("@/lib/acoes.server");
                const grade = await gradeAcoesComCache();
                const alvo = ticker.trim().toUpperCase();
                const linha =
                  grade.linhas.find((l) => l.ticker === alvo) ??
                  grade.linhas.find((l) => l.ticker.startsWith(alvo.slice(0, 4)));
                if (!linha) return { erro: `Ação ${alvo} não encontrada na grade da B3.` };
                return { atualizado_em: grade.atualizadoEm, acao: linha };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          rastrearAcoes: tool({
            description:
              "Screener de ações da B3: filtra e ordena a grade completa por setor, dividend yield, P/L, P/VP, ROE, liquidez ou pontuação fundamentalista. Use para 'quais ações pagam mais dividendos', 'ações baratas', 'melhores ações do setor financeiro'.",
            inputSchema: z.object({
              setor: z.string().optional().describe("Ex.: Financeiro, Utilidade Pública, Saúde"),
              dyMinimo: z.number().optional().describe("DY 12m mínimo em %"),
              plMaximo: z.number().optional(),
              pvpMaximo: z.number().optional(),
              roeMinimo: z.number().optional().describe("ROE mínimo em %"),
              ordenar: z.enum(["dy", "pl", "pvp", "roe", "pontuacao", "valorMercado"]).optional(),
              limite: z.number().int().min(1).max(25).optional(),
            }),
            execute: async ({
              setor,
              dyMinimo,
              plMaximo,
              pvpMaximo,
              roeMinimo,
              ordenar,
              limite,
            }) => {
              try {
                const { gradeAcoesComCache } = await import("@/lib/acoes.server");
                const grade = await gradeAcoesComCache();
                const filtradas = grade.linhas.filter((l) => {
                  if (setor && !l.setor.toLowerCase().includes(setor.toLowerCase())) return false;
                  if (dyMinimo != null && (l.dy12 ?? 0) < dyMinimo) return false;
                  if (plMaximo != null && !(l.pl != null && l.pl > 0 && l.pl <= plMaximo))
                    return false;
                  if (pvpMaximo != null && !(l.pvp != null && l.pvp > 0 && l.pvp <= pvpMaximo))
                    return false;
                  if (roeMinimo != null && (l.roe ?? -999) < roeMinimo) return false;
                  return true;
                });
                const chave = ordenar ?? "pontuacao";
                const valor = (l: (typeof filtradas)[number]) =>
                  chave === "dy"
                    ? (l.dy12 ?? -1)
                    : chave === "pl"
                      ? -(l.pl ?? 9999)
                      : chave === "pvp"
                        ? -(l.pvp ?? 9999)
                        : chave === "roe"
                          ? (l.roe ?? -999)
                          : chave === "valorMercado"
                            ? (l.valorMercado ?? -1)
                            : (l.pontuacao ?? -1);
                return {
                  criterio: chave,
                  total_encontrado: filtradas.length,
                  atualizado_em: grade.atualizadoEm,
                  acoes: filtradas
                    .sort((a, b) => valor(b) - valor(a))
                    .slice(0, limite ?? 12)
                    .map((l) => ({
                      ticker: l.ticker,
                      nome: l.nome,
                      setor: l.setor,
                      preco: l.preco,
                      dy12_pct: l.dy12,
                      pl: l.pl,
                      pvp: l.pvp,
                      roe_pct: l.roe,
                      margem_liquida_pct: l.margemLiquida,
                      divida_patrimonio: l.dividaPatrimonio,
                      preco_teto_bazin: l.precoTetoBazin,
                      upside_bazin_pct: l.upsideBazin,
                      preco_justo_graham: l.precoJustoGraham,
                      upside_graham_pct: l.upsideGraham,
                      pontuacao: l.pontuacao,
                    })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          fundamentosFii: tool({
            description:
              "Indicadores de um FII: tipo (tijolo, papel, FOF...), segmento, P/VP, VPA, DY 12m, vacância, cap rate, patrimônio e liquidez. Use para avaliar fundos imobiliários específicos.",
            inputSchema: z.object({ ticker: z.string() }),
            execute: async ({ ticker }) => {
              try {
                const { gradeFiisComCache } = await import("@/lib/fiis.server");
                const grade = await gradeFiisComCache();
                const alvo = ticker.trim().toUpperCase();
                const linha = grade.linhas.find((l) => l.ticker === alvo);
                if (!linha) return { erro: `FII ${alvo} não encontrado na grade.` };
                return { atualizado_em: grade.atualizadoEm, fii: linha };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          rastrearFiis: tool({
            description:
              "Screener de FIIs: filtra por tipo (Tijolo, Papel, Misto, FOF, FI-Infra, Fiagro), segmento, DY mínimo, P/VP máximo e vacância máxima. Use para 'melhores FIIs de papel', 'FIIs baratos', 'FIIs que pagam mais'.",
            inputSchema: z.object({
              tipo: z.string().optional(),
              segmento: z.string().optional(),
              dyMinimo: z.number().optional(),
              pvpMaximo: z.number().optional(),
              vacanciaMaxima: z.number().optional(),
              ordenar: z.enum(["dy", "pvp", "liquidez", "patrimonio"]).optional(),
              limite: z.number().int().min(1).max(25).optional(),
            }),
            execute: async ({
              tipo,
              segmento,
              dyMinimo,
              pvpMaximo,
              vacanciaMaxima,
              ordenar,
              limite,
            }) => {
              try {
                const { gradeFiisComCache } = await import("@/lib/fiis.server");
                const grade = await gradeFiisComCache();
                const filtrados = grade.linhas.filter((l) => {
                  if (tipo && !l.tipo.toLowerCase().includes(tipo.toLowerCase())) return false;
                  if (segmento && !l.segmento.toLowerCase().includes(segmento.toLowerCase()))
                    return false;
                  if (dyMinimo != null && (l.dy12 ?? 0) < dyMinimo) return false;
                  if (pvpMaximo != null && !(l.pvp != null && l.pvp > 0 && l.pvp <= pvpMaximo))
                    return false;
                  if (vacanciaMaxima != null && (l.vacancia ?? 0) > vacanciaMaxima) return false;
                  return true;
                });
                const chave = ordenar ?? "dy";
                const valor = (l: (typeof filtrados)[number]) =>
                  chave === "pvp"
                    ? -(l.pvp ?? 9999)
                    : chave === "liquidez"
                      ? (l.liquidez ?? -1)
                      : chave === "patrimonio"
                        ? (l.patrimonio ?? -1)
                        : (l.dy12 ?? -1);
                return {
                  criterio: chave,
                  total_encontrado: filtrados.length,
                  atualizado_em: grade.atualizadoEm,
                  fiis: filtrados
                    .sort((a, b) => valor(b) - valor(a))
                    .slice(0, limite ?? 12)
                    .map((l) => ({
                      ticker: l.ticker,
                      nome: l.nome,
                      tipo: l.tipo,
                      segmento: l.segmento,
                      preco: l.preco,
                      dy12_pct: l.dy12,
                      pvp: l.pvp,
                      vpa: l.vpa,
                      vacancia_pct: l.vacancia,
                      cap_rate_pct: l.capRate,
                      liquidez_diaria: l.liquidez,
                      patrimonio: l.patrimonio,
                    })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          listarEtfs: tool({
            description:
              "Lista ETFs (B3 e internacionais) com classe de exposição, gestora, DY, capitalização e variações de 30 dias, 12, 24 e 60 meses. Use para comparar ETFs ou sugerir exposição a índices e ao exterior.",
            inputSchema: z.object({
              classe: z
                .string()
                .optional()
                .describe(
                  "Ações Brasil, Internacional, Renda Fixa, Cripto, Commodities, Setorial/Temático",
                ),
              ordenar: z.enum(["var12m", "var60m", "dy", "capitalizacao"]).optional(),
              limite: z.number().int().min(1).max(25).optional(),
            }),
            execute: async ({ classe, ordenar, limite }) => {
              try {
                const { gradeEtfsComCache } = await import("@/lib/etfs.server");
                const grade = await gradeEtfsComCache();
                const filtrados = classe
                  ? grade.linhas.filter((l) =>
                      l.classe.toLowerCase().includes(classe.toLowerCase()),
                    )
                  : grade.linhas;
                const chave = ordenar ?? "var12m";
                const valor = (l: (typeof filtrados)[number]) =>
                  chave === "var60m"
                    ? (l.var60m ?? -9999)
                    : chave === "dy"
                      ? (l.dy12 ?? -1)
                      : chave === "capitalizacao"
                        ? (l.capitalizacao ?? -1)
                        : (l.var12m ?? -9999);
                return {
                  criterio: chave,
                  atualizado_em: grade.atualizadoEm,
                  ibovespa: grade.ibovespa,
                  etfs: filtrados
                    .sort((a, b) => valor(b) - valor(a))
                    .slice(0, limite ?? 12)
                    .map((l) => ({
                      ticker: l.ticker,
                      nome: l.nome,
                      classe: l.classe,
                      mercado: l.mercado,
                      gestora: l.gestora,
                      preco: l.preco,
                      dy12_pct: l.dy12,
                      var30d_pct: l.var30d,
                      var12m_pct: l.var12m,
                      var60m_pct: l.var60m,
                      capitalizacao: l.capitalizacao,
                    })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          tesouroDireto: tool({
            description:
              "Títulos do Tesouro Direto disponíveis com vencimento, taxa de compra/venda e preço unitário (Selic, Prefixado, IPCA+ e Renda+/Educa+). Use para comparar renda fixa pública com outros investimentos e montar a reserva.",
            inputSchema: z.object({
              indexador: z
                .enum(["selic", "prefixado", "ipca"])
                .optional()
                .describe("Filtra pelo indexador do título"),
            }),
            execute: async ({ indexador }) => {
              try {
                const { listarTesouroDireto } = await import("@/lib/tesouro.server");
                const titulos = await listarTesouroDireto();
                const filtrados = indexador
                  ? titulos.filter((t) =>
                      indexador === "ipca"
                        ? /ipca/i.test(t.nome)
                        : indexador === "selic"
                          ? /selic/i.test(t.nome)
                          : /prefixado/i.test(t.nome),
                    )
                  : titulos;
                return {
                  titulos: filtrados
                    .sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""))
                    .map((t) => ({
                      nome: t.nome,
                      vencimento: t.vencimento,
                      data_base: t.dataBase,
                      taxa_compra_aa: t.taxaCompra,
                      taxa_venda_aa: t.taxaVenda,
                      preco_compra: t.precoCompra,
                    })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          mercadoCripto: tool({
            description:
              "Cotações e variações (1h, 24h, 7d, 30d, 12m) das principais criptomoedas, com capitalização, volume e dominância do Bitcoin. Aceita busca por nome/ticker.",
            inputSchema: z.object({
              termo: z.string().optional().describe("Ex.: bitcoin, ETH, SOL"),
              limite: z.number().int().min(1).max(25).optional(),
            }),
            execute: async ({ termo, limite }) => {
              try {
                const { gradeCriptoComCache } = await import("@/lib/cripto.server");
                const grade = await gradeCriptoComCache();
                const t = termo?.trim().toLowerCase();
                const linhas = t
                  ? grade.linhas.filter(
                      (l) =>
                        l.ticker.toLowerCase().includes(t) ||
                        l.nome.toLowerCase().includes(t) ||
                        l.id.toLowerCase().includes(t),
                    )
                  : grade.linhas;
                return {
                  usd_brl: grade.usdBrl,
                  dominancia_btc_pct: grade.dominanciaBtc,
                  capitalizacao_total: grade.capitalizacaoTotal,
                  atualizado_em: grade.atualizadoEm,
                  criptos: linhas.slice(0, limite ?? 10).map((l) => ({
                    ticker: l.ticker,
                    nome: l.nome,
                    categoria: l.categoria,
                    preco_usd: l.precoUsd,
                    preco_brl: l.precoUsd != null ? ARRED(l.precoUsd * grade.usdBrl) : null,
                    var24h_pct: l.variacao24h,
                    var7d_pct: l.variacao7d,
                    var30d_pct: l.variacao30d,
                    var12m_pct: l.variacao12m,
                    capitalizacao: l.capitalizacao,
                  })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          mercadoCommodities: tool({
            description:
              "Preços de commodities (petróleo, ouro, prata, minério, soja, milho, café, boi) com variação do dia, 30 dias e 12 meses, mínimas e máximas. Use ao analisar setores ligados a commodities (PETR, VALE, agro).",
            inputSchema: z.object({ categoria: z.string().optional() }),
            execute: async ({ categoria }) => {
              try {
                const { buscarCommodities } = await import("@/lib/commodities.server");
                const r = await buscarCommodities();
                const linhas = categoria
                  ? r.linhas.filter((l) =>
                      l.categoria.toLowerCase().includes(categoria.toLowerCase()),
                    )
                  : r.linhas;
                return {
                  usd_brl: r.usdBrl,
                  atualizado_em: r.atualizadoEm,
                  commodities: linhas.map((l) => ({
                    nome: l.nome,
                    categoria: l.categoria,
                    unidade: l.unidade,
                    preco_usd: l.precoUsd,
                    var_dia_pct: l.variacaoDia,
                    var30d_pct: l.variacao30d,
                    var12m_pct: l.variacao12m,
                    minima_12m: l.minima12m,
                    maxima_12m: l.maxima12m,
                  })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          indicesMercado: tool({
            description:
              "Índices e taxas de referência (Ibovespa, IFIX, IBrX, Small Caps, S&P 500, Nasdaq, CDI, Selic, IPCA, IGP-M) com valor atual, variação do dia e de 12 meses. Use para comparar a carteira com benchmarks.",
            inputSchema: z.object({ categoria: z.string().optional() }),
            execute: async ({ categoria }) => {
              try {
                const { buscarIndices } = await import("@/lib/indices.server");
                const r = await buscarIndices();
                const linhas = categoria
                  ? r.linhas.filter((l) =>
                      l.categoria.toLowerCase().includes(categoria.toLowerCase()),
                    )
                  : r.linhas;
                return {
                  atualizado_em: r.atualizadoEm,
                  indices: linhas.map((l) => ({
                    codigo: l.codigo,
                    nome: l.nome,
                    categoria: l.categoria,
                    valor: l.valor,
                    unidade: l.unidade,
                    var_dia_pct: l.variacaoDiaPercent,
                    var12m_pct: l.variacao12m,
                    divulgado_em: l.divulgadoEm,
                  })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          panoramaMercado: tool({
            description:
              "Panorama consolidado do mercado hoje: destaques de ações, FIIs, ETFs, índices, cripto e commodities, com amplitude (altas x baixas) e termômetro geral. Use para 'como está o mercado hoje'.",
            inputSchema: z.object({}),
            execute: async () => {
              try {
                const { buscarPanorama } = await import("@/lib/panorama-mercado.server");
                return await buscarPanorama();
              } catch (e) {
                return erro(e);
              }
            },
          }),
          historicoAportes: tool({
            description:
              "Histórico completo de aportes do usuário reconciliado com a carteira atual: por_mes equivale à janela Histórico de Aportes (quanto foi investido em cada mês), por_ativo traz total_aportado, investido_atual (janela Carteira), valor_atual (janela Resumo) e possivel_inconsistencia; alertas_consistencia sinalizam ativos com preço atual implausível — nunca apresente o valor_atual deles como fato. Use para avaliar disciplina de aportes, evolução do investimento e para embasar sugestões de novos aportes sobre o que já foi aportado.",
            inputSchema: z.object({
              desde: z.string().optional().describe("Data inicial AAAA-MM-DD"),
            }),
            execute: async ({ desde }) => {
              let q = supabase.from("aportes").select("data, ticker, quantidade, preco");
              if (desde) q = q.gte("data", desde);
              const { data, error } = await q.order("data", { ascending: true });
              if (error) return { erro: error.message };
              return reconciliarHistoricoAportes(
                (data ?? []).map((a) => ({
                  data: a.data,
                  ticker: a.ticker,
                  quantidade: Number(a.quantidade),
                  preco: Number(a.preco),
                })),
                ativosLinha,
                desde,
              );
            },
          }),
          historicoDividendos: tool({
            description:
              "Histórico completo de proventos recebidos pelo usuário, agregado por mês e por ativo, com média mensal e yield on cost. Use em perguntas sobre renda passiva já recebida, consistência dos dividendos e quais ativos mais pagam.",
            inputSchema: z.object({
              desde: z.string().optional().describe("Data inicial AAAA-MM-DD"),
            }),
            execute: async ({ desde }) => {
              let q = supabase.from("dividendos").select("data, ticker, valor");
              if (desde) q = q.gte("data", desde);
              const { data, error } = await q.order("data", { ascending: true });
              if (error) return { erro: error.message };
              const linhas = (data ?? []).map((d) => ({
                data: d.data,
                ticker: d.ticker,
                valor: Number(d.valor),
              }));
              const porMes = new Map<string, number>();
              const porTicker = new Map<string, number>();
              for (const l of linhas) {
                porMes.set(l.data.slice(0, 7), (porMes.get(l.data.slice(0, 7)) ?? 0) + l.valor);
                porTicker.set(l.ticker, (porTicker.get(l.ticker) ?? 0) + l.valor);
              }
              const total = linhas.reduce((s, l) => s + l.valor, 0);
              const meses = [...porMes.entries()].map(([mes, valor]) => ({
                mes,
                total_recebido: ARRED(valor),
              }));
              const investido = ativosLinha.reduce((s, a) => s + a.quantidade * a.preco_medio, 0);
              const ultimos12 = meses.slice(-12).reduce((s, m) => s + m.total_recebido, 0);
              return {
                total_recebido: ARRED(total),
                media_mensal: meses.length ? ARRED(total / meses.length) : 0,
                recebido_ultimos_12_meses: ARRED(ultimos12),
                yield_on_cost_pct: investido > 0 ? ARRED((ultimos12 / investido) * 100) : 0,
                por_mes: meses,
                por_ativo: [...porTicker.entries()]
                  .map(([ticker, valor]) => ({ ticker, total_recebido: ARRED(valor) }))
                  .sort((a, b) => b.total_recebido - a.total_recebido),
              };
            },
          }),
          calcularTributos: tool({
            description:
              "Calcula a tributação estimada da carteira do usuário: dividendos (isenção para PF em ações/FIIs), JCP (15% na fonte), renda fixa (tabela regressiva 22,5% a 15%) e ganho de capital (ações com isenção até R$ 20 mil/mês, FIIs 20%, ETFs 15%). Use em perguntas sobre impostos, IR, 'quanto vou pagar de imposto', liquidez de IR, DARF.",
            inputSchema: z.object({}),
            execute: async () => {
              const modelo = ativosParaModelo(ativosLinha);
              const total = ativosLinha.reduce((s, a) => s + a.quantidade * a.preco_atual, 0);
              const dividendosEstimados = resumoCarteira(modelo).dividendosEstimados12m;

              const porClasse: Record<
                string,
                { valor: number; rendimento: number; regime: string }
              > = {};
              for (const a of ativosLinha) {
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
                const valor = a.quantidade * a.preco_atual;
                const rend = (valor * a.dy) / 100;
                if (!porClasse[classe]) porClasse[classe] = { valor: 0, rendimento: 0, regime: "" };
                porClasse[classe].valor += valor;
                porClasse[classe].rendimento += rend;
              }

              const rendaFixa = porClasse[CLASSE_POS_FIXADO]?.valor ?? 0;
              const regimeRendaFixa =
                "Tabela regressiva de IR: 22,5% (até 180 dias) → 20% (181-360) → 17,5% (361-720) → 15% (acima de 720 dias). Juros incidem na fonte; aplicações em CDB/LCI/LCA podem ter isenção (LCI/LCA).";
              const proventosAcoes = porClasse["Ações"]?.rendimento ?? 0;
              const proventosEtfsBr = porClasse["ETFs - Brasil"]?.rendimento ?? 0;
              const proventosFiis =
                (porClasse["FIIs"]?.rendimento ?? 0) + (porClasse["BDRs"]?.rendimento ?? 0);
              const proventosRendaFixa = rendaFixa > 0 ? (rendaFixa * 0.12) / 100 : 0;

              return {
                patrimonio_total: Math.round(total),
                dividendos_estimados_12m: Math.round(dividendosEstimados),
                notas_regime_tributario: {
                  dividendos_de_acoes: "Isentos de IR para pessoa física (desde a Lei 9.779/99).",
                  jcp: "Juros sobre capital próprio pagam 15% de imposto de renda na fonte.",
                  proventos_fiis:
                    "Distribuição de FIIs é isenta de IR para PF (nos termos da Lei 8.668/93).",
                  ganho_capital_acoes:
                    "Venda até R$ 20.000/mês isenta; acima disso, 15% sobre o ganho (day trade: 20%).",
                  ganho_capital_fiis:
                    "20% sobre o ganho na venda de cotas de FIIs (sem isenção mensal).",
                  renda_fixa: regimeRendaFixa,
                  etfs: "ETFs de renda variável pagam 15% sobre o ganho de capital; ETFs de renda fixa seguem a tabela regressiva.",
                },
                estimativa_anual: {
                  proventos_acoes_estimados: Math.round(proventosAcoes),
                  proventos_etfs_brasil_estimados: Math.round(proventosEtfsBr),
                  proventos_fiis_estimados: Math.round(proventosFiis),
                  proventos_renda_fixa_estimados: Math.round(proventosRendaFixa),
                  imposto_estimado_anual: Math.round(
                    (proventosFiis + proventosAcoes + proventosEtfsBr) * 0 +
                      proventosRendaFixa * 0.15,
                  ),
                },
                resumo:
                  "Dividendos de ações e proventos de FIIs são isentos para PF. O principal imposto a planejar é o ganho de capital na venda (15% em ações acima de R$ 20 mil/mês e 20% em FIIs) e o IR regressivo da renda fixa. Consulte um contador para apuração detalhada.",
              };
            },
          }),
          benchmarkCarteira: tool({
            description:
              "Compara o retorno de 12 meses da carteira do usuário (ponderado pelo valor atual) com os principais benchmarks: Ibovespa, IFIX, CDI acumulado 12m e S&P 500. Retorna o excedente (pp) da carteira sobre cada benchmark. Use em perguntas do tipo 'como minha carteira está performando frente ao mercado?'.",
            inputSchema: z.object({}),
            execute: async () => {
              try {
                if (ativosLinha.length === 0) {
                  return {
                    retornoCarteira: null,
                    cobertura: 0,
                    valorTotal: 0,
                    benchmarks: [],
                    comparativo: [],
                    aviso: "Carteira vazia.",
                  };
                }
                const { benchmarkCarteira } = await import("@/lib/desempenho-12m.server");
                return await benchmarkCarteira(
                  ativosLinha.map((a) => ({
                    ticker: a.ticker,
                    valor: a.quantidade * a.preco_atual,
                  })),
                );
              } catch (e) {
                return erro(e);
              }
            },
          }),
          desempenhoCarteira12m: tool({
            description:
              "Desempenho de 12 meses de cada ativo da carteira do usuário, para identificar os que mais e menos contribuíram e comparar com benchmarks (Ibovespa, IFIX, CDI).",
            inputSchema: z.object({}),
            execute: async () => {
              try {
                if (ativosLinha.length === 0) return { ativos: [], aviso: "Carteira vazia." };
                const { desempenho12mLote } = await import("@/lib/desempenho-12m.server");
                return await desempenho12mLote(ativosLinha.map((a) => a.ticker));
              } catch (e) {
                return erro(e);
              }
            },
          }),
          compararBenchmark: tool({
            description:
              "Compara o retorno de 12 meses da carteira do usuário com o Ibovespa (mercado brasileiro) e com o IVVB11 (proxy do exterior/S&P 500). Gera nota 0-10 para cada benchmark, o excedente (alpha) vs cada um, a cobertura dos dados e a exposição por moeda. Use para responder 'minha carteira bate o mercado?', 'meu desempenho vs Ibovespa'.",
            inputSchema: z.object({}),
            execute: async () => {
              if (ativosLinha.length === 0) {
                return {
                  carteira_vazia: true,
                  aviso: "Cadastre ativos na carteira para comparar o desempenho.",
                };
              }
              try {
                const { desempenho12mLote } = await import("@/lib/desempenho-12m.server");
                const [lote, ivvbLote] = await Promise.all([
                  desempenho12mLote(ativosLinha.map((a) => a.ticker)),
                  desempenho12mLote(["IVVB11"]),
                ]);
                const retornos = new Map<string, number | null>();
                for (const a of lote.ativos) retornos.set(a.ticker, a.retorno12m);
                const modelo = ativosParaModelo(ativosLinha);
                const carteira = retornoPonderado12m(modelo, retornos);
                const ivvb = ivvbLote.ativos[0]?.retorno12m ?? null;
                const global = montarBenchmarkGlobal(carteira.retornoPct, lote.benchmark, ivvb);
                const moedas = exposicaoPorMoeda(modelo);
                return {
                  periodo: "12 meses",
                  cobertura_dados_pct: ARRED(carteira.coberturaPct * 100),
                  retorno_carteira_pct: global.retornoCarteiraPct,
                  benchmark_ibovespa_pct: global.retornoIbovPct,
                  benchmark_ivvb11_global_pct: global.retornoGlobalPct,
                  excedente_vs_ibovespa_pct: global.excedenteIbovPct,
                  excedente_vs_global_pct: global.excedenteGlobalPct,
                  nota_vs_ibovespa: global.notaIbov,
                  nota_vs_global: global.notaGlobal,
                  exposicao_por_moeda: moedas.map((m) => ({
                    moeda: m.rotulo,
                    pct: ARRED(m.pct * 100),
                    valor: Math.round(m.valor),
                  })),
                  por_ativo: lote.ativos.map((a) => ({
                    ticker: a.ticker,
                    retorno_12m_pct: a.retorno12m,
                    drawdown_12m_pct: a.drawdown12m,
                  })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
          metricasRiscoCarteira: tool({
            description:
              "Métricas de risco da carteira nos últimos 12 meses: volatilidade anualizada, drawdown máximo, Índice de Sharpe, melhor e pior mês, além da diversificação efetiva (HHI e nº de ativos equivalentes) e da exposição por moeda. Use para perguntas sobre risco, volatilidade, drawdown ou diversificação da carteira.",
            inputSchema: z.object({
              retornoLivreRiscoAnualPct: z
                .number()
                .optional()
                .describe("Taxa livre de risco anual em % para o Sharpe (padrão: 11, ~CDI)"),
            }),
            execute: async ({ retornoLivreRiscoAnualPct }) => {
              if (ativosLinha.length === 0) {
                return {
                  carteira_vazia: true,
                  aviso: "Cadastre ativos na carteira para calcular o risco.",
                };
              }
              try {
                const { seriesMensais12m } = await import("@/lib/desempenho-12m.server");
                const { porTicker } = await seriesMensais12m(ativosLinha.map((a) => a.ticker));

                const totalAtual = ativosLinha.reduce(
                  (s, a) => s + a.quantidade * a.preco_atual,
                  0,
                );
                const tamanho = Math.max(0, ...[...porTicker.values()].map((c) => c.length));
                if (tamanho === 0) {
                  return {
                    sem_historico: true,
                    aviso: "Sem histórico mensal suficiente para os ativos da carteira.",
                  };
                }

                const serieR$: number[] = [];
                let cobertura = 0;
                for (let i = 0; i < tamanho; i++) {
                  let soma = 0;
                  for (const a of ativosLinha) {
                    const closes = porTicker.get(a.ticker.toUpperCase());
                    if (!closes || closes.length < tamanho) continue;
                    const atual = a.quantidade * a.preco_atual;
                    soma += (atual / closes[tamanho - 1]) * closes[i];
                    if (i === 0) cobertura += atual;
                  }
                  serieR$.push(soma);
                }

                const risco = metricasDeSerieMensal(serieR$, retornoLivreRiscoAnualPct ?? 11);
                const div = diversificacao(ativosParaModelo(ativosLinha));
                const moedas = exposicaoPorMoeda(ativosParaModelo(ativosLinha));
                return {
                  periodo_em_meses: risco.meses,
                  cobertura_dados_pct: totalAtual > 0 ? ARRED((cobertura / totalAtual) * 100) : 0,
                  volatilidade_anual_pct:
                    risco.volatilidadeAnualPct == null ? null : ARRED(risco.volatilidadeAnualPct),
                  drawdown_maximo_12m_pct:
                    risco.drawdownMaximoPct == null ? null : ARRED(risco.drawdownMaximoPct),
                  sharpe: risco.sharpe == null ? null : ARRED(risco.sharpe),
                  retorno_anualizado_pct:
                    risco.retornoAnualizadoPct == null ? null : ARRED(risco.retornoAnualizadoPct),
                  melhor_mes_pct: risco.melhorMesPct == null ? null : ARRED(risco.melhorMesPct),
                  pior_mes_pct: risco.piorMesPct == null ? null : ARRED(risco.piorMesPct),
                  diversificacao: {
                    indice: div.indice,
                    ativos_efetivos: ARRED(div.numEficaz),
                    hhi: ARRED(div.hhi),
                  },
                  exposicao_por_moeda: moedas.map((m) => ({
                    moeda: m.rotulo,
                    pct: ARRED(m.pct * 100),
                  })),
                };
              } catch (e) {
                return erro(e);
              }
            },
          }),
        };

        const mensagensAparadas = apararHistorico(messages);
        console.info(
          `[chat] run ${userId}: ${messages.length} mensagens, ${mensagensAparadas.reduce((s, m) => s + textoDaMensagem(m).length, 0)} chars após aparar, modelo ${MODELO_CHAT}`,
        );

        let resultado;
        try {
          resultado = streamText({
            model: gateway(MODELO_CHAT),
            system: SISTEMA.replace("{PERFIL}", perfilValido)
              .concat(
                modoCitacoes
                  ? "\n\n### MODE CITAÇÕES ATIVO (obrigatório)\n" +
                      "Sempre que você apresentar uma recomendação, veredito, sugestão de ativo ou plano de ação, inclua citações e justificativas rastreáveis. Regras:\n" +
                      "1. Cite a fonte e a data/periodo de cada numero usado (ex.: 'cotação de 10/08/2026 via cotacao', 'série de 5 anos via historico', 'grade fundamentalista da B3 atualizada em 10/08/2026 via fundamentosAcao').\n" +
                      "2. Para cada recomendação, diga explicitamente quais dados e critérios sustentaram a decisão (ex.: 'DY 8,2% acima da média do setor', 'P/VP 0,85 indica desconto', 'percentil 23% na série histórica').\n" +
                      "3. Não invente números: todo dado citado deve vir de uma ferramenta executada nesta conversa. Se um numero for estimativa ou premissa, rotule como tal.\n" +
                      "4. Sempre que houver uma recomendação (comprar/vender/manter/aportar/rebalancear), encerre com uma seção '📌 Dados e critérios usados' em lista, apontando numero, fonte, data e critério aplicado.\n" +
                      "5. Se um dado vier do contexto da carteira do usuário (patrimônio, aportes, metas), identifique a origem (ex.: 'registro de aportes do usuário')."
                  : "",
              )
              .concat(
                `\n\n### Carteira atual do usuário\n${contexto}\n\n### Metas financeiras do usuário\n${contextoMetas}`,
              )
              .concat(
                (habilidades ?? []).length
                  ? "\n\n### Habilidades aprendidas pelo Gestor IA (ativas)\n" +
                      (habilidades ?? [])
                        .map(
                          (h) =>
                            `#### ${h.titulo}\nO usuário ensinou esta habilidade — siga-a em todas as conversas enquanto estiver ativa.\n${h.instrucao}`,
                        )
                        .join("\n\n")
                  : "",
              )
              .concat(`\n\nData de hoje: ${new Date().toISOString().slice(0, 10)}`),
            messages: await convertToModelMessages(mensagensAparadas),
            tools: ferramentas,
            stopWhen: stepCountIs(50),
            onError: ({ error: erroOriginal }) => {
              const err = erroOriginal as { statusCode?: number } & Error;
              console.error(
                `[chat] erro no stream do gateway (${userId}): status=${err?.statusCode ?? "?"} nome=${err?.name ?? "?"} msg=${err?.message ?? String(erroOriginal)}`,
              );
            },
          });
        } catch (e) {
          console.error(
            `[chat] erro ao criar stream (${userId}): ${e instanceof Error ? e.message : String(e)}`,
          );
          throw e;
        }

        return resultado.toUIMessageStreamResponse({
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
