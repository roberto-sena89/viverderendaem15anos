/**
 * Agregador de notícias financeiras a partir de feeds RSS públicos
 * (InfoMoney, Money Times, Investing.com Brasil e Google News para Valor
 * Econômico / Reuters / Bloomberg Línea).
 *
 * Regras editoriais:
 * - Só guardamos manchete, um resumo curto próprio (recorte objetivo do lide),
 *   fonte, horário e imagem de capa divulgada pelo próprio feed.
 * - O conteúdo integral permanece sempre no veículo de origem: todo item
 *   carrega o link canônico para leitura completa.
 */

export type CategoriaNoticia =
  | "Mercados"
  | "Ações"
  | "Renda Fixa"
  | "Fundos Imobiliários"
  | "Câmbio & Cripto"
  | "Economia"
  | "Internacional"
  | "Empresas";

export const CATEGORIAS_NOTICIA: CategoriaNoticia[] = [
  "Mercados",
  "Ações",
  "Renda Fixa",
  "Fundos Imobiliários",
  "Câmbio & Cripto",
  "Economia",
  "Internacional",
  "Empresas",
];

export interface Noticia {
  id: string;
  titulo: string;
  resumo: string;
  url: string;
  fonte: string;
  autor: string | null;
  categoria: CategoriaNoticia;
  publicadoEm: string;
  imagem: string | null;
  tickers: string[];
  urgente: boolean;
  /** Peso editorial usado na ordenação por relevância. */
  relevancia: number;
}

interface FonteRss {
  nome: string;
  url: string;
  categoria: CategoriaNoticia;
  peso: number;
}

const FONTES: FonteRss[] = [
  { nome: "InfoMoney", url: "https://www.infomoney.com.br/mercados/feed/", categoria: "Mercados", peso: 10 },
  { nome: "InfoMoney", url: "https://www.infomoney.com.br/economia/feed/", categoria: "Economia", peso: 9 },
  { nome: "InfoMoney", url: "https://www.infomoney.com.br/onde-investir/feed/", categoria: "Renda Fixa", peso: 8 },
  { nome: "Money Times", url: "https://www.moneytimes.com.br/feed/", categoria: "Mercados", peso: 8 },
  { nome: "Money Times", url: "https://www.moneytimes.com.br/tag/fundos-imobiliarios/feed/", categoria: "Fundos Imobiliários", peso: 7 },
  { nome: "Investing.com", url: "https://br.investing.com/rss/news_25.rss", categoria: "Mercados", peso: 7 },
  { nome: "Investing.com", url: "https://br.investing.com/rss/news_1.rss", categoria: "Internacional", peso: 6 },
  { nome: "Investing.com", url: "https://br.investing.com/rss/news_301.rss", categoria: "Câmbio & Cripto", peso: 6 },
  {
    nome: "Valor Econômico",
    url: "https://news.google.com/rss/search?q=when:2d+site:valor.globo.com&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    categoria: "Economia",
    peso: 9,
  },
  {
    nome: "Reuters",
    url: "https://news.google.com/rss/search?q=when:2d+site:reuters.com+(brasil+OR+mercado+OR+juros)&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    categoria: "Internacional",
    peso: 8,
  },
  {
    nome: "Bloomberg Línea",
    url: "https://news.google.com/rss/search?q=when:2d+site:bloomberglinea.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    categoria: "Internacional",
    peso: 6,
  },
];

export const FONTES_DISPONIVEIS = [...new Set(FONTES.map((f) => f.nome))];

const TTL_MS = 4 * 60 * 1000;
let cache: { expira: number; itens: Noticia[] } | null = null;
let emVoo: Promise<Noticia[]> | null = null;

/* ------------------------------------------------------------------ *
 * Utilidades de parsing (regex — o runtime Worker não tem DOMParser)
 * ------------------------------------------------------------------ */

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  mdash: "—",
  ndash: "–",
};

function decodificar(texto: string): string {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (todo, nome: string) => ENTIDADES[nome.toLowerCase()] ?? todo);
}

function semTags(html: string): string {
  return decodificar(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(bloco: string, nome: string): string | null {
  const re = new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, "i");
  const m = bloco.match(re);
  return m ? decodificar(m[1]).trim() : null;
}

function atributo(bloco: string, nomeTag: string, attr: string): string | null {
  const re = new RegExp(`<${nomeTag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, "i");
  const m = bloco.match(re);
  return m ? decodificar(m[1]) : null;
}

/** Recorte objetivo do lide: até 2 frases inteiras, no máximo ~230 caracteres. */
function resumir(texto: string): string {
  const limpo = semTags(texto)
    // remove chamadas de rodapé comuns nos feeds
    .replace(/(Leia (mais|também)|Continue lendo|The post|Saiba mais)[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo) return "";
  const frases = limpo.split(/(?<=[.!?])\s+/);
  let saida = "";
  for (const frase of frases) {
    if (saida && (saida + " " + frase).length > 230) break;
    saida = saida ? `${saida} ${frase}` : frase;
    if (saida.length > 150) break;
  }
  if (saida.length > 260) saida = `${saida.slice(0, 250).replace(/\s\S*$/, "")}…`;
  return saida;
}

function extrairImagem(bloco: string): string | null {
  const candidatos = [
    atributo(bloco, "media:content", "url"),
    atributo(bloco, "media:thumbnail", "url"),
    atributo(bloco, "enclosure", "url"),
  ];
  for (const c of candidatos) {
    if (c && /^https?:\/\//.test(c)) return c;
  }
  const conteudo = `${tag(bloco, "content:encoded") ?? ""}${tag(bloco, "description") ?? ""}`;
  const img = conteudo.match(/<img[^>]*\ssrc=["']([^"']+)["']/i);
  return img && /^https?:\/\//.test(img[1]) ? img[1] : null;
}

/** Sufixos válidos de papéis negociados na B3. */
const SUFIXOS_TICKER = new Set(["3", "4", "5", "6", "11", "31", "32", "33", "34", "35", "39"]);
const FALSOS_TICKERS = new Set(["COVID19", "IBOV11", "NASDAQ100"]);

function extrairTickers(texto: string): string[] {
  const achados = texto.toUpperCase().match(/\b([A-Z]{4})(\d{1,2})\b/g) ?? [];
  const validos = achados.filter((t) => {
    if (FALSOS_TICKERS.has(t)) return false;
    return SUFIXOS_TICKER.has(t.slice(4));
  });
  return [...new Set(validos)].slice(0, 6);
}

const REGRAS_CATEGORIA: { categoria: CategoriaNoticia; termos: RegExp }[] = [
  { categoria: "Fundos Imobiliários", termos: /\bfi{1,2}s?\b|fundo imobili|fiagro|\b[a-z]{4}11\b/i },
  { categoria: "Câmbio & Cripto", termos: /\bdólar|câmbio|bitcoin|cripto|ethereum|moeda digital|real digital/i },
  { categoria: "Renda Fixa", termos: /tesouro direto|renda fixa|\bcdb\b|\blci\b|\blca\b|debênture|ipca\+|prefixad|selic/i },
  { categoria: "Empresas", termos: /balanço|resultado do \d|lucro (líquido|de)|prejuízo|receita líquida|guidance|\b\d[ºo] trimestre\b|\b\dt\d{2}\b/i },
  { categoria: "Economia", termos: /\bipca\b|inflação|\bpib\b|copom|banco central|fiscal|arcabouço|desemprego|\bcaged\b/i },
  { categoria: "Internacional", termos: /\bfed\b|wall street|nasdaq|s&p 500|estados unidos|china|europa|payroll|\bbce\b/i },
  { categoria: "Ações", termos: /\bações?\b|ibovespa|\b[a-z]{4}[3-6]\b|dividendos|small caps/i },
];

function classificar(titulo: string, resumo: string, padrao: CategoriaNoticia): CategoriaNoticia {
  const texto = `${titulo} ${resumo}`;
  for (const regra of REGRAS_CATEGORIA) {
    if (regra.termos.test(texto)) return regra.categoria;
  }
  return padrao;
}

const TERMOS_URGENTE = /\bao vivo\b|\burgente\b|breaking|últim[ao] hora|agora:|decisão do copom|halt|circuit breaker/i;

function normalizarTitulo(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Remove o sufixo " - Veículo" que o Google News acrescenta às manchetes. */
function limparTituloGoogle(titulo: string, fonte: string): string {
  return titulo.replace(new RegExp(`\\s+[-–]\\s+${fonte}\\s*$`, "i"), "").trim();
}

async function buscarFeed(fonte: FonteRss, timeoutMs = 9000): Promise<Noticia[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let xml: string;
  try {
    const res = await fetch(fonte.url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; ViverDeRenda/1.0; +https://viverderendaem15anos.lovable.app)",
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }

  const blocos = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? [];
  const itens: Noticia[] = [];

  for (const bloco of blocos.slice(0, 25)) {
    const tituloBruto = tag(bloco, "title");
    if (!tituloBruto) continue;
    const url =
      tag(bloco, "link") ??
      atributo(bloco, "link", "href") ??
      tag(bloco, "guid");
    if (!url || !/^https?:\/\//.test(url)) continue;

    const titulo = limparTituloGoogle(semTags(tituloBruto), fonte.nome);
    if (!titulo) continue;

    const descricao = tag(bloco, "description") ?? tag(bloco, "summary") ?? tag(bloco, "content") ?? "";
    const resumo = resumir(descricao);
    const dataBruta = tag(bloco, "pubDate") ?? tag(bloco, "published") ?? tag(bloco, "updated");
    const publicado = dataBruta ? new Date(dataBruta) : new Date();
    if (Number.isNaN(publicado.getTime())) continue;

    const categoria = classificar(titulo, resumo, fonte.categoria);
    const horas = (Date.now() - publicado.getTime()) / 3_600_000;
    const urgente = TERMOS_URGENTE.test(titulo) && horas < 6;

    itens.push({
      id: normalizarTitulo(titulo).slice(0, 90),
      titulo,
      resumo,
      url,
      fonte: fonte.nome,
      autor: tag(bloco, "dc:creator") ?? tag(bloco, "author"),
      categoria,
      publicadoEm: publicado.toISOString(),
      imagem: extrairImagem(bloco),
      tickers: extrairTickers(`${titulo} ${resumo}`),
      urgente,
      // Frescor + peso da fonte + bônus para manchetes com imagem e urgentes.
      relevancia:
        fonte.peso +
        Math.max(0, 24 - horas) / 2 +
        (urgente ? 12 : 0) +
        (extrairImagem(bloco) ? 2 : 0),
    });
  }

  return itens;
}

/** Lista consolidada e deduplicada das notícias de todas as fontes. */
export async function agregarNoticias(): Promise<Noticia[]> {
  if (cache && cache.expira > Date.now()) return cache.itens;
  if (emVoo) return emVoo;

  emVoo = (async () => {
    const lotes = await Promise.all(FONTES.map((f) => buscarFeed(f)));
    const vistos = new Map<string, Noticia>();

    for (const item of lotes.flat()) {
      const existente = vistos.get(item.id);
      if (!existente || item.relevancia > existente.relevancia) vistos.set(item.id, item);
    }

    const itens = [...vistos.values()].sort(
      (a, b) => new Date(b.publicadoEm).getTime() - new Date(a.publicadoEm).getTime(),
    );

    if (itens.length > 0) cache = { expira: Date.now() + TTL_MS, itens };
    return itens;
  })();

  try {
    return await emVoo;
  } finally {
    emVoo = null;
  }
}
