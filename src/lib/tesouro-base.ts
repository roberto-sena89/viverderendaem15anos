/**
 * Tesouro Direto — tipos, classificação e cálculos puros (client-safe).
 *
 * O Tesouro Nacional divulga preços e taxas uma vez por dia útil, após o
 * fechamento do mercado de juros. Não existe pregão intradiário aqui: tudo
 * neste módulo trabalha com a foto diária mais recente.
 */

export type IndexadorTitulo = "PRE" | "SELIC" | "IPCA";

export type TipoTitulo =
  | "PREFIXADO"
  | "PREFIXADO_JS"
  | "SELIC"
  | "IPCA"
  | "IPCA_JS"
  | "RENDA"
  | "EDUCA";

export type PontoPreco = { data: string; preco: number; taxa: number | null };

export type LinhaTesouro = {
  id: string;
  nome: string;
  tipo: TipoTitulo;
  indexador: IndexadorTitulo;
  jurosSemestrais: boolean;
  vencimento: string;
  dataBase: string | null;
  /** Taxa contratada na compra (% a.a., acima do indexador quando houver). */
  taxaCompra: number | null;
  taxaVenda: number | null;
  precoCompra: number | null;
  precoVenda: number | null;
  /** Rentabilidade anual estimada em termos nominais (inclui indexador projetado). */
  rentabilidadeEstimada: number | null;
  investimentoMinimo: number | null;
  anosAteVencimento: number;
  serie: PontoPreco[];
};

export type RespostaTesouro = {
  linhas: LinhaTesouro[];
  /** Data-base da tabela oficial mais recente (ISO). */
  precosDe: string | null;
  selic: number | null;
  ipca12m: number | null;
  ipcaReferencia: string | null;
  proximoCopom: string | null;
  proximoIpca: string | null;
  atualizadoEm: string;
  parcial: boolean;
};

export const TIPOS_TITULO: {
  id: TipoTitulo;
  rotulo: string;
  sigla: string;
  indexador: IndexadorTitulo;
  jurosSemestrais: boolean;
  explicacao: string;
}[] = [
  {
    id: "PREFIXADO",
    rotulo: "Tesouro Prefixado",
    sigla: "LTN",
    indexador: "PRE",
    jurosSemestrais: false,
    explicacao:
      "Taxa fixa travada na compra. Você sabe exatamente quanto receberá por unidade no vencimento (R$ 1.000). Todo o rendimento vem de uma vez, no final.",
  },
  {
    id: "PREFIXADO_JS",
    rotulo: "Tesouro Prefixado com Juros Semestrais",
    sigla: "NTN-F",
    indexador: "PRE",
    jurosSemestrais: true,
    explicacao:
      "Mesma taxa fixa, porém com cupons pagos a cada seis meses. Serve para quem quer renda periódica em vez de acumular tudo até o vencimento.",
  },
  {
    id: "SELIC",
    rotulo: "Tesouro Selic",
    sigla: "LFT",
    indexador: "SELIC",
    jurosSemestrais: false,
    explicacao:
      "Acompanha a taxa básica de juros no dia a dia. É o título com menor oscilação de preço, por isso o mais usado para reserva de emergência.",
  },
  {
    id: "IPCA",
    rotulo: "Tesouro IPCA+",
    sigla: "NTN-B Principal",
    indexador: "IPCA",
    jurosSemestrais: false,
    explicacao:
      "Paga a inflação do período mais uma taxa real fixa, tudo no vencimento. Protege o poder de compra no longo prazo.",
  },
  {
    id: "IPCA_JS",
    rotulo: "Tesouro IPCA+ com Juros Semestrais",
    sigla: "NTN-B",
    indexador: "IPCA",
    jurosSemestrais: true,
    explicacao:
      "Inflação mais taxa real, com cupons semestrais. Indicado para quem já quer usar a renda gerada pelo título.",
  },
  {
    id: "RENDA",
    rotulo: "Tesouro Renda+",
    sigla: "Aposentadoria Extra",
    indexador: "IPCA",
    jurosSemestrais: false,
    explicacao:
      "Acumula por anos corrigido pelo IPCA e depois paga renda mensal durante 20 anos. Feito para complementar a aposentadoria.",
  },
  {
    id: "EDUCA",
    rotulo: "Tesouro Educa+",
    sigla: "Educa+",
    indexador: "IPCA",
    jurosSemestrais: false,
    explicacao:
      "Mesma lógica do Renda+, mas com pagamentos mensais durante 5 anos, pensados para bancar os estudos.",
  },
];

export const INDEXADORES: { id: IndexadorTitulo; rotulo: string }[] = [
  { id: "PRE", rotulo: "Prefixado" },
  { id: "SELIC", rotulo: "Selic" },
  { id: "IPCA", rotulo: "IPCA+" },
];

export const defTipo = (id: TipoTitulo) => TIPOS_TITULO.find((t) => t.id === id) ?? TIPOS_TITULO[0];

/** Classes de badge por indexador — azul (pré), verde (Selic), roxo (IPCA+). */
export const corIndexador = (i: IndexadorTitulo) =>
  i === "PRE"
    ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
    : i === "SELIC"
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-violet-500/30 bg-violet-500/10 text-violet-400";

export const rotuloIndexador = (i: IndexadorTitulo) =>
  i === "PRE" ? "Prefixado" : i === "SELIC" ? "Selic" : "IPCA+";

/** Classifica o título a partir do nome oficial divulgado pelo Tesouro. */
export function classificar(nome: string): TipoTitulo {
  const n = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const js = n.includes("JUROS SEMESTRAIS");
  if (n.includes("EDUCA")) return "EDUCA";
  if (n.includes("RENDA+") || n.includes("RENDA +") || n.includes("APOSENTADORIA")) return "RENDA";
  if (n.includes("SELIC")) return "SELIC";
  if (n.includes("IPCA")) return js ? "IPCA_JS" : "IPCA";
  if (n.includes("IGPM") || n.includes("IGP-M")) return js ? "IPCA_JS" : "IPCA";
  return js ? "PREFIXADO_JS" : "PREFIXADO";
}

/** Texto da rentabilidade contratada: "IPCA + 7,54%" ou "14,89%". */
export function textoTaxa(l: Pick<LinhaTesouro, "indexador" | "taxaCompra">) {
  if (l.taxaCompra === null) return "—";
  const t = `${l.taxaCompra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  if (l.indexador === "IPCA") return `IPCA + ${t}`;
  if (l.indexador === "SELIC") return l.taxaCompra >= 0 ? `Selic + ${t}` : `Selic ${t}`;
  return t;
}

export const faixaPrazo = (anos: number) =>
  anos <= 2 ? "curto" : anos <= 10 ? "medio" : "longo";

export const anosEntre = (iso: string, base = new Date()) =>
  Math.max(0, (new Date(`${iso}T12:00:00`).getTime() - base.getTime()) / (365.25 * 24 * 3600 * 1000));

/* ------------------------------------------------------------------ *
 * Tributação e custos
 * ------------------------------------------------------------------ */

export const CUSTODIA_B3 = 0.002; // 0,20% a.a. sobre o valor investido
export const ISENCAO_CUSTODIA_SELIC = 10_000; // Tesouro Selic é isento até R$ 10 mil

/** Tabela regressiva do IR sobre renda fixa. */
export function aliquotaIr(dias: number) {
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.2;
  if (dias <= 720) return 0.175;
  return 0.15;
}

/** IOF regressivo — só incide em resgates com menos de 30 dias. */
const TABELA_IOF = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20,
  16, 13, 10, 6, 3, 0,
];
export const aliquotaIof = (dias: number) =>
  dias >= 30 || dias < 1 ? 0 : (TABELA_IOF[dias - 1] ?? 0) / 100;

export type ResultadoSimulacao = {
  dias: number;
  anos: number;
  taxaAnual: number;
  valorInvestido: number;
  valorBruto: number;
  rendimentoBruto: number;
  custodia: number;
  ir: number;
  iof: number;
  valorLiquido: number;
  rendimentoLiquido: number;
  rentabilidadeLiquidaAnual: number;
  percentualCdi: number | null;
  aliquotaIr: number;
};

/**
 * Projeção simplificada: juro composto sobre a taxa anual estimada, com taxa
 * de custódia da B3, IR pela tabela regressiva e IOF nos 30 primeiros dias.
 */
export function simular(opcoes: {
  valorInvestido: number;
  taxaAnual: number;
  dias: number;
  isentoCustodia?: boolean;
  cdi?: number | null;
}): ResultadoSimulacao {
  const dias = Math.max(1, Math.round(opcoes.dias));
  const anos = dias / 365;
  const valorInvestido = Math.max(0, opcoes.valorInvestido);
  const taxa = opcoes.taxaAnual / 100;

  const valorBruto = valorInvestido * Math.pow(1 + taxa, anos);
  const rendimentoBruto = valorBruto - valorInvestido;

  const base = opcoes.isentoCustodia
    ? Math.max(0, ((valorInvestido + valorBruto) / 2) - ISENCAO_CUSTODIA_SELIC)
    : (valorInvestido + valorBruto) / 2;
  const custodia = Math.max(0, base) * CUSTODIA_B3 * anos;

  const iof = rendimentoBruto * aliquotaIof(dias);
  const aliq = aliquotaIr(dias);
  const ir = Math.max(0, rendimentoBruto - iof) * aliq;

  const valorLiquido = valorBruto - custodia - ir - iof;
  const rendimentoLiquido = valorLiquido - valorInvestido;
  const rentabilidadeLiquidaAnual =
    valorInvestido > 0 ? (Math.pow(valorLiquido / valorInvestido, 1 / anos) - 1) * 100 : 0;

  return {
    dias,
    anos,
    taxaAnual: opcoes.taxaAnual,
    valorInvestido,
    valorBruto,
    rendimentoBruto,
    custodia,
    ir,
    iof,
    valorLiquido,
    rendimentoLiquido,
    rentabilidadeLiquidaAnual,
    percentualCdi:
      opcoes.cdi && opcoes.cdi > 0 ? (opcoes.taxaAnual / opcoes.cdi) * 100 : null,
    aliquotaIr: aliq,
  };
}
