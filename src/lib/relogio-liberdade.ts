/**
 * Relógio da Liberdade — a joia imaginativa do Nível 3.
 *
 * Converte a jornada até a independência financeira em um objeto emocional:
 * um mostrador analógico cujo ponteiro avança conforme a renda passiva cobre
 * o custo de vida, e que "compra dias de liberdade" a cada dividendo.
 *
 * Tudo aqui é função pura (testável) — o componente só renderiza.
 */

import { resumoCarteira, type Ativo, type Dividendo, type PlanoConfig } from "@/lib/portfolio";

/** Meta de renda mensal padrão (R$) quando o usuário ainda não definiu a dela. */
export const OBJETIVO_RENDA_PADRAO = 25_000;

export type CorRelogio = "vermelho" | "laranja" | "verde" | "dourado";

export interface CorRelogioDef {
  cor: CorRelogio;
  /** Cor principal do mostrador (hex para o SVG). */
  hex: string;
  /** Rótulo humano do estágio. */
  rotulo: string;
  /** Mensagem emocional exibida sob o relógio. */
  mensagem: string;
}

const ESTAGIOS: Record<CorRelogio, CorRelogioDef> = {
  vermelho: {
    cor: "vermelho",
    hex: "#EF4444",
    rotulo: "Despertar",
    mensagem: "Todo grande patrimônio começa pequeno. O ponteiro já se moveu.",
  },
  laranja: {
    cor: "laranja",
    hex: "#F97316",
    rotulo: "Impulso",
    mensagem: "Você está construindo impulso. Cada aporte adianta sua liberdade.",
  },
  verde: {
    cor: "verde",
    hex: "#22C55E",
    rotulo: "Acumulação",
    mensagem: "Sua renda passiva já cobre parte dos seus dias. Continue acelerando.",
  },
  dourado: {
    cor: "dourado",
    hex: "#F5A623",
    rotulo: "Liberdade",
    mensagem: "Sua renda passiva cobre todo o seu custo de vida. Bem-vindo à liberdade!",
  },
};

export function estagioDoProgresso(progresso: number): CorRelogioDef {
  if (progresso >= 100) return ESTAGIOS.dourado;
  if (progresso >= 66) return ESTAGIOS.verde;
  if (progresso >= 33) return ESTAGIOS.laranja;
  return ESTAGIOS.vermelho;
}

export interface RelogioLiberdade {
  /** Quanto da meta de renda a renda passiva atual já cobre (0–100+). */
  progresso: number;
  /** Renda passiva mensal estimada hoje (R$). */
  rendaPassivaMensal: number;
  /** Meta de renda mensal (R$) usada no mostrador. */
  objetivoRendaMensal: number;
  /** Dias de liberdade "comprados" por mês (0–30+; 30 = mês inteiro). */
  diasDeLiberdade: number;
  /** Rótulo e cor do estágio atual. */
  estagio: CorRelogioDef;
  /** Mensagem curta com o número de dias comprados. */
  fraseDias: string;
  /** Histórico: proventos dos últimos 12 meses agregados por mês. */
  historico: { rotulo: string; dias: number; valor: number }[];
  /** O melhor mês do histórico (para a frase motivacional). */
  melhorMes: { rotulo: string; dias: number; valor: number } | null;
  /** Total de dias de liberdade já comprados (soma dos últimos 12 meses). */
  totalDiasAno: number;
}

function rotuloMes(ano: number, mes: number): string {
  const NOMES = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${NOMES[mes]}/${String(ano).slice(2)}`;
}

export function calcularRelogioLiberdade(
  ativos: Ativo[],
  dividendos: Dividendo[],
  objetivoRendaMensal = OBJETIVO_RENDA_PADRAO,
): RelogioLiberdade {
  const resumo = resumoCarteira(ativos);
  const rendaPassivaMensal = resumo.dividendosEstimados12m / 12;
  const diasDeLiberdade =
    objetivoRendaMensal > 0 ? (rendaPassivaMensal / objetivoRendaMensal) * 30 : 0;
  const progresso = objetivoRendaMensal > 0 ? (rendaPassivaMensal / objetivoRendaMensal) * 100 : 0;

  // Agrega proventos reais por mês (últimos 12 meses).
  const hoje = new Date();
  const porMes = new Map<string, { rotulo: string; valor: number; chave: number }>();
  for (const d of dividendos) {
    const data = new Date(d.data);
    if (Number.isNaN(data.getTime())) continue;
    const diffAnos = (hoje.getTime() - data.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (diffAnos < -0.01 || diffAnos > 1.01) continue; // só últimos 12 meses
    const chave = data.getFullYear() * 100 + data.getMonth();
    const atual = porMes.get(String(chave)) ?? {
      rotulo: rotuloMes(data.getFullYear(), data.getMonth()),
      valor: 0,
      chave,
    };
    atual.valor += Number(d.valor) || 0;
    porMes.set(String(chave), atual);
  }

  const historico = [...porMes.values()]
    .sort((a, b) => b.chave - a.chave)
    .slice(0, 12)
    .map((m) => ({
      rotulo: m.rotulo,
      valor: m.valor,
      dias: objetivoRendaMensal > 0 ? (m.valor / objetivoRendaMensal) * 30 : 0,
    }));

  const melhorMes = historico.reduce<RelogioLiberdade["melhorMes"]>(
    (melhor, m) => (melhor === null || m.dias > melhor.dias ? { ...m } : melhor),
    null,
  );

  const totalDiasAno = historico.reduce((s, m) => s + m.dias, 0);
  const estagio = estagioDoProgresso(progresso);

  const fraseDias =
    diasDeLiberdade >= 30
      ? `Sua renda passiva já compra o mês inteiro de liberdade.`
      : diasDeLiberdade >= 1
        ? `Sua renda passiva compra ${diasDeLiberdade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${diasDeLiberdade >= 2 ? "dias" : "dia"} de liberdade por mês.`
        : `Você ainda está comprando seus primeiros dias de liberdade.`;

  return {
    progresso,
    rendaPassivaMensal,
    objetivoRendaMensal,
    diasDeLiberdade,
    estagio,
    fraseDias,
    historico,
    melhorMes,
    totalDiasAno,
  };
}

/** Projeção: em quantos anos a renda passiva atinge a meta (usando o plano). */
export function anosAteLiberdade(
  ativos: Ativo[],
  plano: PlanoConfig,
  objetivoRendaMensal = OBJETIVO_RENDA_PADRAO,
  ajusteRentabilidade = 0,
): number | null {
  const resumo = resumoCarteira(ativos);
  if (resumo.dividendosEstimados12m / 12 >= objetivoRendaMensal) return 0;

  // Estima o DY futuro pela carteira atual (constante no plano).
  const dy = resumo.totalAtual > 0 ? (resumo.dividendosEstimados12m / resumo.totalAtual) * 100 : 0;
  if (dy <= 0 || resumo.totalAtual <= 0) return null;

  const anos = Math.max(1, plano.idadeAposentadoria - plano.idadeAtual);
  const taxaAnual = (plano.rentabilidadeAnual + ajusteRentabilidade) / 100;
  const taxaMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1;

  let patrimonio = resumo.totalAtual;
  let aporte = plano.aporteMensal;
  const aumentoMensal = Math.pow(1 + plano.aumentoAnual / 100, 1 / 12) - 1;

  // Renda passiva mensal = patrimônio × DY / 12. Queremos que ≥ objetivo.
  for (let i = 1; i <= anos * 12; i++) {
    patrimonio = patrimonio * (1 + taxaMensal) + aporte;
    aporte = aporte * (1 + aumentoMensal);
    const renda = (patrimonio * (dy / 100)) / 12;
    if (renda >= objetivoRendaMensal) return i / 12;
  }
  return null;
}
