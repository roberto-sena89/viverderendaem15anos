/**
 * CVM base: lógica pura de leitura e derivação das demonstrações financeiras
 * padronizadas (DFP/ITR) publicadas pela CVM, sem I/O.
 *
 * Consome os CSVs dos ZIPs oficiais do Portal de Dados Abertos
 * (dados.cvm.gov.br/dados/CIA_ABERTA/DOC/{DFP,ITR}/DADOS/) e deriva, por
 * período, as métricas que alimentam o valuation real do gestor: lucro
 * líquido TTM, P/L trimestral (preço ÷ lucro por ação ajustado por splits)
 * e o percentil do P/L atual na própria história.
 */

/** Linha bruta de um CSV da CVM: mapa campo -> valor. */
export type LinhaCsv = Record<string, string>;

/** Ponto trimestral derivado das demonstrações (acumulado no exercício). */
export type ContaTrimestre = {
  /** Fim do trimestre (ISO yyyy-mm-dd). */
  periodo: string;
  /** Valor em R$ milhares (conserva a escala dos arquivos). */
  valor: number;
};

export type SerieContas = {
  /** Receita líquida (conta 3.01). */
  receita: ContaTrimestre[];
  /** Resultado antes do resultado financeiro e tributos (3.05) — proxy EBIT. */
  ebit: ContaTrimestre[];
  /** Lucro/prejuízo líquido do período (3.11, fallback 3.13). */
  lucro: ContaTrimestre[];
};

export type SplitYahoo = {
  /** Data do split (ms desde época). */
  data: number;
  /** Razão do split: ações após = ações antes × fator. */
  fator: number;
};

export type PrecoSemanal = {
  data: string;
  fechamento: number;
};

/** Ponto da série de P/L real (trimestral, TTM, lucro positivo). */
export type PontoPlReal = {
  periodo: string;
  pl: number;
};

/* ------------------------------------------------------------------ *
 * CSV (ISO-8859-1 decodificado pelo chamador)
 * ------------------------------------------------------------------ */

/** Divide uma linha CSV respeitando campos entre aspas. */
export function parseCsvLinhas(texto: string): LinhaCsv[] {
  const linhas: LinhaCsv[] = [];
  let cabecalho: string[] | null = null;
  const buffer = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const raw of buffer.split("\n")) {
    if (!raw.trim()) continue;
    const campos = quebrarLinha(raw);
    if (!campos.length) continue;
    if (!cabecalho) {
      cabecalho = campos;
      continue;
    }
    if (campos.length !== cabecalho.length) continue;
    const linha: LinhaCsv = {};
    for (let i = 0; i < cabecalho.length; i++) linha[cabecalho[i]] = campos[i] ?? "";
    linhas.push(linha);
  }
  return linhas;
}

function quebrarLinha(linha: string): string[] {
  const saida: string[] = [];
  let atual = "";
  let dentro = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentro && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentro = !dentro;
      }
    } else if (c === ";" && !dentro) {
      saida.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  saida.push(atual);
  return saida;
}

/** Número brasileiro tolerante: aceita "1.234,56", "1234.56", "-5,5". */
export function numeroBr(t: string | undefined | null): number | null {
  if (t === undefined || t === null) return null;
  const limpo = t.trim().replace(/\s/g, "");
  if (!limpo || limpo === "-") return null;
  let n: number;
  if (limpo.includes(",")) {
    n = Number(limpo.replace(/\./g, "").replace(",", "."));
  } else {
    n = Number(limpo);
  }
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ *
 * Derivação por período
 * ------------------------------------------------------------------ */

/** Concatena as contas de um ou mais arquivos CSV em uma série por período.
 *  Valores são normalizados para R$ (a escala dos arquivos — MIL ou
 *  UNIDADE — consta em ESCALA_MOEDA). */
export function serieDaConta(
  arquivos: LinhaCsv[],
  codigo: string,
  fallback: string | null = null,
): ContaTrimestre[] {
  const porPeriodo = new Map<string, number>();
  for (const arquivo of arquivos) {
    const valor = (arquivo["VL_CONTA"] ?? "").trim();
    const num = numeroBr(valor);
    if (num === null) continue;
    if ((arquivo["CD_CONTA"] ?? "").trim() !== codigo) continue;
    const periodo = isoDeBrasil(arquivo["DT_FIM_EXERC"] ?? "");
    if (!periodo) continue;
    const escala = (arquivo["ESCALA_MOEDA"] ?? "").trim().toUpperCase();
    const fator = escala === "MIL" ? 1000 : 1;
    if (!porPeriodo.has(periodo)) porPeriodo.set(periodo, num * fator);
  }
  if (fallback) {
    for (const arquivo of arquivos) {
      if ((arquivo["CD_CONTA"] ?? "").trim() !== fallback) continue;
      const num = numeroBr(arquivo["VL_CONTA"] ?? "");
      if (num === null) continue;
      const periodo = isoDeBrasil(arquivo["DT_FIM_EXERC"] ?? "");
      if (!periodo) continue;
      const escala = (arquivo["ESCALA_MOEDA"] ?? "").trim().toUpperCase();
      const fator = escala === "MIL" ? 1000 : 1;
      if (!porPeriodo.has(periodo)) porPeriodo.set(periodo, num * fator);
    }
  }
  return [...porPeriodo.entries()]
    .map(([periodo, valor]) => ({ periodo, valor }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

/* ------------------------------------------------------------------ *
 * Mapeamento ticker → empresa (por nome)
 * ------------------------------------------------------------------ */

/** Palavras societárias/estruturais que não ajudam a casar nomes. */
const STOPWORDS = new Set([
  "sa",
  "s/a",
  "ltda",
  "limitada",
  "companhia",
  "compa",
  "cia",
  "cias",
  "sociedade",
  "anonima",
  "incorporadora",
  "holdings",
  "holding",
  "cnpj",
  "e",
  "de",
  "do",
  "da",
  "em",
  "na",
  "no",
  "com",
  "por",
  "para",
  "os",
  "as",
  "um",
  "uma",
  "dos",
  "das",
  "investimentos",
  "participacoes",
  "gerenciamento",
]);

/** Minúsculas, sem acentos, só letras/números/espaços separados. */
export function normalizarNomeEmpresa(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Tokeniza o nome normalizado, descartando stopwords e tokens curtos. */
function tokens(nome: string): string[] {
  return normalizarNomeEmpresa(nome)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Busca a empresa da CVM cujo nome mais se aproxima do nome público do
 * ticker (longName do Yahoo). Similaridade de Jaccard por tokens comuns:
 * 2×interseção ÷ (tamanho alvo + tamanho denominação). Retorna o melhor par
 * (CNPJ, denominação) — ou null quando nenhum candidato alcança o limiar.
 */
export function mapearEmpresaPorNome(
  nomeTicker: string,
  empresas: LinhaCsv[],
  limiar = 0.5,
): { cnpj: string; denominacao: string; pontuacao: number } | null {
  const alvo = tokens(nomeTicker);
  if (!alvo.length) return null;
  let melhor: { cnpj: string; denominacao: string; pontuacao: number } | null = null;
  for (const e of empresas) {
    const denom = (e["DENOM_CIA"] ?? "").trim();
    const cnpj = (e["CNPJ_CIA"] ?? "").trim();
    if (!denom || !cnpj) continue;
    const de = tokens(denom);
    if (!de.length) continue;
    let comuns = 0;
    const unicos = new Set(de);
    for (const t of alvo) if (unicos.has(t)) comuns++;
    const pontuacao = (comuns * 2) / (alvo.length + de.length);
    if (pontuacao >= limiar && (!melhor || pontuacao > melhor.pontuacao)) {
      melhor = { cnpj, denominacao: denom, pontuacao };
    }
  }
  return melhor;
}

/** Converte um fim de exercício para ISO "AAAA-MM-DD": aceita o formato
 * brasileiro "DD/MM/AAAA" dos arquivos mais antigos e o ISO nativo dos
 * arquivos atuais da CVM. */
export function isoDeBrasil(data: string): string | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/.exec(data.trim());
  if (iso) return iso[0];
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data.trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function anoDePeriodo(periodo: string): number {
  return Number(periodo.slice(0, 4));
}

function trimestreDePeriodo(periodo: string): number {
  return Number(periodo.slice(5, 7));
}

/**
 * Calcula o lucro TTM (últimos 12 meses) em cada trimestre a partir dos
 * acumulados do exercício (DRE ITR): TTM(t) = acumulado(t) +
 * acumulado(Q4 do ano anterior) − acumulado(trimestre de t no ano anterior).
 * Retorna apenas trimestres com os três termos disponíveis.
 */
export function lucroTtmPorTrimestre(lucro: ContaTrimestre[]): ContaTrimestre[] {
  const porAnoTrimestre = new Map<string, number>();
  for (const p of lucro) {
    porAnoTrimestre.set(`${anoDePeriodo(p.periodo)}-${trimestreDePeriodo(p.periodo)}`, p.valor);
  }
  const ttm: ContaTrimestre[] = [];
  for (const p of lucro) {
    const ano = anoDePeriodo(p.periodo);
    const tri = trimestreDePeriodo(p.periodo);
    const atual = porAnoTrimestre.get(`${ano}-${tri}`);
    const q4Anterior = porAnoTrimestre.get(`${ano - 1}-12`);
    const triAnterior = porAnoTrimestre.get(`${ano - 1}-${tri}`);
    if (atual === undefined || q4Anterior === undefined || triAnterior === undefined) continue;
    ttm.push({ periodo: p.periodo, valor: atual + q4Anterior - triAnterior });
  }
  return ttm.sort((a, b) => a.periodo.localeCompare(b.periodo));
}

/* ------------------------------------------------------------------ *
 * Splits e P/L real
 * ------------------------------------------------------------------ */

/**
 * Fator de multiplicação de ações acumulado desde uma data até hoje: produto
 * dos fatores dos splits com data posterior à referência. Yahoo informa a
 * razão "2:1" como numerator/denominator — a quantidade de ações multiplica
 * por 2 e o fator unitário é 2.
 */
export function fatorSplitAcumulado(splits: SplitYahoo[], dataReferencia: number): number {
  let fator = 1;
  for (const s of splits) {
    if (s.data > dataReferencia) fator *= s.fator;
  }
  return fator;
}

/**
 * Último fechamento semanal em ou antes do fim do trimestre (tolerância de
 * 100 dias). Retorna null quando o histórico não cobre o período.
 */
export function precoNoFimDoTrimestre(
  precos: PrecoSemanal[],
  periodoIso: string,
  toleranciaDias = 100,
): number | null {
  const limite = Date.parse(`${periodoIso}T23:59:59Z`);
  if (!Number.isFinite(limite)) return null;
  let melhor: PrecoSemanal | null = null;
  for (const p of precos) {
    const t = Date.parse(`${p.data}T23:59:59Z`);
    if (!Number.isFinite(t) || t > limite) continue;
    if (!melhor || t > Date.parse(`${melhor.data}T23:59:59Z`)) melhor = p;
  }
  if (!melhor) return null;
  const t = Date.parse(`${melhor.data}T23:59:59Z`);
  if (limite - t > toleranciaDias * 86_400_000) return null;
  return melhor.fechamento;
}

/**
 * Série de P/L real (trimestral, TTM): para cada trimestre, divide o preço
 * bruto de fechamento do período pela série de lucro por ação ajustada a
 * splits e à quantidade de ações atual:
 *
 *   P/L_t = preço(t) × ações_hoje ÷ (lucro_TTM(t) × fator_split_acumulado(t))
 *
 * Períodos com lucro não positivo (prejuízo) ou sem preço/lucro são
 * descartados — P/L não é definido com lucro negativo.
 */
export function montarSeriePlReal(opcoes: {
  lucroTtm: ContaTrimestre[];
  precos: PrecoSemanal[];
  splits: SplitYahoo[];
  acoesHoje: number | null;
}): { pontos: PontoPlReal[]; plAtual: number | null } {
  const pontos: PontoPlReal[] = [];
  let plAtual: number | null = null;
  if (!(opcoes.acoesHoje !== null && Number.isFinite(opcoes.acoesHoje) && opcoes.acoesHoje > 0)) {
    return { pontos, plAtual };
  }
  let ultimo: PontoPlReal | null = null;
  for (const t of opcoes.lucroTtm) {
    if (!Number.isFinite(t.valor) || t.valor <= 0) continue;
    const preco = precoNoFimDoTrimestre(opcoes.precos, t.periodo);
    if (preco === null || !(preco > 0)) continue;
    const fator = fatorSplitAcumulado(opcoes.splits, Date.parse(`${t.periodo}T23:59:59Z`));
    const pl = (preco * opcoes.acoesHoje) / (t.valor * fator);
    if (!Number.isFinite(pl) || pl <= 0) continue;
    pontos.push({ periodo: t.periodo, pl });
    ultimo = { periodo: t.periodo, pl };
  }
  plAtual = ultimo?.pl ?? null;
  return { pontos, plAtual };
}
