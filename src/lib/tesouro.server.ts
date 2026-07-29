/**
 * Tesouro Direto — dados abertos do governo.
 *
 * Fonte primária: API pública do Tesouro Direto (preços e taxas do dia, atualizados
 * uma vez por dia útil). O dataset completo de séries históricas está em
 * https://www.tesourotransparente.gov.br/ckan/dataset (CSV de dezenas de MB),
 * pesado demais para rodar dentro do worker — por isso o histórico é acumulado
 * diariamente na tabela `historico_precos`.
 */

const API_TESOURO =
  "https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json";

export type TituloTesouro = {
  nome: string;
  vencimento: string | null;
  taxaCompra: number | null;
  taxaVenda: number | null;
  precoCompra: number | null;
  precoVenda: number | null;
  tipo: string | null;
  atualizadoEm: string | null;
};

type RespostaTesouro = {
  response?: {
    TrsrBdTradgList?: Array<{
      TrsrBd?: {
        nm?: string;
        mtrtyDt?: string;
        anulInvstmtRate?: number;
        anulRedRate?: number;
        untrInvstmtVal?: number;
        untrRedVal?: number;
        FinIndxs?: { nm?: string };
      };
    }>;
    BizSts?: { dtTm?: string };
  };
};

let cache: { expira: number; valor: TituloTesouro[] } | null = null;
const TTL_MS = 30 * 60 * 1000;

/** Lista todos os títulos públicos com preço e taxa do dia. */
export async function listarTesouroDireto(): Promise<TituloTesouro[]> {
  if (cache && cache.expira > Date.now()) return cache.valor;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(API_TESOURO, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Tesouro Direto respondeu ${res.status}`);
    const json = (await res.json()) as RespostaTesouro;
    const atualizadoEm = json.response?.BizSts?.dtTm ?? null;

    const titulos: TituloTesouro[] = (json.response?.TrsrBdTradgList ?? [])
      .map((item) => item.TrsrBd)
      .filter((b): b is NonNullable<typeof b> => Boolean(b?.nm))
      .map((b) => ({
        nome: String(b.nm),
        vencimento: b.mtrtyDt ? String(b.mtrtyDt).slice(0, 10) : null,
        taxaCompra: b.anulInvstmtRate ?? null,
        taxaVenda: b.anulRedRate ?? null,
        precoCompra: b.untrInvstmtVal ?? null,
        precoVenda: b.untrRedVal ?? null,
        tipo: b.FinIndxs?.nm ?? null,
        atualizadoEm,
      }));

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
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

/**
 * Casa o ticker/nome cadastrado na carteira (ex.: "Tesouro Selic 2031") com o
 * título correspondente da API do Tesouro. Exige o mesmo ano de vencimento.
 */
export function casarTitulo(entrada: string, titulos: TituloTesouro[]): TituloTesouro | null {
  const alvo = normalizar(entrada);
  if (!alvo.includes("TESOURO")) return null;
  const ano = alvo.match(/(20\d{2})/)?.[1];

  const candidatos = titulos.filter((t) => {
    const nome = normalizar(t.nome);
    if (ano && !nome.includes(ano)) return false;
    const palavras = alvo.split(" ").filter((p) => p.length > 2 && p !== "TESOURO");
    return palavras.every((p) => nome.includes(p));
  });

  return candidatos[0] ?? null;
}

/** Preço unitário de compra do título correspondente ao ticker informado. */
export async function precoTesouro(entrada: string): Promise<number | null> {
  const titulo = casarTitulo(entrada, await listarTesouroDireto());
  return titulo?.precoCompra ?? titulo?.precoVenda ?? null;
}
