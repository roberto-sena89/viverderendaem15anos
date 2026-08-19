/**
 * Conhecimento de mercado do Gestor IA — base dinâmica alimentada por um
 * scanner que varre a internet (Banco Central, órgãos como CVM e ANBIMA,
 * feeds de notícias, Google News educacional e setores da B3) e a estrutura
 * em itens curados de macro, mercado, setor, notícias e educação. O scanner
 * ainda monta um "Painel do analista" (síntese gerada pelo provedor de IA
 * do usuário) com o tom de um analista sênior. Tudo é persistido em
 * `cotacoes_cache` (chave `gestor:conhecimento`) e injetado no prompt do
 * chat conforme a relevância com a pergunta do usuário.
 */

import type { Json } from "@/integrations/supabase/types";
import { baseUrlProvedorEnv, provedorEnvAtivo } from "@/lib/provedores-env.server";

export type CategoriaConhecimento =
  "macro" | "mercado" | "setor" | "educacao" | "noticias" | "painel";

export interface ConhecimentoItem {
  categoria: CategoriaConhecimento;
  titulo: string;
  conteudo: string;
  fonte: string;
  atualizadoEm: string;
}

export interface BaseConhecimento {
  atualizadoEm: string;
  itens: ConhecimentoItem[];
  erro: string | null;
}

export const CHAVE_CACHE = "gestor:conhecimento";
export const INTERVALO_MINIMO_MS = 10 * 60 * 1000;

/** Orçamento de caracteres do trecho de conhecimento injetado no prompt. */
export const MAX_CONHECIMENTO_CHARS = 1300;

/** Teto de itens colecionados num scan (após deduplicação). */
const MAX_ITENS_SCAN = 60;

/* ------------------------------------------------------------------ *
 * Base de conhecimento curada (determinística — sempre disponível)
 * ------------------------------------------------------------------ */

export const CONHECIMENTO_CURADO: ConhecimentoItem[] = [
  {
    categoria: "educacao",
    titulo: "Leitura de múltiplos (P/L, P/VP, ROE)",
    conteudo:
      "P/L compara preço e lucro: baixo pode ser barato ou armadilha de valor. P/VP abaixo de 1 indica desconto sobre o patrimônio. ROE acima de 15% sugere boa rentabilidade sobre o capital próprio. Dívida líquida/patrimônio acima de 1,5 pede cautela; margens e crescimento de receita mostram qualidade do negócio.",
    fonte: "Base de conhecimento (curada)",
    atualizadoEm: "2026-01-01",
  },
  {
    categoria: "educacao",
    titulo: "Preço-teto de Bazin e preço justo de Graham",
    conteudo:
      "Bazin: dividendo dos últimos 12 meses ÷ taxa mínima desejada (6% é a referência clássica) — foco em dividendos estáveis. Graham: √(22,5 × LPA × VPA) — foco em valor. Ambos são filtros de entrada, nunca verdades absolutas; cruze sempre com fundamentos e posição histórica do preço.",
    fonte: "Base de conhecimento (curada)",
    atualizadoEm: "2026-01-01",
  },
  {
    categoria: "educacao",
    titulo: "Dividend yield muito alto exige verificação",
    conteudo:
      "DY acima de ~12% costuma ser evento não recorrente (dividendo extraordinário) ou queda do preço. Verifique a recorrência dos proventos nos últimos 12 meses antes de recomendar; diferencie yield on cost de dividend yield atual.",
    fonte: "Base de conhecimento (curada)",
    atualizadoEm: "2026-01-01",
  },
  {
    categoria: "educacao",
    titulo: "Fundos imobiliários (FIIs)",
    conteudo:
      "P/VP próximo de 1 é referência de preço justo; vacância alta pressiona a distribuição. Fundos de papel (CRI) acompanham IPCA/CDI; fundos de tijolo dependem de contratos e vacância; FOFs diversificam mas cobram dupla taxa; liquidez diária baixa dificulta a saída. Distribuições a pessoa física são isentas de IR.",
    fonte: "Base de conhecimento (curada)",
    atualizadoEm: "2026-01-01",
  },
  {
    categoria: "educacao",
    titulo: "Renda fixa estratégica",
    conteudo:
      "Tesouro Selic para reserva de emergência; prefixado trava a taxa (marcação a mercado se vender antes); IPCA+ protege o poder de compra. Escada de títulos (laddering) reduz risco de reinvestimento. Compare sempre o prêmio sobre o CDI/Selic vigente e a inflação implícita.",
    fonte: "Base de conhecimento (curada)",
    atualizadoEm: "2026-01-01",
  },
  {
    categoria: "educacao",
    titulo: "Tributação no Brasil (pessoa física)",
    conteudo:
      "Ações: isenção de IR em vendas até R$ 20 mil/mês (day trade não), 15% sobre o ganho acima disso. FIIs: 20% sobre ganho de capital; rendimentos isentos para PF. Renda fixa: tabela regressiva (22,5% a 15%). Dividendos de ações: isentos; JCP: 15% retido na fonte.",
    fonte: "Base de conhecimento (curada)",
    atualizadoEm: "2026-01-01",
  },
  {
    categoria: "educacao",
    titulo: "Reserva de emergência e independência financeira",
    conteudo:
      "Reserva: 6 a 12 meses de custo de vida em liquidez diária, antes de qualquer renda variável. Independência: regra dos 4% (patrimônio ≈ 25× o gasto anual); juros compostos e constância de aporte pesam mais do que acertar o timing.",
    fonte: "Base de conhecimento (curada)",
    atualizadoEm: "2026-01-01",
  },
  {
    categoria: "educacao",
    titulo: "Gestão de risco e alocação",
    conteudo:
      "Diversificar por classe, setor e moeda; nenhuma posição individual acima de ~10-15% do patrimônio; exposição internacional (ETFs globais/BDRs) protege contra risco Brasil e câmbio. Rebalancear quando a alocação desviar mais de 5 pontos; posição máxima, stop disciplinado e reserva de oportunidade em liquidez.",
    fonte: "Base de conhecimento (curada)",
    atualizadoEm: "2026-01-01",
  },
];

/* ------------------------------------------------------------------ *
 * Scanner: coleta de macro, notícias e conteúdo educacional da web
 * ------------------------------------------------------------------ */

function decodificarXml(texto: string): string {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(
      /&(amp|quot|apos|lt|gt|nbsp);/gi,
      (_, e: string) =>
        ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " })[e.toLowerCase()] ?? "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

async function buscarRss(
  consulta: string,
  limite: number,
  categoria: CategoriaConhecimento = "mercado",
): Promise<ConhecimentoItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    consulta,
  )}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; ViverDeRenda/1.0; +https://viverderendaem15anos.lovable.app)",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    const blocos = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi)?.slice(0, limite) ?? [];
    const itens: ConhecimentoItem[] = [];
    for (const bloco of blocos) {
      const tituloBruto = bloco.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1];
      if (!tituloBruto) continue;
      const titulo = decodificarXml(tituloBruto);
      if (!titulo) continue;
      const descricao = decodificarXml(
        bloco.match(/<description(?:\s[^>]*)?>([\s\S]*?)<\/description>/i)?.[1] ?? "",
      );
      const fonte = decodificarXml(
        bloco.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/i)?.[1] ?? "",
      );
      const data = bloco.match(/<pubDate(?:\s[^>]*)?>([\s\S]*?)<\/pubDate>/i)?.[1] ?? "";
      const dataIso = data ? new Date(data).toISOString() : new Date().toISOString();
      itens.push({
        categoria,
        titulo: titulo.slice(0, 180),
        conteudo: (descricao || titulo).slice(0, 320),
        fonte: fonte || "Google News",
        atualizadoEm: dataIso,
      });
    }
    return itens;
  } catch {
    return [];
  }
}

const BUSCAS_ORGAOS = [
  'when:3d (ANBIMA OR "índices de mercado" OR IMA) lang:pt',
  'when:3d (CVM OR "Comissão de Valores Mobiliários") lang:pt',
  'when:3d (Copom OR "Comitê de Política Monetária" OR "decisão de juros") lang:pt',
  'when:3d ("Banco Central" OR BCB OR "relatório de inflação") lang:pt',
  'when:3d (B3 OR "oferta pública" OR "listagem") lang:pt',
];

const BUSCAS_SETORES = [
  'when:3d (bancos OR "setor financeiro") (resultado OR lucro) lang:pt',
  "when:3d (energia OR petróleo OR elétrica) (resultado OR dividendos) lang:pt",
  "when:3d (varejo OR consumo) (resultado OR balanço) lang:pt",
  "when:3d (mineração OR siderurgia) (resultado OR minério) lang:pt",
  "when:3d (tecnologia OR software) (Brasil OR bolsa) lang:pt",
  'when:3d (imobiliário OR "construção civil" OR FII) lang:pt',
  'when:7d ("resultado trimestral" OR balanço OR "temporada de resultados") (empresas OR B3 OR bolsa) lang:pt',
];

const BUSCAS_EDUCACIONAIS = [
  'when:2d ("educação financeira" OR "investidor iniciante") lang:pt',
  'when:2d ("renda passiva" OR "dividendos") lang:pt',
  'when:2d ("fundos imobiliários" OR FII) lang:pt',
  'when:2d ("Selic" OR "taxa de juros" OR "IPCA" OR "inflação") lang:pt',
  'when:2d ("bolsa de valores" OR "B3" OR "mercado de capitais") lang:pt',
  'when:2d ("aposentadoria" OR "independência financeira" OR "reserva de emergência") lang:pt',
];

/* ------------------------------------------------------------------ *
 * Painel macro (Banco Central — SGS) e fundamentos reais (CVM)
 * ------------------------------------------------------------------ */

export interface EntradaIndicador {
  indicador: string;
  unidade: string;
  serie: { data: string; valor: number }[];
}

/** Formata os últimos pontos das séries SGS em texto compacto. Função pura. */
export function formatarPainelMacro(entradas: EntradaIndicador[]): string {
  const partes: string[] = [];
  for (const r of entradas) {
    const ultimo = r.serie[r.serie.length - 1];
    if (!ultimo || !Number.isFinite(ultimo.valor)) continue;
    partes.push(
      `${r.indicador}: ${ultimo.valor} ${r.unidade} (${String(ultimo.data).slice(0, 10)})`,
    );
  }
  return partes.join(" | ");
}

async function buscarPainelMacro(agora = new Date()): Promise<ConhecimentoItem | null> {
  try {
    const { buscarIndicador } = await import("@/lib/market.server");
    const chaves = ["selic", "cdi", "ipca", "igpm", "dolar", "poupanca"] as const;
    const resultados = await Promise.all(
      chaves.map((k) => buscarIndicador(k, 2).catch(() => null)),
    );
    const formato = formatarPainelMacro(
      resultados
        .filter((r): r is NonNullable<(typeof resultados)[number]> => r !== null)
        .map((r) => ({ indicador: r.indicador, unidade: r.unidade, serie: r.serie })),
    );
    if (!formato) return null;
    return {
      categoria: "macro",
      titulo: "Painel macro (Banco Central do Brasil)",
      conteudo: `${formato}. Âncore estas cifras em análises de renda fixa, prêmio de risco e timing de aportes.`,
      fonte: "Banco Central do Brasil (SGS)",
      atualizadoEm: agora.toISOString(),
    };
  } catch {
    return null;
  }
}

export interface EntradaCvmMinima {
  plAtual: number | null;
}

/** Resume o mapa de fundamentos CVM em um item de conhecimento. Função pura. */
export function montarItemCvm(
  mapa: Record<string, EntradaCvmMinima | undefined>,
  atualizadoEm: string | null,
  agora = new Date(),
): ConhecimentoItem | null {
  if (!atualizadoEm) return null;
  const comPl = Object.entries(mapa)
    .map(([ticker, f]) => ({ ticker, plAtual: f?.plAtual ?? null }))
    .filter((f): f is { ticker: string; plAtual: number } => f.plAtual !== null && f.plAtual > 0);
  if (comPl.length === 0) return null;
  const destaques = [...comPl].sort((a, b) => a.plAtual - b.plAtual).slice(0, 3);
  return {
    categoria: "mercado",
    titulo: "Fundamentos reais da CVM (balanços DFP/ITR)",
    conteudo:
      `${comPl.length} empresas com P/L e EV/EBIT derivados dos balanços oficiais (DFP/ITR). ` +
      `Destaques por menor P/L: ${destaques
        .map(
          (d) => `${d.ticker} ${d.plAtual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x`,
        )
        .join(", ")}. ` +
      `Atualizado em ${atualizadoEm.slice(0, 10)}.`,
    fonte: "CVM (Dados Abertos — DFP/ITR)",
    atualizadoEm: agora.toISOString(),
  };
}

async function buscarCvm(agora = new Date()): Promise<ConhecimentoItem | null> {
  try {
    const { lerFundamentosCvm } = await import("@/lib/cvm.server");
    const fundos = await lerFundamentosCvm();
    return montarItemCvm(fundos.mapa, fundos.atualizadoEm, agora);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Painel do analista (síntese LLM com o provedor configurado)
 * ------------------------------------------------------------------ */

const SISTEMA_PAINEL = `Você é o "Painel do Analista": síntese executiva diária do mercado financeiro brasileiro produzida por um analista sênior de mesa proprietária.

A partir do material varrido abaixo (indicadores do Banco Central, fundamentos reais da CVM e manchetes de órgãos, setores e notícias), escreva um resumo de 6 seções curtas:
- visaoGeral: 1-2 frases com o clima do mercado hoje.
- macro: juros, inflação, câmbio e o que mais mover a renda fixa.
- mercados: Bolsa, setores e o que está em destaque.
- empresas: balanços, resultados e eventos corporativos relevantes.
- riscos: 1-2 frases com o que exige atenção (eventos, dados, narrativas sem número).
- agenda: próximos eventos importantes (Copom, dados de inflação, balanços etc.).

Regras:
1. Números reais: use apenas o que está no material; nunca invente cotações ou datas.
2. Tom: objetivo, direto, de analista profissional — sem enrolação e sem recomendações formais.
3. Distinga fato de expectativa; se algo não está no material, não mencione.
4. Total de no máximo 900 caracteres.

Responda APENAS com JSON válido, sem markdown, com exatamente estas chaves:
{"visaoGeral":"...","macro":"...","mercados":"...","empresas":"...","riscos":"...","agenda":"..."}`;

const ROTULOS_SECOES_PAINEL: Record<string, string> = {
  visaoGeral: "Visão geral",
  macro: "Macro",
  mercados: "Mercados",
  empresas: "Empresas",
  riscos: "Riscos",
  agenda: "Agenda",
};

async function sintetizarPainelAnalista(
  itens: ConhecimentoItem[],
  agora = new Date(),
): Promise<ConhecimentoItem | null> {
  const ativo = provedorEnvAtivo(process.env);
  if (!ativo) return null;
  const material = itens
    .slice(0, 25)
    .map((i) => `- [${i.categoria}] ${i.titulo}: ${i.conteudo.slice(0, 200)}`)
    .join("\n");
  try {
    const { generateText } = await import("ai");
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const modeloIA = createOpenAICompatible({
      name: "gestor-ia-painel",
      baseURL: baseUrlProvedorEnv(ativo.provedor, process.env),
      headers: { Authorization: `Bearer ${ativo.chave}` },
    })(ativo.provedor.modelo);
    const resposta = await generateText({
      model: modeloIA,
      system: SISTEMA_PAINEL,
      prompt: `Material varrido em ${agora.toISOString().slice(0, 10)}:\n\n${material}`,
      maxOutputTokens: 700,
    });
    const texto = resposta.text.trim();
    const ini = texto.indexOf("{");
    const fim = texto.lastIndexOf("}");
    if (ini < 0 || fim <= ini) return null;
    const parsed = JSON.parse(texto.slice(ini, fim + 1)) as Record<string, unknown>;
    const linhas = Object.entries(ROTULOS_SECOES_PAINEL)
      .map(([chave, rotulo]) => {
        const valor = String(parsed[chave] ?? "").trim();
        return valor ? `- ${rotulo}: ${valor}` : null;
      })
      .filter((l): l is string => l !== null);
    if (linhas.length === 0) return null;
    return {
      categoria: "painel",
      titulo: "Painel do analista (síntese do Gestor IA)",
      conteudo: linhas.join("\n"),
      fonte: `Síntese do Gestor IA via ${ativo.provedor.nome}`,
      atualizadoEm: agora.toISOString(),
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Scanner: coleta de macro, órgãos, setores, notícias e educação
 * ------------------------------------------------------------------ */

/** Varre a internet e monta a base de conhecimento do Gestor IA. */
export async function executarScanConhecimento(agora = new Date()): Promise<BaseConhecimento> {
  const [itemMacro, itemCvm, noticiasMod, resultados] = await Promise.all([
    buscarPainelMacro(agora),
    buscarCvm(agora),
    import("@/lib/noticias.server").catch(() => null),
    Promise.all([
      ...BUSCAS_ORGAOS.map((q) => buscarRss(q, 4, "mercado")),
      ...BUSCAS_SETORES.map((q) => buscarRss(q, 4, "setor")),
      ...BUSCAS_EDUCACIONAIS.map((q) => buscarRss(q, 5, "educacao")),
    ]),
  ]);

  const itens: ConhecimentoItem[] = [];
  if (itemMacro) itens.push(itemMacro);
  if (itemCvm) itens.push(itemCvm);

  try {
    const feed = noticiasMod ? await noticiasMod.agregarNoticias().catch(() => []) : [];
    const vistas = new Set<string>();
    for (const n of feed) {
      const titulo = n.titulo?.trim();
      if (!titulo || vistas.has(titulo)) continue;
      vistas.add(titulo);
      itens.push({
        categoria: "noticias",
        titulo: titulo.slice(0, 180),
        conteudo: (n.resumo || n.titulo || "").slice(0, 320),
        fonte: n.fonte || "Feed de notícias",
        atualizadoEm: n.publicadoEm || agora.toISOString(),
      });
      if (vistas.size >= 10) break;
    }
  } catch {
    /* sem notícias: o conhecimento curado e o Google News cobrem */
  }

  const vistas = new Set<string>();
  for (const item of resultados.flat()) {
    if (itens.length >= MAX_ITENS_SCAN) break;
    if (vistas.has(item.titulo)) continue;
    vistas.add(item.titulo);
    itens.push(item);
  }

  let painel: ConhecimentoItem | null = null;
  try {
    const anterior = await lerConhecimento();
    painel = anterior.itens.find((i) => i.categoria === "painel") ?? null;
  } catch {
    /* sem base anterior: painel nasce só da síntese */
  }
  const sintese = await sintetizarPainelAnalista(itens, agora).catch(() => null);
  if (sintese) painel = sintese;
  if (painel) itens.unshift(painel);

  const base: BaseConhecimento = {
    atualizadoEm: agora.toISOString(),
    itens: [...CONHECIMENTO_CURADO, ...itens],
    erro: itens.length === 0 ? "Nenhuma fonte respondeu no último scan." : null,
  };

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("cotacoes_cache").upsert(
      {
        categoria: CHAVE_CACHE,
        payload: JSON.parse(JSON.stringify(base)) as Json,
        parcial: false,
        atualizado_em: agora.toISOString(),
      },
      { onConflict: "categoria" },
    );
  } catch {
    /* best-effort: o conhecimento fica disponível na memória desta execução */
  }

  memoria = { valor: base, em: Date.now() };
  return base;
}

/* ------------------------------------------------------------------ *
 * Leitura (cache em memória + banco) e seleção por relevância
 * ------------------------------------------------------------------ */

let memoria: { valor: BaseConhecimento; em: number } | null = null;
const TTL_MEMORIA_MS = 60 * 1000;
let scanEmVoo: Promise<BaseConhecimento> | null = null;

export async function lerConhecimento(): Promise<BaseConhecimento> {
  if (memoria && Date.now() - memoria.em < TTL_MEMORIA_MS) return memoria.valor;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("cotacoes_cache")
      .select("payload")
      .eq("categoria", CHAVE_CACHE)
      .maybeSingle();
    if (data?.payload && typeof data.payload === "object") {
      const p = data.payload as unknown as BaseConhecimento | null;
      if (p && Array.isArray(p.itens)) {
        const base: BaseConhecimento = {
          atualizadoEm: p.atualizadoEm ?? new Date().toISOString(),
          itens: p.itens,
          erro: p.erro ?? null,
        };
        memoria = { valor: base, em: Date.now() };
        return base;
      }
    }
  } catch {
    /* sem cache: retorna a base curada pura */
  }
  const base: BaseConhecimento = {
    atualizadoEm: new Date().toISOString(),
    itens: [...CONHECIMENTO_CURADO],
    erro: null,
  };
  return base;
}

export async function executarScanComThrottle(agora = new Date()): Promise<BaseConhecimento> {
  if (scanEmVoo) return scanEmVoo;
  scanEmVoo = (async () => {
    const atual = await lerConhecimento();
    if (atual.atualizadoEm) {
      const desde = agora.getTime() - new Date(atual.atualizadoEm).getTime();
      if (desde < INTERVALO_MINIMO_MS) return atual;
    }
    return executarScanConhecimento(agora);
  })().finally(() => {
    scanEmVoo = null;
  });
  return scanEmVoo;
}

/**
 * Seleciona os itens de conhecimento mais relevantes para a pergunta,
 * respeitando o orçamento de caracteres. Função pura (testável).
 */
export function selecionarConhecimento(
  pergunta: string,
  itens: ConhecimentoItem[],
  maxChars = MAX_CONHECIMENTO_CHARS,
): ConhecimentoItem[] {
  if (itens.length === 0) return [];
  const termos = pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(
      (t) =>
        t.length >= 3 &&
        !["para", "como", "qual", "quais", "quanto", "porque", "quando"].includes(t),
    );

  const pontuar = (item: ConhecimentoItem): number => {
    const alvo = `${item.titulo} ${item.conteudo} ${item.categoria}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    let pontos = 0;
    for (const t of termos) {
      if (alvo.includes(t)) pontos += t.length;
    }
    if (termos.length > 0 && pontos === 0) {
      const categoria = item.categoria;
      if (pergunta.toLowerCase().includes("selic") && categoria === "macro") pontos += 3;
      if (/fii|imobili|papel|tijolo/i.test(pergunta) && categoria === "educacao") pontos += 3;
    }
    return pontos;
  };

  const ordenados = [...itens].sort((a, b) => {
    const pa = pontuar(a);
    const pb = pontuar(b);
    if (pa !== pb) return pb - pa;
    return new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime();
  });

  const escolhidos: ConhecimentoItem[] = [];
  let tamanho = 0;
  for (const item of ordenados) {
    const bloco = `[${item.categoria}] ${item.titulo}: ${item.conteudo} (${item.fonte})`;
    if (tamanho + bloco.length > maxChars && escolhidos.length > 0) break;
    if (tamanho + bloco.length > maxChars * 2) break;
    escolhidos.push(item);
    tamanho += bloco.length;
  }
  if (escolhidos.length === 0 && ordenados.length > 0) {
    escolhidos.push(ordenados[0]);
  }
  return escolhidos;
}
