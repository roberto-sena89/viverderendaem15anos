/**
 * Leitura de métricas de SEO no Google Search Console através do gateway de conectores.
 * Fluxo obrigatório: listar propriedades verificadas -> selecionar -> consultar.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

export const SITE_ALVO = "https://viverderendaem15anos.lovable.app/";

/** Páginas acompanhadas no painel de indexação. */
export const PAGINAS_MONITORADAS = [
  "/",
  "/calculadora-juros-compostos",
  "/guia-liberdade-financeira",
  "/quanto-rende-1-milhao-por-mes",
  "/o-que-e-renda-passiva",
  "/blog/melhores-livros-financas",
];

function cabecalhos() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const conexao = process.env["GOOGLE_SEARCH_CONSOLE_API_KEY"];
  if (!lovable || !conexao) throw new Error("Conexão com o Google Search Console indisponível.");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": conexao,
  };
}

async function chamar<T>(
  caminho: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const resposta = await fetch(`${GATEWAY}${caminho}`, {
    method: init?.method ?? "GET",
    headers: { ...cabecalhos(), ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`Search Console respondeu ${resposta.status}: ${texto}`);
  }
  return (await resposta.json()) as T;
}

type SiteEntry = { siteUrl: string; permissionLevel?: string };

function cobre(siteUrl: string, alvo: URL) {
  if (siteUrl.startsWith("sc-domain:")) {
    const dominio = siteUrl.slice("sc-domain:".length).toLowerCase();
    const host = alvo.hostname.toLowerCase();
    return host === dominio || host.endsWith(`.${dominio}`);
  }
  try {
    return alvo.href.startsWith(new URL(siteUrl).href);
  } catch {
    return false;
  }
}

export type ResolucaoSite =
  | { status: "selecionado"; siteUrl: string }
  | { status: "selecao_necessaria"; candidatos: string[] };

export async function resolverSite(selecionado?: string): Promise<ResolucaoSite> {
  const { siteEntry = [] } = await chamar<{ siteEntry?: SiteEntry[] }>("/webmasters/v3/sites");
  const alvo = new URL(SITE_ALVO);
  const compativeis = siteEntry.filter(
    (e) => e.permissionLevel !== "siteUnverifiedUser" && cobre(e.siteUrl, alvo),
  );
  if (selecionado) {
    const achado = compativeis.find((e) => e.siteUrl === selecionado);
    if (!achado) throw new Error("A propriedade escolhida não está verificada para este site.");
    return { status: "selecionado", siteUrl: achado.siteUrl };
  }
  if (compativeis.length === 0)
    throw new Error("Nenhuma propriedade verificada do Search Console cobre este site.");
  if (compativeis.length === 1) return { status: "selecionado", siteUrl: compativeis[0].siteUrl };
  return { status: "selecao_necessaria", candidatos: compativeis.map((e) => e.siteUrl) };
}

function dia(offset: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

type LinhaGsc = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

async function consultar(siteUrl: string, corpo: Record<string, unknown>) {
  const dados = await chamar<{ rows?: LinhaGsc[] }>(
    `/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { method: "POST", body: corpo },
  );
  return dados.rows ?? [];
}

export type TotaisSeo = {
  cliques: number;
  impressoes: number;
  ctr: number;
  posicao: number;
};

export type SerieDia = { data: string; cliques: number; impressoes: number };
export type LinhaTabela = {
  chave: string;
  cliques: number;
  impressoes: number;
  ctr: number;
  posicao: number;
};

export type StatusSitemap = {
  caminho: string;
  ultimoEnvio?: string;
  ultimoDownload?: string;
  pendente?: boolean;
  erros: number;
  avisos: number;
  urlsEnviadas: number;
  urlsIndexadas: number;
};

export type PaginaIndexada = {
  caminho: string;
  url: string;
  veredito?: string;
  cobertura?: string;
  canonicaGoogle?: string;
  canonicaUsuario?: string;
  ultimoRastreio?: string;
  robots?: string;
  erro?: string;
};

export type PainelSeo = {
  siteUrl: string;
  periodo: { inicio: string; fim: string };
  totais: TotaisSeo;
  totaisAnteriores: TotaisSeo;
  serie: SerieDia[];
  consultas: LinhaTabela[];
  paginas: LinhaTabela[];
  sitemaps: StatusSitemap[];
  indexacao: PaginaIndexada[];
  atualizadoEm: string;
};

function somar(linhas: LinhaGsc[]): TotaisSeo {
  const cliques = linhas.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const impressoes = linhas.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const posicao =
    impressoes > 0
      ? linhas.reduce((s, r) => s + (r.position ?? 0) * (r.impressions ?? 0), 0) / impressoes
      : 0;
  return { cliques, impressoes, ctr: impressoes > 0 ? cliques / impressoes : 0, posicao };
}

function mapear(linhas: LinhaGsc[]): LinhaTabela[] {
  return linhas.map((r) => ({
    chave: r.keys?.[0] ?? "—",
    cliques: r.clicks ?? 0,
    impressoes: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    posicao: r.position ?? 0,
  }));
}

async function lerSitemaps(siteUrl: string): Promise<StatusSitemap[]> {
  try {
    const dados = await chamar<{
      sitemap?: {
        path?: string;
        lastSubmitted?: string;
        lastDownloaded?: string;
        isPending?: boolean;
        errors?: string | number;
        warnings?: string | number;
        contents?: { submitted?: string | number; indexed?: string | number }[];
      }[];
    }>(`/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`);
    return (dados.sitemap ?? []).map((s) => ({
      caminho: s.path ?? "—",
      ultimoEnvio: s.lastSubmitted,
      ultimoDownload: s.lastDownloaded,
      pendente: s.isPending,
      erros: Number(s.errors ?? 0),
      avisos: Number(s.warnings ?? 0),
      urlsEnviadas: (s.contents ?? []).reduce((t, c) => t + Number(c.submitted ?? 0), 0),
      urlsIndexadas: (s.contents ?? []).reduce((t, c) => t + Number(c.indexed ?? 0), 0),
    }));
  } catch {
    return [];
  }
}

async function inspecionar(siteUrl: string, caminho: string): Promise<PaginaIndexada> {
  const url = new URL(caminho, SITE_ALVO).href;
  try {
    const dados = await chamar<{
      inspectionResult?: {
        indexStatusResult?: {
          verdict?: string;
          coverageState?: string;
          googleCanonical?: string;
          userCanonical?: string;
          lastCrawlTime?: string;
          robotsTxtState?: string;
        };
      };
    }>("/v1/urlInspection/index:inspect", {
      method: "POST",
      body: { inspectionUrl: url, siteUrl },
    });
    const r = dados.inspectionResult?.indexStatusResult ?? {};
    return {
      caminho,
      url,
      veredito: r.verdict,
      cobertura: r.coverageState,
      canonicaGoogle: r.googleCanonical,
      canonicaUsuario: r.userCanonical,
      ultimoRastreio: r.lastCrawlTime,
      robots: r.robotsTxtState,
    };
  } catch (e) {
    return { caminho, url, erro: e instanceof Error ? e.message : "Falha na inspeção" };
  }
}

export async function carregarPainelSeo(selecionado?: string) {
  const resolucao = await resolverSite(selecionado);
  if (resolucao.status === "selecao_necessaria") return resolucao;
  const siteUrl = resolucao.siteUrl;

  // Search Console tem ~3 dias de defasagem; usamos 28 dias completos.
  const fim = dia(3);
  const inicio = dia(30);
  const fimAnterior = dia(31);
  const inicioAnterior = dia(58);
  const base = { startDate: inicio, endDate: fim };

  const [serieLinhas, anteriores, consultas, paginas, sitemaps, indexacao] = await Promise.all([
    consultar(siteUrl, { ...base, dimensions: ["date"], rowLimit: 60 }),
    consultar(siteUrl, { startDate: inicioAnterior, endDate: fimAnterior, dimensions: ["date"], rowLimit: 60 }),
    consultar(siteUrl, { ...base, dimensions: ["query"], rowLimit: 15 }),
    consultar(siteUrl, { ...base, dimensions: ["page"], rowLimit: 15 }),
    lerSitemaps(siteUrl),
    Promise.all(PAGINAS_MONITORADAS.map((p) => inspecionar(siteUrl, p))),
  ]);

  const painel: PainelSeo = {
    siteUrl,
    periodo: { inicio, fim },
    totais: somar(serieLinhas),
    totaisAnteriores: somar(anteriores),
    serie: serieLinhas.map((r) => ({
      data: r.keys?.[0] ?? "",
      cliques: r.clicks ?? 0,
      impressoes: r.impressions ?? 0,
    })),
    consultas: mapear(consultas),
    paginas: mapear(paginas).map((p) => ({
      ...p,
      chave: p.chave.replace(/^https?:\/\/[^/]+/, "") || "/",
    })),
    sitemaps,
    indexacao,
    atualizadoEm: new Date().toISOString(),
  };
  return { status: "selecionado" as const, painel };
}
