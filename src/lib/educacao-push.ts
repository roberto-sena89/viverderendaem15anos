/**
 * Educação push: detecta lacunas (gaps) entre a situação real do usuário e o
 * plano ideal — reserva de emergência, alocação, metas, aportes — e devolve,
 * para cada gap, conteúdo educativo e ações concretas do plano.
 *
 * Módulo compartilhado (client/server), usado pela tool `educacaoPush` do
 * Técnico IA para transformar diagnóstico em orientação acionável.
 */

import {
  ALOCACAO_POR_PERFIL,
  analisarCarteiraDe,
  type AtivoLinha,
  type PerfilInvestidor,
} from "@/lib/auditoria";
import { CLASSE_POS_FIXADO, classeDoAtivo, planoPadrao } from "@/lib/portfolio";

export type GapId =
  | "carteira_vazia"
  | "reserva_emergencia"
  | "sem_renda_fixa"
  | "concentracao"
  | "poucos_ativos"
  | "sem_acoes"
  | "sem_fiis"
  | "dy_baixo"
  | "sem_metas"
  | "plano_nao_definido"
  | "aporte_irregular";

export interface ItemEducacaoPush {
  id: GapId;
  titulo: string;
  /** Conteúdo educativo: por que essa lacuna importa e o conceito por trás. */
  conceito: string;
  /** Ações concretas do plano, com números quando houver dados. */
  acoes: string[];
}

export interface EntradaEducacaoPush {
  ativos: AtivoLinha[];
  aportes: { data: string; ticker: string; quantidade: number; preco: number }[];
  metas: { nome: string; alvo: number; ordem: number | null }[];
  planoConfig: {
    idadeAtual: number;
    idadeAposentadoria: number;
    aporteMensal: number;
    aumentoAnual: number;
    rentabilidadeAnual: number;
    inflacaoAnual: number;
    taxaRetirada: number;
    patrimonioAtual: number;
  };
  perfil: PerfilInvestidor;
  /** false quando o usuário nunca salvou o plano (usa os padrões). */
  planoSalvo: boolean;
}

export interface RespostaEducacaoPush {
  gaps: ItemEducacaoPush[];
  sem_gaps: boolean;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

function classesDaCarteira(ativos: AtivoLinha[]) {
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
  return { total, porClasse: mapa };
}

/**
 * Detecta os gaps do usuário e devolve conteúdo educativo + ações do plano.
 * Sem argumentos, devolve todos os gaps detectados; com `id`, só o pedido.
 */
export function educacaoPush(entrada: EntradaEducacaoPush, gap?: GapId): RespostaEducacaoPush {
  const { ativos, aportes, metas, planoConfig, perfil, planoSalvo } = entrada;
  const { total, porClasse } = classesDaCarteira(ativos);

  const pctClasse = (classe: string) =>
    total > 0 ? ((porClasse.get(classe) ?? 0) / total) * 100 : 0;
  const temClasse = (classe: string) => (porClasse.get(classe) ?? 0) > 0;

  const ordenados = [...ativos].sort(
    (a, b) => b.quantidade * b.preco_atual - a.quantidade * a.preco_atual,
  );
  const top1 = ordenados[0];
  const top1Pct = total > 0 && top1 ? ((top1.quantidade * top1.preco_atual) / total) * 100 : 0;
  const dy =
    total > 0
      ? (ativos.reduce((s, a) => s + (a.quantidade * a.preco_atual * a.dy) / 100, 0) / total) * 100
      : 0;

  const mesesAporte = new Set(
    aportes.map((a) => a.data.slice(0, 7)).filter((m) => /^\d{4}-\d{2}$/.test(m)),
  );
  const totalAportado = aportes.reduce((s, a) => s + a.quantidade * a.preco, 0);

  const auditoria = analisarCarteiraDe(ativos);
  const alvo = ALOCACAO_POR_PERFIL[perfil];
  const alvoRendaFixa = alvo[CLASSE_POS_FIXADO] ?? 0;

  const coletados = new Map<GapId, ItemEducacaoPush>();

  if (ativos.length === 0) {
    coletados.set("carteira_vazia", {
      id: "carteira_vazia",
      titulo: "Carteira ainda vazia",
      conceito:
        "Começar é a parte mais importante: todo patrimônio é construído por aportes regulares. Antes do primeiro aporte, defina o perfil de risco e o plano de aposentadoria na plataforma.",
      acoes: [
        "Defina seu perfil (conservador, moderado ou agressivo) e o plano de aposentadoria.",
        "Faça o primeiro aporte ainda este mês — constância importa mais que o valor.",
        `Aporte inicial sugerido: a partir de R$ ${fmt(planoConfig.aporteMensal)}/mês.`,
      ],
    });
  }

  if (ativos.length > 0 && pctClasse(CLASSE_POS_FIXADO) < 10) {
    const falta = Math.max(0, Math.round((0.1 - pctClasse(CLASSE_POS_FIXADO) / 100) * total));
    coletados.set("reserva_emergencia", {
      id: "reserva_emergencia",
      titulo: "Reserva de emergência insuficiente",
      conceito:
        "A reserva de emergência é o colchão que evita vender renda variável na pior hora: recomenda-se de 6 a 12 meses de custo de vida em liquidez diária (Tesouro Selic, CDB com liquidez diária ou caixinhas). Ela vem antes de qualquer risco maior.",
      acoes: [
        `Destine R$ ${fmt(falta)} para liquidez diária até chegar a ~10% do patrimônio (base mínima).`,
        "Monte a reserva com Tesouro Selic ou CDB que renda próximo ao CDI e saque imediato.",
        "Só depois de pronta, volte os aportes para o rebalanceamento da estratégia.",
      ],
    });
  }

  if (
    ativos.length > 0 &&
    pctClasse(CLASSE_POS_FIXADO) >= 10 &&
    pctClasse(CLASSE_POS_FIXADO) < alvoRendaFixa
  ) {
    coletados.set("sem_renda_fixa", {
      id: "sem_renda_fixa",
      titulo: "Renda fixa abaixo do alvo do perfil",
      conceito:
        "Renda fixa (Tesouro, CDB, LCI/LCA) é a âncora do plano: reduz a volatilidade, gera previsibilidade e alimenta oportunidades de compra em quedas. Para o seu perfil, a estratégia recomenda uma fatia maior dela.",
      acoes: [
        `Aloque até ${alvoRendaFixa}% em renda fixa, conforme seu perfil ${perfil}.`,
        "Comece com Tesouro Selic (reserva) e Tesouro IPCA+ (proteção da inflação) nas próximas datas de aporte.",
      ],
    });
  }

  if (top1Pct > 30) {
    const limite = 15;
    const acima = Math.max(0, Math.round(((top1Pct - limite) / 100) * total));
    coletados.set("concentracao", {
      id: "concentracao",
      titulo: "Concentração alta em um ativo",
      conceito:
        "Nenhum ativo deveria carregar o destino do seu plano sozinho: posições acima de 10-15% do patrimônio concentram risco setorial e de gestão. Diversificar não reduz só o risco, melhora a previsibilidade da renda passiva.",
      acoes: [
        `${top1?.ticker} pesa ${top1Pct.toFixed(0)}% — evite novas compras e dilua por classe.`,
        `Reduza ${fmt(acima)} em exposição até a posição ficar perto de ${limite}%.`,
        "Direcione os próximos aportes para as classes abaixo do alvo do seu perfil.",
      ],
    });
  }

  if (ativos.length > 0 && ativos.length < 5) {
    coletados.set("poucos_ativos", {
      id: "poucos_ativos",
      titulo: "Carteira com poucos ativos",
      conceito:
        "Com menos de 5 posições, um único evento derruba o resultado inteiro. A diversificação em 10-20 ativos de classes e setores diferentes suaviza o caminho até a independência.",
      acoes: [
        `Amplie de ${ativos.length} para pelo menos 8-10 posições nos próximos meses.`,
        "Priorize ETFs (BOVA11, IVVB11) para ganhar exposição ampla com um só ticker.",
      ],
    });
  }

  if (
    ativos.length > 0 &&
    !temClasse("Ações") &&
    !temClasse("ETFs - Brasil") &&
    !temClasse("ETFs - Global")
  ) {
    coletados.set("sem_acoes", {
      id: "sem_acoes",
      titulo: "Sem exposição a ações/ETFs",
      conceito:
        "Ações e ETFs são o motor de crescimento real do patrimônio no longo prazo. Sem eles, o plano fica refém da renda fixa e perde o potencial de juros compostos que sustenta a independência financeira.",
      acoes: [
        `Inclua ETFs de índice (ex.: BOVA11/IVVB11) até ${alvo["ETFs - Brasil"] ?? 0}% + ${alvo["ETFs - Global"] ?? 0}% conforme o perfil ${perfil}.`,
        "Comece com aportes em ETF de índice, que já entregam diversificação imediata.",
      ],
    });
  }

  if (ativos.length > 0 && !temClasse("FIIs")) {
    coletados.set("sem_fiis", {
      id: "sem_fiis",
      titulo: "Sem FIIs gerando renda recorrente",
      conceito:
        "Fundos imobiliários distribuem rendimentos mensais isentos de IR para pessoa física e ajudam a construir renda passiva com previsibilidade, complementando a renda vinda de ações.",
      acoes: [
        `Aloque cerca de ${alvo.FIIs ?? 10}% em FIIs de tijolo e papel (ex.: HGLG11, MXRF11).`,
        "Reinvista os rendimentos mensais para acelerar o efeito de juros compostos.",
      ],
    });
  }

  if (ativos.length > 0 && dy < 2) {
    coletados.set("dy_baixo", {
      id: "dy_baixo",
      titulo: "Renda passiva ainda tímida",
      conceito:
        "O dividend yield da carteira está baixo (${dy.toFixed(1)}%), ou seja, os proventos ainda sustentam pouco do custo de vida. A renda passiva cresce com o reinvestimento e a maturação de posições em FIIs e ações boas pagadoras.",
      acoes: [
        "Aumente a exposição a ativos de maior DY (FIIs, IDIV) sem sacrificar a diversificação.",
        "Configure o reinvestimento automático dos proventos nos próximos meses.",
      ],
    });
  }

  if (metas.length === 0) {
    coletados.set("sem_metas", {
      id: "sem_metas",
      titulo: "Sem metas financeiras cadastradas",
      conceito:
        "Metas (reserva, primeiro milhão, aposentadoria) transformam o plano em alvos mensuráveis e mantêm a disciplina de aporte. Sem elas, é difícil saber se os aportes estão no ritmo certo.",
      acoes: [
        "Cadastre metas na aba Metas: reserva de emergência, primeiro R$ 100 mil, primeiro milhão.",
        "Defina o alvo de independência: cerca de 25× o gasto anual (regra dos 4%).",
      ],
    });
  }

  if (!planoSalvo) {
    coletados.set("plano_nao_definido", {
      id: "plano_nao_definido",
      titulo: "Plano de aposentadoria não configurado",
      conceito:
        "O plano salvo ainda usa os valores padrão da plataforma. Um plano real considera sua idade, o quanto você quer de renda na aposentadoria e o aporte que consegue manter todo mês.",
      acoes: [
        "Preencha idade atual, idade-alvo de aposentadoria e aporte mensal realista em Plano.",
        "Rode o simulador de independência para ver a data estimada e ajustar o aporte.",
      ],
    });
  }

  if (aportes.length === 0) {
    coletados.set("aporte_irregular", {
      id: "aporte_irregular",
      titulo: "Nenhum aporte registrado",
      conceito:
        "Aporte é o combustível do plano: mesmo valores modestos, se constantes, vencem a renda fixa e geram o efeito de juros compostos que sustenta a independência.",
      acoes: [
        `Registre o primeiro aporte — o plano prevê R$ ${fmt(planoConfig.aporteMensal)}/mês.`,
        "Agende o aporte no dia do salário e registre na plataforma para acompanhar a constância.",
      ],
    });
  } else if (mesesAporte.size < 3 && totalAportado > 0) {
    coletados.set("aporte_irregular", {
      id: "aporte_irregular",
      titulo: "Disciplina de aporte recente",
      conceito:
        "O poder do juro composto vem da constância: aportes que param e recomeçam perdem o efeito de bola de neve. A média mensal é o termômetro da disciplina.",
      acoes: [
        `Mantenha ao menos R$ ${fmt(planoConfig.aporteMensal)}/mês por ${fmt(12)} meses seguidos.`,
        "Acompanhe a constância na aba de histórico de aportes e evite pular meses.",
      ],
    });
  }

  const todas = [...coletados.values()].sort((a, b) => ordemGap(a.id) - ordemGap(b.id));
  const gaps = gap ? todas.filter((g) => g.id === gap) : todas;
  return { gaps, sem_gaps: gaps.length === 0 };
}

const ORDEM: GapId[] = [
  "carteira_vazia",
  "reserva_emergencia",
  "sem_renda_fixa",
  "sem_acoes",
  "sem_fiis",
  "concentracao",
  "poucos_ativos",
  "dy_baixo",
  "plano_nao_definido",
  "sem_metas",
  "aporte_irregular",
];

const ordemGap = (id: GapId) => {
  const i = ORDEM.indexOf(id);
  return i === -1 ? ORDEM.length : i;
};

export const GAPS_VALIDOS = ORDEM as readonly GapId[];
