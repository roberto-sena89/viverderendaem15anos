export type Categoria =
  | "Ações"
  | "Fundos Imobiliários"
  | "Tesouro Direto"
  | "BDR"
  | "ETF Brasil"
  | "ETF (Exterior)"
  | "Fiagro"
  | "Fundos de Investimentos"
  | "Renda Fixa"
  | "Stocks"
  | "REITs"
  | "Criptomoedas"
  // Valores legados já gravados no banco
  | "FIIs"
  | "ETF EUA"
  | "Tesouro";

export const categorias: Categoria[] = [
  "Ações",
  "Fundos Imobiliários",
  "Tesouro Direto",
  "BDR",
  "ETF Brasil",
  "ETF (Exterior)",
  "Fiagro",
  "Fundos de Investimentos",
  "Renda Fixa",
  "Stocks",
  "REITs",
  "Criptomoedas",
];

export interface Ativo {
  id: string;
  ticker: string;
  nome: string;
  categoria: Categoria;
  quantidade: number;
  precoMedio: number;
  precoAtual: number;
  dy: number;
}

export interface Aporte {
  id: string;
  data: string;
  corretora: string;
  ticker: string;
  categoria: Categoria;
  quantidade: number;
  preco: number;
  taxas: number;
  observacoes?: string | null;
}

export interface Dividendo {
  id: string;
  data: string;
  ticker: string;
  tipo: string;
  valor: number;
}

export interface Meta {
  id: string;
  nome: string;
  alvo: number;
  ordem: number;
}

export interface PlanoConfig {
  idadeAtual: number;
  idadeAposentadoria: number;
  aporteMensal: number;
  aumentoAnual: number;
  rentabilidadeAnual: number;
  inflacaoAnual: number;
  taxaRetirada: number;
}

export const planoPadrao: PlanoConfig = {
  idadeAtual: 32,
  idadeAposentadoria: 47,
  aporteMensal: 3000,
  aumentoAnual: 8,
  rentabilidadeAnual: 11,
  inflacaoAnual: 4.5,
  taxaRetirada: 4,
};

export const alocacaoIdeal: Record<string, number> = {
  "Renda Fixa (Tesouro SELIC, IPCA+,Prefixado)\u00a0CDB, LCI, LCA": 50,
  "ETFs - Brasil": 20,
  "ETFs - Global": 20,
  FIIs: 10,
  "Ações": 0,
  BDRs: 0,
  "Fundos de Investimentos": 0,
  Criptomoedas: 0,
  REITs: 0,
  Stocks: 0,
};

export const CLASSE_POS_FIXADO = "Renda Fixa (Tesouro SELIC, IPCA+,Prefixado)\u00a0CDB, LCI, LCA";

/** Toda renda fixa (Tesouro Direto, CDB, CDI, LCI, LCA, prefixado, IPCA+) usa uma única janela. */

/** Mapeia categorias da carteira para as classes da estratégia de longo prazo. */
export const classeDoAtivo = (a: Ativo): string => {
  switch (a.categoria) {
    case "Tesouro":
    case "Tesouro Direto":
    case "Renda Fixa":
      return CLASSE_POS_FIXADO;
    case "Fundos de Investimentos":
      return "Fundos de Investimentos";
    case "Ações":
      return "Ações";
    case "ETF Brasil":
      return "ETFs - Brasil";
    case "ETF EUA":
    case "ETF (Exterior)":
      return "ETFs - Global";
    case "BDR":
      return "BDRs";
    case "Stocks":
      return "Stocks";
    case "Criptomoedas":
      return "Criptomoedas";
    case "REITs":
      return "REITs";
    case "FIIs":
    case "Fundos Imobiliários":
    case "Fiagro":
      return "FIIs";
    default:
      return CLASSE_POS_FIXADO;
  }
};


export const valorAtual = (a: Ativo) => a.quantidade * a.precoAtual;
export const valorInvestido = (a: Ativo) => a.quantidade * a.precoMedio;

export interface ResumoCarteira {
  totalAtual: number;
  totalInvestido: number;
  lucroTotal: number;
  rentabilidade: number;
  dividendosEstimados12m: number;
  dyCarteira: number;
}

export function resumoCarteira(ativos: Ativo[]): ResumoCarteira {
  const totalAtual = ativos.reduce((s, a) => s + valorAtual(a), 0);
  const totalInvestido = ativos.reduce((s, a) => s + valorInvestido(a), 0);
  const lucroTotal = totalAtual - totalInvestido;
  const dividendosEstimados12m = ativos.reduce((s, a) => s + (valorAtual(a) * a.dy) / 100, 0);
  return {
    totalAtual,
    totalInvestido,
    lucroTotal,
    rentabilidade: totalInvestido > 0 ? (lucroTotal / totalInvestido) * 100 : 0,
    dividendosEstimados12m,
    dyCarteira: totalAtual > 0 ? (dividendosEstimados12m / totalAtual) * 100 : 0,
  };
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Últimos 12 meses (rótulo curto + chave AAAA-MM). */
export function ultimos12Meses(): { chave: string; mes: string }[] {
  const hoje = new Date();
  const lista: { chave: string; mes: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    lista.push({
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      mes: MESES[d.getMonth()],
    });
  }
  return lista;
}

export function dividendosMensais(dividendos: Dividendo[]) {
  return ultimos12Meses().map(({ chave, mes }) => ({
    mes,
    valor: dividendos.filter((d) => d.data.startsWith(chave)).reduce((s, d) => s + d.valor, 0),
  }));
}

export function dividendos12m(dividendos: Dividendo[]) {
  const chaves = new Set(ultimos12Meses().map((m) => m.chave));
  return dividendos.filter((d) => chaves.has(d.data.slice(0, 7))).reduce((s, d) => s + d.valor, 0);
}

/** Evolução do patrimônio reconstruída a partir dos aportes + valor atual da carteira. */
export function evolucaoPatrimonio(aportes: Aporte[], totalAtual: number) {
  const meses = ultimos12Meses();
  const aportesPorMes = meses.map(({ chave, mes }) => ({
    mes,
    chave,
    aportes: aportes
      .filter((a) => a.data.startsWith(chave))
      .reduce((s, a) => s + a.quantidade * a.preco + a.taxas, 0),
  }));

  const totalAportado12m = aportesPorMes.reduce((s, m) => s + m.aportes, 0);
  let patrimonio = Math.max(0, totalAtual - totalAportado12m);

  return aportesPorMes.map((m) => {
    patrimonio += m.aportes;
    return { mes: m.mes, chave: m.chave, patrimonio: Math.round(patrimonio), aportes: Math.round(m.aportes) };
  });
}

export const brl = (v: number, digits = 0) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

export const pct = (v: number, digits = 1) =>
  `${(Number.isFinite(v) ? v : 0).toFixed(digits).replace(".", ",")}%`;

export interface ProjecaoInput extends PlanoConfig {
  patrimonioAtual: number;
}

export interface ProjecaoAno {
  ano: number;
  idade: number;
  patrimonio: number;
  patrimonioReal: number;
  aportado: number;
  rendaPassivaMensal: number;
}

export function projetar(input: ProjecaoInput, ajusteRentabilidade = 0): ProjecaoAno[] {
  const anos = Math.max(1, input.idadeAposentadoria - input.idadeAtual);
  const taxaAnual = (input.rentabilidadeAnual + ajusteRentabilidade) / 100;
  const taxaMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1;
  const anoBase = new Date().getFullYear();

  let patrimonio = input.patrimonioAtual;
  let aporte = input.aporteMensal;
  let aportado = input.patrimonioAtual;
  const linhas: ProjecaoAno[] = [];

  for (let i = 1; i <= anos; i++) {
    for (let m = 0; m < 12; m++) {
      patrimonio = patrimonio * (1 + taxaMensal) + aporte;
      aportado += aporte;
    }
    const patrimonioReal = patrimonio / Math.pow(1 + input.inflacaoAnual / 100, i);
    linhas.push({
      ano: anoBase + i,
      idade: input.idadeAtual + i,
      patrimonio,
      patrimonioReal,
      aportado,
      rendaPassivaMensal: (patrimonio * (input.taxaRetirada / 100)) / 12,
    });
    aporte = aporte * (1 + input.aumentoAnual / 100);
  }

  return linhas;
}

export const metasPadrao = [
  { nome: "Reserva de Emergência", alvo: 60000 },
  { nome: "100 mil", alvo: 100000 },
  { nome: "250 mil", alvo: 250000 },
  { nome: "500 mil", alvo: 500000 },
  { nome: "1 milhão", alvo: 1000000 },
  { nome: "2 milhões", alvo: 2000000 },
  { nome: "3 milhões", alvo: 3000000 },
];

/** Rótulos exibidos para cada categoria, alinhados às classes da carteira. */
export const rotuloCategoria: Record<string, string> = {
  "Ações": "Ações",
  "Fundos Imobiliários": "FIIs (Fundos Imobiliários)",
  "Tesouro Direto": "Tesouro Direto (Renda Fixa)",
  BDR: "BDRs",
  "ETF Brasil": "ETFs - Brasil",
  "ETF (Exterior)": "ETFs - Global",
  Fiagro: "Fiagro",
  "Fundos de Investimentos": "Fundos de Investimentos",
  "Renda Fixa": "Renda Fixa (Tesouro SELIC, IPCA+,Prefixado)\u00a0CDB, LCI, LCA",
  Stocks: "Stocks",
  REITs: "REITs",
  Criptomoedas: "Criptomoedas",
};
