import { projetar, type ProjecaoAno, type ProjecaoInput } from "@/lib/portfolio";

export interface Cenario {
  id: string;
  nome: string;
  criadoEm: string;
  input: ProjecaoInput;
  objetivoRenda: number;
}

export interface ResumoCenario {
  cenario: Cenario;
  linhas: ProjecaoAno[];
  patrimonioFinal: number;
  patrimonioReal: number;
  rendaPassiva: number;
  totalAportado: number;
  patrimonioNecessario: number;
  anoIndependencia: number | null;
  idadeIndependencia: number | null;
  progresso: number;
}

const CHAVE = "vr15:cenarios-planejador";

export const CORES_CENARIO = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export const CORES_CENARIO_PDF = ["#006B3C", "#1E88E5", "#F5A623", "#8E24AA", "#D32F2F"];

export const LIMITE_CENARIOS = 5;

export function listarCenarios(): Cenario[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const dados = bruto ? (JSON.parse(bruto) as Cenario[]) : [];
    return Array.isArray(dados) ? dados.slice(0, LIMITE_CENARIOS) : [];
  } catch {
    return [];
  }
}

export function persistirCenarios(cenarios: Cenario[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, JSON.stringify(cenarios.slice(0, LIMITE_CENARIOS)));
}

export function criarCenario(nome: string, input: ProjecaoInput, objetivoRenda: number): Cenario {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nome: nome.trim().slice(0, 40) || "Cenário sem nome",
    criadoEm: new Date().toISOString(),
    input: { ...input },
    objetivoRenda,
  };
}

export function resumirCenario(cenario: Cenario): ResumoCenario {
  const linhas = projetar(cenario.input);
  const final = linhas[linhas.length - 1];
  const taxa = cenario.input.taxaRetirada / 100;
  const patrimonioNecessario = taxa > 0 ? (cenario.objetivoRenda * 12) / taxa : Number.POSITIVE_INFINITY;
  const alvo = linhas.find((l) => l.patrimonio >= patrimonioNecessario) ?? null;

  return {
    cenario,
    linhas,
    patrimonioFinal: final.patrimonio,
    patrimonioReal: final.patrimonioReal,
    rendaPassiva: final.rendaPassivaMensal,
    totalAportado: final.aportado,
    patrimonioNecessario,
    anoIndependencia: alvo?.ano ?? null,
    idadeIndependencia: alvo?.idade ?? null,
    progresso: Math.min(100, (final.patrimonio / patrimonioNecessario) * 100),
  };
}

export function serieComparativa(resumos: ResumoCenario[]) {
  const anos = new Set<number>();
  resumos.forEach((r) => r.linhas.forEach((l) => anos.add(l.ano)));
  return [...anos]
    .sort((a, b) => a - b)
    .map((ano) => {
      const ponto: Record<string, number | null> & { ano: number } = { ano };
      resumos.forEach((r) => {
        const linha = r.linhas.find((l) => l.ano === ano);
        ponto[r.cenario.id] = linha ? Math.round(linha.patrimonio) : null;
      });
      return ponto;
    });
}

/** Variação percentual de `valor` em relação à `base` (null quando não comparável). */
export function variacao(valor: number, base: number): number | null {
  if (!Number.isFinite(valor) || !Number.isFinite(base) || base === 0) return null;
  return ((valor - base) / Math.abs(base)) * 100;
}

/**
 * Elege o cenário vencedor: chega primeiro à independência financeira; em caso
 * de empate (ou nenhum chegar), o maior patrimônio em valor de hoje.
 */
export function indiceVencedor(resumos: ResumoCenario[]): number {
  if (resumos.length < 2) return resumos.length - 1;
  let melhor = 0;
  for (let i = 1; i < resumos.length; i++) {
    const a = resumos[i];
    const b = resumos[melhor];
    const anoA = a.anoIndependencia ?? Number.POSITIVE_INFINITY;
    const anoB = b.anoIndependencia ?? Number.POSITIVE_INFINITY;
    if (anoA < anoB || (anoA === anoB && a.patrimonioReal > b.patrimonioReal)) melhor = i;
  }
  return melhor;
}

export interface LinhaAnoAAno {
  ano: number;
  idade: number | null;
  valores: { id: string; patrimonio: number | null; variacao: number | null; crescimento: number | null }[];
}

/**
 * Evolução ano a ano com a diferença percentual de cada cenário em relação ao
 * cenário base (`indiceBase`) e o crescimento sobre o ano anterior.
 */
export function evolucaoAnoAAno(resumos: ResumoCenario[], indiceBase = 0): LinhaAnoAAno[] {
  const anos = new Set<number>();
  resumos.forEach((r) => r.linhas.forEach((l) => anos.add(l.ano)));
  const base = resumos[indiceBase];

  return [...anos]
    .sort((a, b) => a - b)
    .map((ano) => {
      const linhaBase = base?.linhas.find((l) => l.ano === ano) ?? null;
      return {
        ano,
        idade: linhaBase?.idade ?? null,
        valores: resumos.map((r) => {
          const atual = r.linhas.find((l) => l.ano === ano) ?? null;
          const anterior = r.linhas.find((l) => l.ano === ano - 1) ?? null;
          return {
            id: r.cenario.id,
            patrimonio: atual?.patrimonio ?? null,
            variacao: atual && linhaBase ? variacao(atual.patrimonio, linhaBase.patrimonio) : null,
            crescimento: atual && anterior ? variacao(atual.patrimonio, anterior.patrimonio) : null,
          };
        }),
      };
    });
}
