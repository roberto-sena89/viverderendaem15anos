/**
 * Tipos e classificações compartilhados da grade de FIIs.
 * Arquivo client-safe: usado tanto pelo agregador no servidor quanto pela UI.
 */

export type TipoFii =
  | "Tijolo"
  | "Papel"
  | "Misto"
  | "FOF"
  | "FI-Infra"
  | "FIP"
  | "Fiagro"
  | "Desenvolvimento"
  | "Outro";

export const TIPOS_FII: TipoFii[] = [
  "Tijolo",
  "Papel",
  "Misto",
  "FOF",
  "FI-Infra",
  "FIP",
  "Fiagro",
  "Desenvolvimento",
  "Outro",
];

/** Rótulo longo do tipo, usado em tooltips e no comparador. */
export const ROTULO_TIPO: Record<TipoFii, string> = {
  Tijolo: "Fundo de Tijolo",
  Papel: "Fundo de Papel",
  Misto: "Fundo Misto",
  FOF: "Fundo de Fundos (FOF)",
  "FI-Infra": "Fundo de Infraestrutura",
  FIP: "Fundo de Participações (FIP)",
  Fiagro: "Fiagro",
  Desenvolvimento: "Fundo de Desenvolvimento",
  Outro: "Outro",
};

/** Cores fixas por tipo, na mesma lógica de categorias usada na carteira. */
export const COR_TIPO: Record<TipoFii, string> = {
  Tijolo: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Papel: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  Misto: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  FOF: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25",
  "FI-Infra": "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  FIP: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Fiagro: "bg-lime-500/15 text-lime-400 border-lime-500/25",
  Desenvolvimento: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  Outro: "bg-muted text-muted-foreground border-border",
};

export const SEGMENTOS_FII = [
  "Logística/Galpões",
  "Shoppings/Varejo",
  "Lajes Corporativas",
  "Híbrido",
  "Residencial",
  "Hotéis",
  "Hospitalar",
  "Agências Bancárias",
  "Títulos e Valores Mobiliários",
  "Fiagro",
  "Infraestrutura",
  "Outros",
] as const;

export type SegmentoFii = (typeof SEGMENTOS_FII)[number];

/** Traduz o segmento da fonte pública para o rótulo exibido na grade. */
export function normalizarSegmento(bruto: string, nome: string): SegmentoFii {
  const s = (bruto || "").toLowerCase();
  const n = (nome || "").toUpperCase();
  if (/fiagro|agroneg/i.test(n)) return "Fiagro";
  if (/infraestrutura|fi-infra/i.test(n)) return "Infraestrutura";
  if (s.includes("log")) return "Logística/Galpões";
  if (s.includes("shopping") || s.includes("varejo")) return "Shoppings/Varejo";
  if (s.includes("escrit") || s.includes("laje")) return "Lajes Corporativas";
  if (s.includes("híbr") || s.includes("hibr")) return "Híbrido";
  if (s.includes("residencial")) return "Residencial";
  if (s.includes("hotel")) return "Hotéis";
  if (s.includes("hospital")) return "Hospitalar";
  if (s.includes("títulos") || s.includes("titulos") || s.includes("val. mob")) {
    return "Títulos e Valores Mobiliários";
  }
  if (/AG(Ê|E)NCIA/.test(n)) return "Agências Bancárias";
  return "Outros";
}

/** Deduz o tipo do fundo a partir da razão social e do segmento. */
export function classificarTipo(nome: string, segmento: string): TipoFii {
  const n = (nome || "").toUpperCase();
  const s = (segmento || "").toLowerCase();
  if (/FIAGRO|AGRONEG/.test(n)) return "Fiagro";
  if (/INFRAESTRUTURA|FI-INFRA|FIC INFRA/.test(n)) return "FI-Infra";
  if (/PARTICIPA(Ç|C)(Õ|O)ES|FIP\b/.test(n)) return "FIP";
  if (/FUNDO DE FUNDOS|FDO\.? DE FDOS|\bFOF\b/.test(n)) return "FOF";
  if (/DESENVOLVIMENTO/.test(n)) return "Desenvolvimento";
  if (s.includes("títulos") || s.includes("titulos") || s.includes("val. mob")) return "Papel";
  if (/RECEB(Í|I)VEIS|\bCRI\b|CR(É|E)DITO|RENDA FIXA|SECURIT/.test(n)) return "Papel";
  if (/H(Í|I)BRID/.test(n) || s.includes("híbr") || s.includes("hibr")) return "Misto";
  if (s.includes("multicategoria")) return "Misto";
  if (
    ["log", "shopping", "varejo", "escrit", "laje", "residencial", "hotel", "hospital"].some((k) =>
      s.includes(k),
    )
  ) {
    return "Tijolo";
  }
  return "Outro";
}

/** Uma linha da grade de FIIs (preço ao vivo + indicadores fundamentalistas). */
export type LinhaFii = {
  ticker: string;
  nome: string;
  tipo: TipoFii;
  segmento: SegmentoFii;
  logo: string | null;
  preco: number | null;
  fechamentoAnterior: number | null;
  variacao: number | null;
  variacaoPercent: number | null;
  volume: number | null;
  /** Liquidez média diária informada pela base fundamentalista (R$/dia). */
  liquidez: number | null;
  patrimonio: number | null;
  valorMercado: number | null;
  vpa: number | null;
  pvp: number | null;
  dy12: number | null;
  vacancia: number | null;
  capRate: number | null;
  /** true quando o preço veio da base diária e não da cotação ao vivo. */
  precoDefasado: boolean;
};

/** Indicadores históricos calculados sob demanda (por página visível). */
export type HistoricoFii = {
  ticker: string;
  dy5a: number | null;
  var12m: number | null;
  var24m: number | null;
  var60m: number | null;
};

export type ResumoIfix = {
  valor: number | null;
  variacaoPercent: number | null;
  variacao12m: number | null;
  spark: number[];
};

export type RespostaFiis = {
  linhas: LinhaFii[];
  ifix: ResumoIfix | null;
  atualizadoEm: string;
  baseEm: string | null;
  parcial: boolean;
};
