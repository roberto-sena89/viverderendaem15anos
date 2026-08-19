/**
 * Conhecimento de mercado do Gestor IA — base dinâmica alimentada por um
 * scanner que varre a internet (Banco Central, feeds de notícias e Google
 * News educacional) e a estrutura em itens curados de macro, mercado,
 * notícias e educação. O conhecimento é persistido em `cotacoes_cache`
 * (chave `gestor:conhecimento`) e injetado no prompt do chat conforme a
 * relevância com a pergunta do usuário.
 */

import type { Json } from "@/integrations/supabase/types";

export type CategoriaConhecimento = "macro" | "mercado" | "educacao" | "noticias";

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

async function buscarRss(consulta: string, limite: number): Promise<ConhecimentoItem[]> {
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
        categoria: "mercado",
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

const BUSCAS_EDUCACIONAIS = [
  'when:2d ("educação financeira" OR "investidor iniciante") lang:pt',
  'when:2d ("renda passiva" OR "dividendos") lang:pt',
  'when:2d ("fundos imobiliários" OR FII) lang:pt',
  'when:2d ("Selic" OR "taxa de juros" OR "IPCA" OR "inflação") lang:pt',
  'when:2d ("bolsa de valores" OR "B3" OR "mercado de capitais") lang:pt',
  'when:2d ("aposentadoria" OR "independência financeira" OR "reserva de emergência") lang:pt',
];

/** Varre a internet e monta a base de conhecimento do Gestor IA. */
export async function executarScanConhecimento(agora = new Date()): Promise<BaseConhecimento> {
  const macro = await import("@/lib/radar.server").then((m) =>
    m.contextoMacro().catch(() => ({ selic: null as number | null, ipca: null as number | null })),
  );

  const itens: ConhecimentoItem[] = [
    {
      categoria: "macro",
      titulo: "Cenário macro (Banco Central)",
      conteudo:
        `Meta Selic: ${macro.selic !== null ? `${macro.selic}%` : "dado indisponível"} | ` +
        `IPCA mensal: ${macro.ipca !== null ? `${macro.ipca}%` : "dado indisponível"}. ` +
        "Use estes números para ancorar análises de renda fixa, prêmio de risco e timing de aportes.",
      fonte: "Banco Central do Brasil (SGS)",
      atualizadoEm: agora.toISOString(),
    },
  ];

  const [noticiasMod, resultados] = await Promise.all([
    import("@/lib/noticias.server").catch(() => null),
    Promise.all(BUSCAS_EDUCACIONAIS.map((q) => buscarRss(q, 6))),
  ]);

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

  for (const grupo of resultados) {
    for (const item of grupo) {
      if (itens.length >= 40) break;
      if (itens.some((i) => i.titulo === item.titulo)) continue;
      itens.push(item);
    }
  }

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
