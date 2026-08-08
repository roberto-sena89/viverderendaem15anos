/**
 * Tipos e classificação das criptomoedas exibidas na grade.
 *
 * O mercado cripto negocia 24/7 e tem várias entradas para o mesmo ativo
 * (tokens wrapped, staking líquido, stablecoins em redes diferentes), então
 * classificamos cada moeda em uma categoria para o usuário não se confundir.
 */

export type CategoriaCripto =
  "reserva" | "smart-contract" | "stablecoin" | "staking" | "wrapped" | "meme" | "defi" | "outros";

export type LinhaCripto = {
  id: string;
  ticker: string;
  nome: string;
  imagem: string | null;
  rank: number | null;
  categoria: CategoriaCripto;
  /** Rede/ponte quando o token representa outro ativo (ex.: "Ethereum"). */
  rede: string | null;
  precoUsd: number | null;
  variacao1h: number | null;
  variacao24h: number | null;
  variacao7d: number | null;
  variacao30d: number | null;
  variacao6m: number | null;
  variacao12m: number | null;
  capitalizacao: number | null;
  volume24h: number | null;
  maximo24h: number | null;
  minimo24h: number | null;
  fornecimento: number | null;
  spark: number[];
};

export type RespostaCripto = {
  linhas: LinhaCripto[];
  /** Cotação do dólar comercial em reais, usada na coluna "Cotação (R$)". */
  usdBrl: number;
  capitalizacaoTotal: number;
  dominanciaBtc: number | null;
  atualizadoEm: string;
  fonte: string;
  parcial: boolean;
};

export const ROTULO_CATEGORIA: Record<CategoriaCripto, string> = {
  reserva: "Reserva de valor",
  "smart-contract": "Smart contract",
  stablecoin: "Stablecoin",
  staking: "Staking líquido",
  wrapped: "Wrapped",
  meme: "Meme coin",
  defi: "DeFi",
  outros: "Outros",
};

/** Cores fixas por categoria (tokens semânticos do tema escuro). */
export const COR_CATEGORIA: Record<CategoriaCripto, string> = {
  reserva: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "smart-contract": "bg-sky-500/15 text-sky-400 border-sky-500/30",
  stablecoin: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  staking: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  wrapped: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  meme: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  defi: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  outros: "bg-muted text-muted-foreground border-border",
};

export const EXPLICACAO_CATEGORIA: Record<CategoriaCripto, string> = {
  reserva: "Ativos usados como reserva de valor, com emissão limitada.",
  "smart-contract": "Plataformas que executam contratos inteligentes e aplicações.",
  stablecoin:
    "Token atrelado a uma moeda (normalmente o dólar). Oscilações de centavos são normais.",
  staking: "Token que representa uma posição em staking, resgatável e negociável.",
  wrapped: "Token que representa outro ativo em uma rede diferente, lastreado 1:1.",
  meme: "Ativos movidos por comunidade e narrativa, com volatilidade extrema.",
  defi: "Protocolos de finanças descentralizadas (empréstimos, oráculos, exchanges).",
  outros: "Demais criptoativos monitorados.",
};

const RESERVA = new Set(["bitcoin", "litecoin", "bitcoin-cash", "monero", "zcash"]);
const SMART = new Set([
  "ethereum",
  "solana",
  "cardano",
  "avalanche-2",
  "polkadot",
  "near",
  "tron",
  "aptos",
  "sui",
  "internet-computer",
  "cosmos",
  "algorand",
  "toncoin",
  "the-open-network",
  "hedera-hashgraph",
  "ethereum-classic",
  "stellar",
  "tezos",
]);
const MEME = new Set([
  "dogecoin",
  "shiba-inu",
  "pepe",
  "bonk",
  "dogwifcoin",
  "floki",
  "book-of-meme",
  "brett-based",
  "mog-coin",
]);
const DEFI = new Set([
  "uniswap",
  "aave",
  "chainlink",
  "maker",
  "curve-dao-token",
  "lido-dao",
  "pancakeswap-token",
  "compound-governance-token",
  "synthetix-network-token",
  "injective-protocol",
  "the-graph",
  "jupiter-exchange-solana",
  "ethena",
]);

const REDE_POR_PALAVRA: [RegExp, string][] = [
  [/\bbinance|\bbnb|bsc/i, "BNB Chain"],
  [/\bpolygon|matic/i, "Polygon"],
  [/\barbitrum/i, "Arbitrum"],
  [/\bavalanche/i, "Avalanche"],
  [/\bsolana/i, "Solana"],
  [/\bether|\beth\b|erc-?20/i, "Ethereum"],
];

/** Classifica a moeda a partir do id/nome/símbolo devolvidos pela fonte. */
export function classificarCripto(
  id: string,
  nome: string,
  ticker: string,
): { categoria: CategoriaCripto; rede: string | null } {
  const n = `${nome} ${ticker}`.toLowerCase();
  const idn = id.toLowerCase();

  const wrapped =
    /wrapped|^w[a-z]{2,4}$|\bbridged\b|\bbinance-peg\b/.test(idn) || /wrapped|bridged/.test(n);
  const staking = /staked|steth|reth|cbeth|wsteth|meth|ezeth|weeth|jitosol|msol/.test(
    `${idn} ${ticker.toLowerCase()}`,
  );
  const stable =
    /tether|usd-coin|dai|first-digital|usde|frax|true-usd|paypal-usd|usds|pyusd|usdt|usdc/.test(
      idn,
    ) || /\busd\b|dollar/.test(n);

  let categoria: CategoriaCripto = "outros";
  if (stable && !wrapped) categoria = "stablecoin";
  else if (staking) categoria = "staking";
  else if (wrapped) categoria = "wrapped";
  else if (RESERVA.has(idn)) categoria = "reserva";
  else if (MEME.has(idn)) categoria = "meme";
  else if (DEFI.has(idn)) categoria = "defi";
  else if (SMART.has(idn)) categoria = "smart-contract";

  let rede: string | null = null;
  if (categoria === "wrapped" || categoria === "staking" || categoria === "stablecoin") {
    for (const [re, r] of REDE_POR_PALAVRA) {
      if (re.test(n) || re.test(idn)) {
        rede = r;
        break;
      }
    }
  }
  return { categoria, rede };
}

/** Stablecoins não devem ser lidas com a lógica de alta/baixa das demais. */
export const ehStablecoin = (l: LinhaCripto) => l.categoria === "stablecoin";
