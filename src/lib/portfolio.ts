export type Categoria = "Ações" | "FIIs" | "ETF Brasil" | "ETF EUA" | "Renda Fixa" | "Tesouro";

export interface Ativo {
  ticker: string;
  nome: string;
  categoria: Categoria;
  quantidade: number;
  precoMedio: number;
  precoAtual: number;
  dy: number;
}

export const carteira: Ativo[] = [
  { ticker: "IPCA+ 2035", nome: "Tesouro IPCA+ 2035", categoria: "Tesouro", quantidade: 42, precoMedio: 3120, precoAtual: 3410, dy: 0 },
  { ticker: "SELIC 2029", nome: "Tesouro Selic 2029", categoria: "Renda Fixa", quantidade: 180, precoMedio: 1180, precoAtual: 1264, dy: 0 },
  { ticker: "CDB BTG", nome: "CDB BTG 112% CDI", categoria: "Renda Fixa", quantidade: 90, precoMedio: 1000, precoAtual: 1094, dy: 0 },
  { ticker: "BOVA11", nome: "iShares Ibovespa", categoria: "ETF Brasil", quantidade: 1200, precoMedio: 108.4, precoAtual: 126.9, dy: 4.1 },
  { ticker: "SMAL11", nome: "iShares Small Caps", categoria: "ETF Brasil", quantidade: 420, precoMedio: 96.2, precoAtual: 101.7, dy: 3.2 },
  { ticker: "IVVB11", nome: "iShares S&P 500", categoria: "ETF EUA", quantidade: 640, precoMedio: 268.5, precoAtual: 332.8, dy: 1.4 },
  { ticker: "WRLD11", nome: "ETF Global Markets", categoria: "ETF EUA", quantidade: 210, precoMedio: 92.7, precoAtual: 104.3, dy: 1.1 },
  { ticker: "HGLG11", nome: "CSHG Logística", categoria: "FIIs", quantidade: 320, precoMedio: 152.3, precoAtual: 161.5, dy: 8.6 },
  { ticker: "KNCR11", nome: "Kinea Rendimentos", categoria: "FIIs", quantidade: 280, precoMedio: 99.4, precoAtual: 104.2, dy: 11.2 },
  { ticker: "ITSA4", nome: "Itaúsa", categoria: "Ações", quantidade: 1500, precoMedio: 8.9, precoAtual: 11.42, dy: 7.4 },
  { ticker: "TAEE11", nome: "Taesa", categoria: "Ações", quantidade: 400, precoMedio: 33.1, precoAtual: 36.8, dy: 9.1 },
];

export const alocacaoIdeal: Record<string, number> = {
  "Pós-fixado": 30,
  "IPCA+": 15,
  "Pré-fixado": 5,
  "ETF Brasil": 20,
  "ETF EUA": 20,
  FIIs: 10,
};

/** Mapeia categorias da carteira para as classes da estratégia Rian Tavares. */
export const classeDoAtivo = (a: Ativo): keyof typeof alocacaoIdeal => {
  if (a.categoria === "Tesouro") return "IPCA+";
  if (a.categoria === "Renda Fixa") return a.ticker.includes("CDB") ? "Pós-fixado" : "Pós-fixado";
  if (a.categoria === "Ações") return "ETF Brasil";
  return a.categoria as keyof typeof alocacaoIdeal;
};

export const valorAtual = (a: Ativo) => a.quantidade * a.precoAtual;
export const valorInvestido = (a: Ativo) => a.quantidade * a.precoMedio;

export const totalAtual = carteira.reduce((s, a) => s + valorAtual(a), 0);
export const totalInvestido = carteira.reduce((s, a) => s + valorInvestido(a), 0);
export const lucroTotal = totalAtual - totalInvestido;
export const rentabilidade = (lucroTotal / totalInvestido) * 100;
export const dividendos12m = carteira.reduce((s, a) => s + (valorAtual(a) * a.dy) / 100, 0);
export const dyCarteira = (dividendos12m / totalAtual) * 100;

export const metaFinanceira = 2_000_000;

export const evolucaoPatrimonio = [
  { mes: "Jan", patrimonio: 862000, aportes: 12000 },
  { mes: "Fev", patrimonio: 889400, aportes: 12000 },
  { mes: "Mar", patrimonio: 902100, aportes: 14000 },
  { mes: "Abr", patrimonio: 938600, aportes: 12000 },
  { mes: "Mai", patrimonio: 961200, aportes: 15000 },
  { mes: "Jun", patrimonio: 979800, aportes: 12000 },
  { mes: "Jul", patrimonio: 1012400, aportes: 18000 },
  { mes: "Ago", patrimonio: 1034900, aportes: 12000 },
  { mes: "Set", patrimonio: 1058300, aportes: 13000 },
  { mes: "Out", patrimonio: 1091700, aportes: 16000 },
  { mes: "Nov", patrimonio: 1118200, aportes: 12000 },
  { mes: "Dez", patrimonio: Math.round(totalAtual), aportes: 14000 },
];

export const dividendosMensais = [
  { mes: "Jan", valor: 4120 },
  { mes: "Fev", valor: 3890 },
  { mes: "Mar", valor: 5240 },
  { mes: "Abr", valor: 4470 },
  { mes: "Mai", valor: 4980 },
  { mes: "Jun", valor: 5610 },
  { mes: "Jul", valor: 5120 },
  { mes: "Ago", valor: 5380 },
  { mes: "Set", valor: 6040 },
  { mes: "Out", valor: 5720 },
  { mes: "Nov", valor: 6210 },
  { mes: "Dez", valor: 6890 },
];

export interface Aporte {
  id: string;
  data: string;
  corretora: string;
  ticker: string;
  categoria: Categoria;
  quantidade: number;
  preco: number;
  taxas: number;
  observacoes?: string;
}

export const aportesIniciais: Aporte[] = [
  { id: "1", data: "2026-07-05", corretora: "BTG Pactual", ticker: "IVVB11", categoria: "ETF EUA", quantidade: 30, preco: 331.4, taxas: 0, observacoes: "Aporte mensal" },
  { id: "2", data: "2026-07-05", corretora: "BTG Pactual", ticker: "BOVA11", categoria: "ETF Brasil", quantidade: 40, preco: 126.2, taxas: 0 },
  { id: "3", data: "2026-06-04", corretora: "Rico", ticker: "HGLG11", categoria: "FIIs", quantidade: 12, preco: 160.9, taxas: 2.5 },
  { id: "4", data: "2026-06-04", corretora: "Tesouro Direto", ticker: "IPCA+ 2035", categoria: "Tesouro", quantidade: 2, preco: 3388, taxas: 0 },
  { id: "5", data: "2026-05-06", corretora: "BTG Pactual", ticker: "ITSA4", categoria: "Ações", quantidade: 200, preco: 11.1, taxas: 1.9 },
];

export interface Meta {
  nome: string;
  alvo: number;
}

export const metas: Meta[] = [
  { nome: "Reserva de Emergência", alvo: 60000 },
  { nome: "100 mil", alvo: 100000 },
  { nome: "250 mil", alvo: 250000 },
  { nome: "500 mil", alvo: 500000 },
  { nome: "1 milhão", alvo: 1000000 },
  { nome: "2 milhões", alvo: 2000000 },
  { nome: "3 milhões", alvo: 3000000 },
];

export const brl = (v: number, digits = 0) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: digits, minimumFractionDigits: digits });

export const pct = (v: number, digits = 1) => `${v > 0 ? "" : ""}${v.toFixed(digits).replace(".", ",")}%`;

export interface ProjecaoInput {
  idadeAtual: number;
  idadeAposentadoria: number;
  patrimonioAtual: number;
  aporteMensal: number;
  aumentoAnual: number;
  rentabilidadeAnual: number;
  inflacaoAnual: number;
  taxaRetirada: number;
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
