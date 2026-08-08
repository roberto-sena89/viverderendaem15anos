/**
 * Tesouro Direto — dados abertos do governo (Tesouro Transparente / CKAN).
 *
 * Dataset "Taxas dos Títulos Ofertados pelo Tesouro Direto":
 * https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto
 *
 * O CSV traz a série completa desde 2005 (~14 MB). Ele é lido em streaming
 * (sem carregar o arquivo inteiro na memória), guardando a linha mais recente
 * de cada título e uma série curta (últimos ~18 meses) para os gráficos.
 * Como o Tesouro publica preços uma vez por dia útil, o resultado fica em
 * cache por 6 horas.
 */

const CSV_TESOURO =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

export type PontoTesouro = { data: string; preco: number; taxa: number | null };

export type TituloTesouro = {
  nome: string;
  vencimento: string | null;
  dataBase: string | null;
  taxaCompra: number | null;
  taxaVenda: number | null;
  precoCompra: number | null;
  precoVenda: number | null;
  /** Série diária recente do preço unitário de compra (para gráficos). */
  serie: PontoTesouro[];
};

let cache: { expira: number; valor: TituloTesouro[] } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000;

const numero = (v: string) => {
  const n = Number(v.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** "15/05/2035" -> "2035-05-15" */
const dataIso = (v: string) => {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

function corteSerie() {
  const d = new Date();
  d.setMonth(d.getMonth() - 18);
  return d.toISOString().slice(0, 10);
}

function processarLinha(linha: string, mapa: Map<string, TituloTesouro>, corte: string) {
  const c = linha.split(";");
  if (c.length < 8 || !c[0].startsWith("Tesouro")) return;
  const vencimento = dataIso(c[1]);
  const dataBase = dataIso(c[2]);
  if (!vencimento || !dataBase) return;

  const chave = `${c[0].trim()}|${vencimento}`;
  const precoCompra = numero(c[5]);
  const precoVenda = numero(c[6]);
  const taxaCompra = numero(c[3]);

  let atual = mapa.get(chave);
  if (!atual) {
    atual = {
      nome: `${c[0].trim()} ${vencimento.slice(0, 4)}`,
      vencimento,
      dataBase: null,
      taxaCompra: null,
      taxaVenda: null,
      precoCompra: null,
      precoVenda: null,
      serie: [],
    };
    mapa.set(chave, atual);
  }

  const preco = precoCompra ?? precoVenda;
  if (dataBase >= corte && preco !== null) {
    atual.serie.push({ data: dataBase, preco, taxa: taxaCompra });
  }

  if (atual.dataBase && atual.dataBase >= dataBase) return;
  atual.dataBase = dataBase;
  atual.taxaCompra = taxaCompra;
  atual.taxaVenda = numero(c[4]);
  atual.precoCompra = precoCompra;
  atual.precoVenda = precoVenda;
}

/** Reduz a série para no máximo `max` pontos, preservando o mais recente. */
function amostrar(serie: PontoTesouro[], max = 180): PontoTesouro[] {
  const ordenada = serie.sort((a, b) => a.data.localeCompare(b.data));
  if (ordenada.length <= max) return ordenada;
  const passo = Math.ceil(ordenada.length / max);
  const saida = ordenada.filter((_, i) => i % passo === 0);
  const ultimo = ordenada[ordenada.length - 1];
  if (saida[saida.length - 1]?.data !== ultimo.data) saida.push(ultimo);
  return saida;
}

/** Preço e taxa mais recentes de cada título público. */
export async function listarTesouroDireto(): Promise<TituloTesouro[]> {
  if (cache && cache.expira > Date.now()) return cache.valor;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(CSV_TESOURO, {
      headers: { Accept: "text/csv" },
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`Tesouro Transparente respondeu ${res.status}`);

    const corte = corteSerie();
    const mapa = new Map<string, TituloTesouro>();
    const leitor = res.body.pipeThrough(new TextDecoderStream("utf-8")).getReader();
    let resto = "";

    for (;;) {
      const { value, done } = await leitor.read();
      if (done) break;
      const partes = (resto + value).split("\n");
      resto = partes.pop() ?? "";
      for (const linha of partes) processarLinha(linha, mapa, corte);
    }
    if (resto) processarLinha(resto, mapa, corte);

    const titulos = [...mapa.values()]
      .map((t) => ({ ...t, serie: amostrar(t.serie) }))
      .sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""));
    cache = { valor: titulos, expira: Date.now() + TTL_MS };
    return titulos;
  } finally {
    clearTimeout(timer);
  }
}

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9+]+/g, " ")
    .trim();

/** Indexador declarado no ticker/nome do ativo (SELIC, IPCA+, PREFIXADO). */
function indexador(texto: string): "SELIC" | "IPCA" | "PRE" | null {
  if (/SELIC|LFT/.test(texto)) return "SELIC";
  if (/IPCA|NTN B|RENDA|EDUCA/.test(texto)) return "IPCA";
  if (/PREFIXAD|PRE\b|LTN|NTN F/.test(texto)) return "PRE";
  return null;
}

/** Casa o ativo da carteira (ex.: "Tesouro Selic 2031") com o título oficial. */
export function casarTitulo(entrada: string, titulos: TituloTesouro[]): TituloTesouro | null {
  const alvo = normalizar(entrada);
  if (!alvo.includes("TESOURO") && !indexador(alvo)) return null;

  const idx = indexador(alvo);
  const ano = alvo.match(/(20\d{2})/)?.[1];
  const comJuros = /JUROS SEMESTRAIS/.test(alvo);

  const candidatos = titulos.filter((t) => {
    const nome = normalizar(t.nome);
    if (idx && indexador(nome) !== idx) return false;
    if (ano && t.vencimento?.slice(0, 4) !== ano) return false;
    if (/JUROS SEMESTRAIS/.test(nome) !== comJuros) return false;
    return true;
  });

  // Sem ano informado (ex.: "SELIC"), usa o vencimento mais próximo disponível.
  return candidatos[0] ?? null;
}

/** Preço unitário de compra do título correspondente ao ativo informado. */
export async function precoTesouro(entrada: string): Promise<number | null> {
  const titulo = casarTitulo(entrada, await listarTesouroDireto());
  return titulo?.precoCompra ?? titulo?.precoVenda ?? null;
}
