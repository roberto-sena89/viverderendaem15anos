/**
 * Catálogo de índices e taxas de referência acompanhados na aba "Índices".
 *
 * Diferente das grades de Ações/FIIs/ETFs, aqui os itens não são negociáveis:
 * índices de bolsa têm valor em pontos e taxas macroeconômicas (CDI, Selic,
 * IPCA) têm valor percentual divulgado em frequência própria.
 */

export type CategoriaIndice =
  "taxas" | "brasil" | "setoriais" | "dividendos" | "governanca" | "bdrs" | "internacionais";

export type TipoIndice = "bolsa" | "taxa";

export type DefIndice = {
  codigo: string;
  nome: string;
  categoria: CategoriaIndice;
  tipo: TipoIndice;
  /** Símbolos candidatos no provedor de cotações (tentados em ordem). */
  simbolos?: string[];
  /** Série do SGS/Banco Central para as taxas de referência. */
  sgs?: number;
  descricao: string;
};

export type LinhaIndice = {
  codigo: string;
  nome: string;
  categoria: CategoriaIndice;
  tipo: TipoIndice;
  descricao: string;
  /** Pontos (índices) ou percentual (taxas). */
  valor: number | null;
  unidade: "pontos" | "%";
  variacaoDiaPercent: number | null;
  variacao12m: number | null;
  spark: number[];
  /** Data da última divulgação oficial (apenas taxas). */
  divulgadoEm: string | null;
  extras: { rotulo: string; valor: string }[];
  fonte: string;
};

export type RespostaIndices = {
  linhas: LinhaIndice[];
  atualizadoEm: string;
  parcial: boolean;
};

export const CATEGORIAS_INDICE: {
  id: CategoriaIndice;
  rotulo: string;
  cor: string;
}[] = [
  { id: "taxas", rotulo: "Taxas de Referência (Brasil)", cor: "bg-amber-500/15 text-amber-500" },
  {
    id: "brasil",
    rotulo: "Principais Índices da Bolsa Brasileira",
    cor: "bg-primary/15 text-primary",
  },
  { id: "setoriais", rotulo: "Índices Setoriais B3", cor: "bg-primary/15 text-primary" },
  {
    id: "dividendos",
    rotulo: "Dividendos e FIIS",
    cor: "bg-primary/15 text-primary",
  },
  { id: "governanca", rotulo: "Governança e Sustentabilidade", cor: "bg-primary/15 text-primary" },
  { id: "bdrs", rotulo: "BDRs", cor: "bg-sky-500/15 text-sky-400" },
  { id: "internacionais", rotulo: "Índices Internacionais", cor: "bg-sky-500/15 text-sky-400" },
];

const b3 = (
  codigo: string,
  nome: string,
  categoria: CategoriaIndice,
  descricao: string,
): DefIndice => ({
  codigo,
  nome,
  categoria,
  tipo: "bolsa",
  simbolos: [`^${codigo}`, `${codigo}.SA`, `^${codigo}.SA`],
  descricao,
});

export const INDICES: DefIndice[] = [
  // Taxas de referência ------------------------------------------------
  {
    codigo: "CDI",
    nome: "Certificado de Depósito Interbancário",
    categoria: "taxas",
    tipo: "taxa",
    sgs: 4389,
    descricao:
      "Taxa média dos empréstimos entre bancos, referência da renda fixa pós-fixada. Divulgada diariamente pelo Banco Central.",
  },
  {
    codigo: "SELIC",
    nome: "Taxa Selic (meta Copom)",
    categoria: "taxas",
    tipo: "taxa",
    sgs: 432,
    descricao:
      "Taxa básica de juros da economia, definida pelo Copom a cada 45 dias. Baliza toda a renda fixa brasileira.",
  },
  {
    codigo: "IPCA",
    nome: "Índice de Preços ao Consumidor Amplo",
    categoria: "taxas",
    tipo: "taxa",
    sgs: 433,
    descricao:
      "Inflação oficial do Brasil, medida pelo IBGE e divulgada mensalmente. Referência dos títulos IPCA+.",
  },

  // Bolsa brasileira ----------------------------------------------------
  {
    codigo: "IBOV",
    nome: "Ibovespa",
    categoria: "brasil",
    tipo: "bolsa",
    simbolos: ["^BVSP"],
    descricao: "Principal índice da B3, formado pelas ações mais negociadas do mercado brasileiro.",
  },
  b3(
    "IBRA",
    "Índice Brasil Amplo",
    "brasil",
    "Índice amplo com praticamente todas as ações líquidas da B3.",
  ),
  b3(
    "IBXX",
    "Índice Brasil (IBrX 100)",
    "brasil",
    "As 100 ações mais negociadas da B3, ponderadas pelo valor de mercado do free float.",
  ),
  b3("IBXL", "Brasil 50 (IBrX 50)", "brasil", "As 50 ações mais líquidas da bolsa brasileira."),
  b3("MLCX", "Mid-Large Cap", "brasil", "Empresas de maior capitalização listadas na B3."),
  b3(
    "SMLL",
    "Small Cap",
    "brasil",
    "Empresas de menor capitalização, com maior potencial de crescimento e volatilidade.",
  ),
  b3(
    "IVBX",
    "Valor BM&FBovespa (IVBX-2)",
    "brasil",
    "Ações bem conceituadas pelos investidores, fora das 10 mais negociadas.",
  ),

  // Setoriais -----------------------------------------------------------
  b3(
    "IEEX",
    "Energia Elétrica (IEE)",
    "setoriais",
    "Desempenho das empresas do setor de energia elétrica.",
  ),
  b3("INDX", "Setor Industrial", "setoriais", "Empresas representativas da indústria brasileira."),
  b3("ICON", "Consumo", "setoriais", "Empresas de consumo cíclico e não cíclico."),
  b3(
    "IMOB",
    "Imobiliário",
    "setoriais",
    "Construção civil, intermediação e exploração de imóveis.",
  ),
  b3("IFNC", "Financeiro", "setoriais", "Bancos, seguradoras e serviços financeiros."),
  b3(
    "IMAT",
    "Materiais Básicos",
    "setoriais",
    "Mineração, siderurgia, papel e celulose e químicos.",
  ),
  b3(
    "UTIL",
    "Utilidade Pública",
    "setoriais",
    "Energia, saneamento e gás — setores regulados e defensivos.",
  ),

  // Dividendos e FIIs ----------------------------------------------------
  b3(
    "IDIV",
    "Índice Dividendos",
    "dividendos",
    "Ações que mais remuneram acionistas via dividendos e JCP.",
  ),
  {
    codigo: "IFIX",
    nome: "Índice de FIIS",
    categoria: "dividendos",
    tipo: "bolsa",
    simbolos: ["IFIX.SA", "^IFIX"],
    descricao:
      "Referência do mercado de FIIs, reunindo os fundos imobiliários mais líquidos da B3.",
  },

  // Governança e sustentabilidade ---------------------------------------
  b3(
    "IGCX",
    "Governança Corporativa (IGC)",
    "governanca",
    "Empresas com práticas diferenciadas de governança corporativa.",
  ),
  b3(
    "IGCT",
    "Governança Corporativa Trade",
    "governanca",
    "Recorte do IGC com filtro adicional de liquidez.",
  ),
  b3(
    "IGNM",
    "Governança Corporativa Novo Mercado",
    "governanca",
    "Somente empresas listadas no segmento Novo Mercado.",
  ),
  b3(
    "ITAG",
    "Tag Along Diferenciado",
    "governanca",
    "Empresas que oferecem tag along acima do mínimo legal aos minoritários.",
  ),
  b3(
    "ISEE",
    "Sustentabilidade Empresarial (ISE)",
    "governanca",
    "Empresas com melhor desempenho em sustentabilidade e responsabilidade corporativa.",
  ),
  b3(
    "ICO2",
    "Carbono Eficiente",
    "governanca",
    "Empresas com boas práticas de transparência e eficiência em emissões de carbono.",
  ),

  // BDRs -----------------------------------------------------------------
  b3(
    "BDRX",
    "BDRs Não Patrocinados",
    "bdrs",
    "Cesta de BDRs não patrocinados negociados na B3, exposição a empresas estrangeiras.",
  ),

  // Internacionais --------------------------------------------------------
  {
    codigo: "SPX",
    nome: "S&P 500",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^GSPC"],
    descricao:
      "As 500 maiores companhias listadas nos EUA — principal termômetro do mercado americano.",
  },
  {
    codigo: "OEX",
    nome: "S&P 100",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^OEX"],
    descricao: "As 100 maiores empresas do S&P 500 com opções listadas.",
  },
  {
    codigo: "DJI",
    nome: "Dow Jones Industrial Average",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^DJI"],
    descricao: "30 grandes companhias industriais e de serviços dos EUA.",
  },
  {
    codigo: "DJA",
    nome: "Dow Jones Composite Average",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^DJA"],
    descricao: "Composição do Dow industrial, de transportes e utilidades.",
  },
  {
    codigo: "DJT",
    nome: "Dow Jones Transportation",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^DJT"],
    descricao: "Empresas de transporte e logística dos EUA.",
  },
  {
    codigo: "DJU",
    nome: "Dow Jones Utility",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^DJU"],
    descricao: "Concessionárias de serviços públicos americanas.",
  },
  {
    codigo: "NDX",
    nome: "Nasdaq 100",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^NDX"],
    descricao: "As 100 maiores empresas não financeiras da Nasdaq, com peso em tecnologia.",
  },
  {
    codigo: "IXIC",
    nome: "Nasdaq Composite",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^IXIC"],
    descricao: "Todas as ações listadas na Nasdaq.",
  },
  {
    codigo: "NYA",
    nome: "NYSE Composite",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^NYA"],
    descricao: "Todas as ações listadas na Bolsa de Nova York.",
  },
  {
    codigo: "XAX",
    nome: "NYSE American Composite",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^XAX"],
    descricao: "Empresas de menor porte listadas na NYSE American.",
  },
  {
    codigo: "RUT",
    nome: "Russell 2000",
    categoria: "internacionais",
    tipo: "bolsa",
    simbolos: ["^RUT"],
    descricao: "As 2.000 small caps americanas — referência de risco doméstico nos EUA.",
  },
];

/** Índices exibidos na faixa de destaque no topo da grade. */
export const DESTAQUES_INDICE = ["IBOV", "IFIX", "CDI", "SELIC"];

/** Ordem de relevância usada no ranking "Mais buscados". */
export const MAIS_BUSCADOS = [
  "IBOV",
  "CDI",
  "SELIC",
  "IPCA",
  "IFIX",
  "SPX",
  "IXIC",
  "NDX",
  "DJI",
  "SMLL",
  "IDIV",
  "IBXX",
];

export const rotuloCategoria = (id: CategoriaIndice) =>
  CATEGORIAS_INDICE.find((c) => c.id === id)?.rotulo ?? id;

export const corCategoria = (id: CategoriaIndice) =>
  CATEGORIAS_INDICE.find((c) => c.id === id)?.cor ?? "bg-muted text-muted-foreground";
