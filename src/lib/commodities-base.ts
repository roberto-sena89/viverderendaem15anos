/**
 * Catálogo das commodities acompanhadas na aba "Commodities".
 *
 * Diferente de ações e FIIs, cada commodity é cotada em dólar e tem unidade de
 * medida própria (barril, onça troy, saca de 60 kg, tonelada, libra-peso).
 * Aqui ficam o catálogo, as conversões de unidade e as janelas de negociação
 * de cada bolsa de referência — tudo isomórfico (usado no servidor e na UI).
 */

export type CategoriaCommodity =
  | "energia"
  | "metais-preciosos"
  | "metais-industriais"
  | "graos"
  | "softs"
  | "pecuaria";

export type DefCommodity = {
  codigo: string;
  nome: string;
  categoria: CategoriaCommodity;
  /** Bolsa/contrato de referência exibido ao lado do nome. */
  bolsa: string;
  /** Unidade de medida do preço exibido (ex.: "barril", "saca 60kg"). */
  unidade: string;
  /** Símbolos candidatos no provedor (tentados em ordem). */
  simbolos: string[];
  /**
   * Fator aplicado ao preço bruto da fonte para chegar à unidade exibida.
   * Ex.: grãos vêm em centavos de dólar por bushel; café em centavos por libra.
   */
  fator?: number;
  descricao: string;
};

export type LinhaCommodity = {
  codigo: string;
  nome: string;
  categoria: CategoriaCommodity;
  bolsa: string;
  unidade: string;
  descricao: string;
  /** Preço na unidade exibida, em dólares. */
  precoUsd: number | null;
  variacaoDia: number | null;
  variacao12m: number | null;
  variacao30d: number | null;
  fechamentoAnterior: number | null;
  minima12m: number | null;
  maxima12m: number | null;
  /** Últimos 30 fechamentos (já convertidos para a unidade exibida). */
  spark: number[];
  fonte: string;
};

export type RespostaCommodities = {
  linhas: LinhaCommodity[];
  usdBrl: number;
  atualizadoEm: string;
  parcial: boolean;
};

/* ------------------------------------------------------------------ *
 * Categorias
 * ------------------------------------------------------------------ */

export const CATEGORIAS_COMMODITY: {
  id: CategoriaCommodity;
  rotulo: string;
  curto: string;
  cor: string;
  bolsa: string;
}[] = [
  {
    id: "energia",
    rotulo: "Energia",
    curto: "Energia",
    cor: "bg-orange-500/15 text-orange-400",
    bolsa: "ICE / NYMEX",
  },
  {
    id: "metais-preciosos",
    rotulo: "Metais Preciosos",
    curto: "Preciosos",
    cor: "bg-amber-400/15 text-amber-300",
    bolsa: "COMEX",
  },
  {
    id: "metais-industriais",
    rotulo: "Metais Industriais e Ferrosos",
    curto: "Industriais",
    cor: "bg-slate-400/15 text-slate-300",
    bolsa: "LME / SGX",
  },
  {
    id: "graos",
    rotulo: "Agropecuária — Grãos",
    curto: "Grãos",
    cor: "bg-primary/15 text-primary",
    bolsa: "CBOT (Chicago)",
  },
  {
    id: "softs",
    rotulo: "Agropecuária — Softs",
    curto: "Softs",
    cor: "bg-emerald-500/15 text-emerald-400",
    bolsa: "ICE US",
  },
  {
    id: "pecuaria",
    rotulo: "Pecuária",
    curto: "Pecuária",
    cor: "bg-rose-500/15 text-rose-400",
    bolsa: "CME",
  },
];

export const rotuloCategoria = (id: CategoriaCommodity) =>
  CATEGORIAS_COMMODITY.find((c) => c.id === id)?.rotulo ?? id;

export const corCategoria = (id: CategoriaCommodity) =>
  CATEGORIAS_COMMODITY.find((c) => c.id === id)?.cor ?? "bg-muted text-muted-foreground";

/* ------------------------------------------------------------------ *
 * Conversões de unidade
 * ------------------------------------------------------------------ */

/** Centavos de dólar por libra-peso -> dólares por libra-peso. */
const CENTAVOS_LB = 0.01;
/** Centavos por bushel de soja/trigo (27,2155 kg) -> dólares por saca de 60 kg. */
const BUSHEL_SOJA_SACA = 60 / 27.2155 / 100;
/** Centavos por bushel de milho (25,4012 kg) -> dólares por saca de 60 kg. */
const BUSHEL_MILHO_SACA = 60 / 25.4012 / 100;
/** Centavos por libra de café -> dólares por saca de 60 kg (132,277 lb). */
const CENTAVOS_LB_SACA = 132.277 / 100;
/** Centavos por libra de boi -> dólares por arroba (15 kg = 33,0693 lb). */
const CENTAVOS_LB_ARROBA = 33.0693 / 100;

export const COMMODITIES: DefCommodity[] = [
  /* Energia ---------------------------------------------------------- */
  {
    codigo: "BRENT",
    nome: "Petróleo Brent",
    categoria: "energia",
    bolsa: "ICE",
    unidade: "barril",
    simbolos: ["BZ=F"],
    descricao:
      "Referência mundial de petróleo, extraído do Mar do Norte. É o benchmark que baliza o preço dos combustíveis no Brasil e influencia diretamente ações como PETR4 e PRIO3.",
  },
  {
    codigo: "WTI",
    nome: "Petróleo WTI",
    categoria: "energia",
    bolsa: "NYMEX",
    unidade: "barril",
    simbolos: ["CL=F"],
    descricao:
      "West Texas Intermediate: petróleo leve produzido nos EUA. Costuma ser negociado com pequeno desconto em relação ao Brent por ser um mercado mais regional.",
  },
  {
    codigo: "GAS",
    nome: "Gás Natural",
    categoria: "energia",
    bolsa: "NYMEX",
    unidade: "MMBtu",
    simbolos: ["NG=F"],
    descricao:
      "Contrato Henry Hub, cotado por milhão de BTU (unidade de energia). Preço muito sensível ao inverno no hemisfério norte e à geopolítica europeia.",
  },

  /* Metais preciosos -------------------------------------------------- */
  {
    codigo: "OURO",
    nome: "Ouro",
    categoria: "metais-preciosos",
    bolsa: "COMEX",
    unidade: "onça troy",
    simbolos: ["GC=F"],
    descricao:
      "Ativo de proteção clássico. A onça troy equivale a 31,1035 g. Tende a subir em crises e quando os juros reais americanos caem.",
  },
  {
    codigo: "PRATA",
    nome: "Prata",
    categoria: "metais-preciosos",
    bolsa: "COMEX",
    unidade: "onça troy",
    simbolos: ["SI=F"],
    descricao:
      "Metal com dupla função: reserva de valor e insumo industrial (eletrônicos e painéis solares). Costuma ser mais volátil que o ouro.",
  },
  {
    codigo: "PLATINA",
    nome: "Platina",
    categoria: "metais-preciosos",
    bolsa: "NYMEX",
    unidade: "onça troy",
    simbolos: ["PL=F"],
    descricao:
      "Usada em catalisadores automotivos e joalheria. Oferta muito concentrada na África do Sul, o que amplifica choques de produção.",
  },

  /* Metais industriais ------------------------------------------------ */
  {
    codigo: "MINERIO",
    nome: "Minério de Ferro",
    categoria: "metais-industriais",
    bolsa: "SGX 62% Fe",
    unidade: "tonelada",
    simbolos: ["TIO=F"],
    descricao:
      "Contrato referenciado no minério 62% Fe entregue na China. É a principal variável de receita da VALE3 e reflete o ritmo da construção civil chinesa.",
  },
  {
    codigo: "COBRE",
    nome: "Cobre",
    categoria: "metais-industriais",
    bolsa: "COMEX",
    unidade: "libra-peso",
    simbolos: ["HG=F"],
    fator: CENTAVOS_LB,
    descricao:
      'Chamado de "doutor cobre" por antecipar ciclos econômicos: é insumo de energia, construção e eletrificação.',
  },
  {
    codigo: "ALUMINIO",
    nome: "Alumínio",
    categoria: "metais-industriais",
    bolsa: "LME",
    unidade: "tonelada",
    simbolos: ["ALI=F"],
    descricao:
      "Metal leve intensivo em energia elétrica na produção. Preço reage a custos de energia e a restrições de oferta na China e na Rússia.",
  },
  {
    codigo: "NIQUEL",
    nome: "Níquel",
    categoria: "metais-industriais",
    bolsa: "LME",
    unidade: "tonelada",
    simbolos: ["NID=F", "^NIC"],
    descricao:
      "Insumo do aço inoxidável e das baterias de veículos elétricos. A liquidez fica concentrada na LME, com atualização menos frequente em fontes gratuitas.",
  },

  /* Grãos -------------------------------------------------------------- */
  {
    codigo: "SOJA",
    nome: "Soja",
    categoria: "graos",
    bolsa: "CBOT",
    unidade: "saca 60kg",
    simbolos: ["ZS=F"],
    fator: BUSHEL_SOJA_SACA,
    descricao:
      "Cotada em Chicago por bushel; aqui convertemos para saca de 60 kg, padrão usado pelo produtor brasileiro. Principal produto da pauta de exportação do país.",
  },
  {
    codigo: "MILHO",
    nome: "Milho",
    categoria: "graos",
    bolsa: "CBOT",
    unidade: "saca 60kg",
    simbolos: ["ZC=F"],
    fator: BUSHEL_MILHO_SACA,
    descricao:
      "Base da ração animal e do etanol americano. Convertido de bushel (25,4 kg) para saca de 60 kg.",
  },
  {
    codigo: "TRIGO",
    nome: "Trigo",
    categoria: "graos",
    bolsa: "CBOT",
    unidade: "saca 60kg",
    simbolos: ["ZW=F"],
    fator: BUSHEL_SOJA_SACA,
    descricao:
      "Grão mais sensível à geopolítica: Rússia e Ucrânia respondem por parcela relevante das exportações mundiais.",
  },

  /* Softs --------------------------------------------------------------- */
  {
    codigo: "CAFE",
    nome: "Café Arábica",
    categoria: "softs",
    bolsa: "ICE US",
    unidade: "saca 60kg",
    simbolos: ["KC=F"],
    fator: CENTAVOS_LB_SACA,
    descricao:
      "Contrato KC, cotado em centavos por libra-peso e convertido aqui para saca de 60 kg. O Brasil é o maior produtor e exportador mundial.",
  },
  {
    codigo: "ACUCAR",
    nome: "Açúcar",
    categoria: "softs",
    bolsa: "ICE US",
    unidade: "libra-peso",
    simbolos: ["SB=F"],
    fator: CENTAVOS_LB,
    descricao:
      "Contrato nº 11, açúcar bruto de exportação. Preço se relaciona com o etanol: a usina escolhe o destino mais rentável da cana.",
  },
  {
    codigo: "ALGODAO",
    nome: "Algodão",
    categoria: "softs",
    bolsa: "ICE US",
    unidade: "libra-peso",
    simbolos: ["CT=F"],
    fator: CENTAVOS_LB,
    descricao:
      "Fibra têxtil sensível ao consumo global de vestuário. O Brasil disputa com os EUA a liderança das exportações.",
  },
  {
    codigo: "CACAU",
    nome: "Cacau",
    categoria: "softs",
    bolsa: "ICE US",
    unidade: "tonelada",
    simbolos: ["CC=F"],
    descricao:
      "Produção concentrada na África Ocidental (Costa do Marfim e Gana), o que torna o preço muito sensível ao clima da região.",
  },
  {
    codigo: "SUCO_LARANJA",
    nome: "Suco de Laranja",
    categoria: "softs",
    bolsa: "ICE US",
    unidade: "libra-peso",
    simbolos: ["OJ=F"],
    fator: CENTAVOS_LB,
    descricao:
      "Suco concentrado congelado. Brasil e Flórida dominam a oferta; furacões e greening derrubam a produção e disparam o preço.",
  },

  /* Pecuária ------------------------------------------------------------ */
  {
    codigo: "BOI",
    nome: "Boi Gordo",
    categoria: "pecuaria",
    bolsa: "CME Live Cattle",
    unidade: "arroba",
    simbolos: ["LE=F"],
    fator: CENTAVOS_LB_ARROBA,
    descricao:
      "No Brasil o boi é cotado por arroba (15 kg de carcaça), unidade herdada do peso histórico de comercialização. Convertemos o contrato de Chicago para arroba.",
  },
  {
    codigo: "BEZERRO",
    nome: "Bezerro",
    categoria: "pecuaria",
    bolsa: "CME Feeder Cattle",
    unidade: "arroba",
    simbolos: ["GF=F"],
    fator: CENTAVOS_LB_ARROBA,
    descricao:
      "Animal jovem destinado à engorda. O preço antecipa o custo de reposição do pecuarista e, portanto, o boi gordo dos meses seguintes.",
  },
  {
    codigo: "PORCO",
    nome: "Porco (Suíno)",
    categoria: "pecuaria",
    bolsa: "CME Lean Hogs",
    unidade: "libra-peso",
    simbolos: ["HE=F"],
    fator: CENTAVOS_LB,
    descricao:
      "Contrato de suíno magro. Relevante para frigoríficos brasileiros exportadores como BRFS3 e JBSS3.",
  },
];

/** Commodities com maior peso para o investidor brasileiro. */
export const DESTAQUES_COMMODITY = ["BRENT", "MINERIO", "OURO"] as const;

/** Correlação didática entre commodity e ativos da B3. */
export const CORRELACOES: Record<string, { tickers: string[]; frase: string }> = {
  BRENT: {
    tickers: ["PETR4", "PETR3", "PRIO3", "RRRP3", "RECV3"],
    frase: "PETR4 e PRIO3 tendem a seguir o Brent",
  },
  WTI: { tickers: ["PETR4", "PETR3", "PRIO3"], frase: "Petroleiras acompanham o WTI" },
  MINERIO: { tickers: ["VALE3", "CSNA3", "GGBR4", "USIM5"], frase: "VALE3 acompanha o minério de ferro" },
  OURO: { tickers: ["AURA33", "GOAU4"], frase: "Ouro é proteção contra crises e dólar forte" },
  SOJA: { tickers: ["SLCE3", "AGRO3", "SOJA3"], frase: "Agrícolas seguem a soja de Chicago" },
  MILHO: { tickers: ["SLCE3", "AGRO3", "SMTO3"], frase: "Milho pressiona custos de ração" },
  ACUCAR: { tickers: ["SMTO3", "RAIZ4"], frase: "Sucroenergéticas seguem açúcar e etanol" },
  BOI: { tickers: ["BEEF3", "JBSS3", "MRFG3"], frase: "Boi gordo é o principal custo dos frigoríficos" },
  PORCO: { tickers: ["BRFS3", "JBSS3"], frase: "Suíno afeta margens de BRFS3" },
  CAFE: { tickers: ["AGRO3"], frase: "Brasil é o maior exportador de café" },
};

/* ------------------------------------------------------------------ *
 * Horário de negociação por categoria
 * ------------------------------------------------------------------ */

type Janela = { inicio: number; fim: number };

/**
 * Janelas aproximadas em minutos UTC, dias úteis. Cada bolsa tem seu próprio
 * pregão: grãos de Chicago concentram liquidez no pit da manhã, enquanto
 * energia e metais têm sessão eletrônica quase ininterrupta.
 */
const JANELAS: Record<CategoriaCommodity, Janela> = {
  energia: { inicio: 23 * 60, fim: 22 * 60 },
  "metais-preciosos": { inicio: 23 * 60, fim: 22 * 60 },
  "metais-industriais": { inicio: 1 * 60, fim: 19 * 60 },
  graos: { inicio: 13 * 60 + 30, fim: 18 * 60 + 20 },
  softs: { inicio: 8 * 60 + 15, fim: 18 * 60 + 30 },
  pecuaria: { inicio: 14 * 60 + 30, fim: 19 * 60 + 5 },
};

export type EstadoMercadoCommodity = { aberto: boolean; rotulo: string };

/** Situação do pregão da bolsa de referência da categoria. */
export function mercadoCategoria(
  categoria: CategoriaCommodity,
  agora = new Date(),
): EstadoMercadoCommodity {
  const dia = agora.getUTCDay();
  const minutos = agora.getUTCHours() * 60 + agora.getUTCMinutes();
  const j = JANELAS[categoria];
  const dentro = j.inicio > j.fim ? minutos >= j.inicio || minutos <= j.fim : minutos >= j.inicio && minutos <= j.fim;
  const util = dia >= 1 && dia <= 5;
  const aberto = util && dentro;
  const bolsa = CATEGORIAS_COMMODITY.find((c) => c.id === categoria)?.bolsa ?? "";
  return {
    aberto,
    rotulo: aberto ? `${bolsa} em negociação` : `Mercado fechado — último fechamento (${bolsa})`,
  };
}
