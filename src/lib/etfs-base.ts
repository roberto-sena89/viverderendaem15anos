/**
 * Tipos e classificações compartilhados da grade de ETFs da B3.
 * Arquivo client-safe: usado pelo agregador no servidor e pela UI.
 */

export const CLASSES_ETF = [
  "Ações Brasil",
  "Internacional",
  "Renda Fixa",
  "Cripto",
  "Commodities",
  "Setorial/Temático",
] as const;

export type ClasseEtf = (typeof CLASSES_ETF)[number];

/** Cores fixas por classe de exposição (badges da grade). */
export const COR_CLASSE_ETF: Record<ClasseEtf, string> = {
  "Ações Brasil": "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Internacional: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  "Renda Fixa": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Cripto: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  Commodities: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "Setorial/Temático": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25",
};

export type MercadoEtf = "nacional" | "internacional";

/**
 * Classifica o ETF pela exposição, a partir do ticker e do nome do fundo.
 * A ordem das checagens importa: cripto e renda fixa antes de índices de ações.
 */
export function classificarEtf(ticker: string, nome: string): ClasseEtf {
  const t = ticker.toUpperCase();
  const n = `${t} ${nome}`.toLowerCase();

  if (/bitcoin|ethereum|cripto|crypto|blockchain|solana|web3|digital asset/.test(n))
    return "Cripto";
  if (
    /tesouro|selic|ima-b|imab|irf-m|irfm|ipca|prefixad|debentur|renda fixa|cdi|juros|treasury|bond|inflaç/.test(
      n,
    )
  ) {
    return "Renda Fixa";
  }
  if (/ouro|gold|prata|silver|commodit|petróleo|petroleo|agro commodities/.test(n))
    return "Commodities";
  if (
    /s&p|sp 500|sp500|nasdaq|msci|world|global|eua|estados unidos|china|europa|japão|japao|emerg|internacional|dólar|dolar|bdr|latam|índia|india|reit/.test(
      n,
    )
  ) {
    return "Internacional";
  }
  if (/ibovespa|ibov|ibrx|brasil 100|small cap|smal|dividend|mid.?large|bova|amplo/.test(n)) {
    return "Ações Brasil";
  }
  if (
    /financ|tecnolog|esg|governanç|governanc|sustentab|energia|consumo|saúde|saude|imobiliár|imobiliar|setorial|utilities|banc/.test(
      n,
    )
  ) {
    return "Setorial/Temático";
  }
  return "Ações Brasil";
}

/** Uma linha da grade de ETFs (preço ao vivo + indicadores diários). */
export type LinhaEtf = {
  ticker: string;
  nome: string;
  gestora: string | null;
  classe: ClasseEtf;
  mercado: MercadoEtf;
  pais: string | null;

  preco: number | null;
  fechamentoAnterior: number | null;
  variacao: number | null;
  variacaoPercent: number | null;
  volume: number | null;

  capitalizacao: number | null;
  dy12: number | null;
  dy5a: number | null;
  cotistas: number | null;

  var30d: number | null;
  var12m: number | null;
  var24m: number | null;
  var60m: number | null;

  /** true quando o preço veio da base diária e não da cotação ao vivo. */
  precoDefasado: boolean;
};

export type ResumoIbovEtf = {
  valor: number | null;
  variacaoPercent: number | null;
  variacao12m: number | null;
  spark: number[];
};

export type RespostaEtfs = {
  linhas: LinhaEtf[];
  ibovespa: ResumoIbovEtf | null;
  atualizadoEm: string;
  baseEm: string | null;
  parcial: boolean;
};

/** Gestora inferida a partir do nome do fundo (iShares, It Now, Trend…). */
export function gestoraDoNome(nome: string): string | null {
  const marcas = [
    "iShares",
    "It Now",
    "Trend",
    "Investo",
    "Hashdex",
    "Buenavista",
    "Mirae",
    "Global X",
    "Vanguard",
    "SPDR",
    "Schwab",
    "Invesco",
    "BTG Pactual",
    "Bradesco",
    "Itaú",
    "Santander",
    "XP",
    "Empiricus",
    "Rico",
    "Genial",
    "Sparta",
    "Valora",
    "JPMorgan",
    "Nu Asset",
    "Vanguarda",
  ];
  const achou = marcas.find((m) => nome.toLowerCase().includes(m.toLowerCase()));
  return achou ?? null;
}

/** Nome curto e legível do fundo, sem os sufixos jurídicos repetitivos. */
export function nomeFundo(l: { nome: string; ticker: string }): string {
  const limpo = l.nome
    .replace(
      /\s*\b(fundo de investimento|fundo|de índice|de indice|índice|indice|ETF|responsabilidade limitada|ltda\.?|—)\b\.?/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return (limpo || l.nome || l.ticker).slice(0, 46);
}
