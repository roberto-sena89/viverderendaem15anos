import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CotacaoResumo {
  simbolo: string;
  nome: string;
  preco: number | null;
  variacaoPercent: number | null;
  moeda: string;
}

export interface PainelB3 {
  indices: CotacaoResumo[];
  indicadores: { nome: string; valor: number; unidade: string; data: string }[];
  atualizadoEm: string;
}

const INDICES_PAINEL: { simbolo: string; rotulo: string }[] = [
  { simbolo: "^BVSP", rotulo: "Ibovespa" },
  { simbolo: "IFIX.SA", rotulo: "IFIX" },
  { simbolo: "SMLL.SA", rotulo: "Small Caps" },
  { simbolo: "BRL=X", rotulo: "Dólar" },
];

/** Fita de cotações: índices, moedas, ETFs e principais ações da B3. */
const FITA_MERCADO: { simbolo: string; rotulo: string }[] = [
  { simbolo: "^BVSP", rotulo: "IBOV" },
  { simbolo: "IFIX.SA", rotulo: "IFIX" },
  { simbolo: "SMLL.SA", rotulo: "SMLL" },
  { simbolo: "BRL=X", rotulo: "USD" },
  { simbolo: "EURBRL=X", rotulo: "EUR" },
  { simbolo: "BTC-BRL", rotulo: "BTC" },
  { simbolo: "BOVA11.SA", rotulo: "BOVA11" },
  { simbolo: "IVVB11.SA", rotulo: "IVVB11" },
  { simbolo: "SMAL11.SA", rotulo: "SMAL11" },
  { simbolo: "HASH11.SA", rotulo: "HASH11" },
  { simbolo: "PETR4.SA", rotulo: "PETR4" },
  { simbolo: "VALE3.SA", rotulo: "VALE3" },
  { simbolo: "ITUB4.SA", rotulo: "ITUB4" },
  { simbolo: "BBAS3.SA", rotulo: "BBAS3" },
  { simbolo: "BBDC4.SA", rotulo: "BBDC4" },
  { simbolo: "ABEV3.SA", rotulo: "ABEV3" },
  { simbolo: "WEGE3.SA", rotulo: "WEGE3" },
  { simbolo: "B3SA3.SA", rotulo: "B3SA3" },
];

export const fitaMercado = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ itens: CotacaoResumo[]; atualizadoEm: string }> => {
    const mercado = await import("@/lib/market.server");
    const itens = await mercado.buscarFita(FITA_MERCADO);
    return { itens, atualizadoEm: new Date().toISOString() };
  },
);

export const rankingsAtivos = createServerFn({ method: "GET" })
  .inputValidator((d: { tipo?: "acoes" | "fiis" | "bdrs" }) => ({
    tipo: d?.tipo ?? "acoes",
  }))
  .handler(async ({ data }) => {
    const mercado = await import("@/lib/market.server");
    return mercado.buscarRankingsB3(data.tipo);
  });

export const painelB3 = createServerFn({ method: "GET" }).handler(async (): Promise<PainelB3> => {
  const mercado = await import("@/lib/market.server");

  const indices = await Promise.all(
    INDICES_PAINEL.map(async ({ simbolo, rotulo }) => {
      try {
        const c = await mercado.buscarCotacao(simbolo);
        return {
          simbolo,
          nome: rotulo,
          preco: c.preco,
          variacaoPercent: c.variacaoDiaPercent,
          moeda: c.moeda,
        };
      } catch {
        return { simbolo, nome: rotulo, preco: null, variacaoPercent: null, moeda: "BRL" };
      }
    }),
  );

  const chaves = ["selic", "cdi", "ipca"] as const;
  const indicadores = (
    await Promise.all(
      chaves.map(async (chave) => {
        try {
          const r = await mercado.buscarIndicador(chave, 1);
          const ultimo = r.serie[r.serie.length - 1];
          return ultimo
            ? { nome: r.indicador, valor: ultimo.valor, unidade: r.unidade, data: ultimo.data }
            : null;
        } catch {
          return null;
        }
      }),
    )
  ).filter((v): v is { nome: string; valor: number; unidade: string; data: string } => v !== null);

  return { indices, indicadores, atualizadoEm: new Date().toISOString() };
});

export const cotacaoAtivo = createServerFn({ method: "GET" })
  .inputValidator((d: { simbolo: string }) => ({ simbolo: String(d.simbolo).slice(0, 80) }))
  .handler(async ({ data }) => {
    const mercado = await import("@/lib/market.server");
    return mercado.buscarCotacao(data.simbolo);
  });

export const historicoAtivo = createServerFn({ method: "GET" })
  .inputValidator((d: { simbolo: string; periodo?: "1y" | "5y" | "10y" }) => ({
    simbolo: String(d.simbolo).slice(0, 80),
    periodo: d.periodo ?? "10y",
  }))
  .handler(async ({ data }) => {
    const mercado = await import("@/lib/market.server");
    return mercado.buscarHistorico(data.simbolo, data.periodo, "1mo");
  });

/** Atualiza o preço atual de todos os ativos da carteira com a cotação da B3. */
export const sincronizarPrecos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const mercado = await import("@/lib/market.server");
    const { precoAceitavel } = await import("@/lib/auditoria");
    const { data: ativos, error } = await context.supabase
      .from("ativos")
      .select("id, ticker, categoria, quantidade, preco_medio");
    if (error) throw new Error(error.message);

    let atualizados = 0;
    const falhas: string[] = [];

    for (const ativo of ativos ?? []) {
      try {
        const c = await mercado.buscarCotacao(ativo.ticker);
        if (c.preco && c.preco > 0) {
          // Guard anti-corrupção: nunca grava preço implausível vs preço médio.
          if (
            !precoAceitavel(
              {
                ticker: ativo.ticker,
                categoria: String(ativo.categoria ?? ""),
                quantidade: Number(ativo.quantidade) || 0,
                preco_medio: Number(ativo.preco_medio) || 0,
              },
              c.preco,
            )
          ) {
            falhas.push(
              `${ativo.ticker}: preço recebido (${c.preco}) implausível vs preço médio (${ativo.preco_medio}) — não gravado`,
            );
            continue;
          }
          const { error: upErr } = await context.supabase
            .from("ativos")
            .update({ preco_atual: c.preco })
            .eq("id", ativo.id);
          if (upErr) throw new Error(upErr.message);
          atualizados++;
        } else falhas.push(ativo.ticker);
      } catch {
        falhas.push(ativo.ticker);
      }
    }

    return { atualizados, falhas, total: (ativos ?? []).length };
  });

export const panoramaMercado = createServerFn({ method: "GET" })
  .inputValidator((d?: { periodo?: string }) => ({
    periodo: (["1D", "7D", "30D", "6M", "1A", "5A"].includes(String(d?.periodo))
      ? String(d?.periodo)
      : "1D") as "1D" | "7D" | "30D" | "6M" | "1A" | "5A",
  }))
  .handler(async ({ data }) => {
    const mercado = await import("@/lib/market.server");
    return mercado.buscarPanoramaMercado(data.periodo);
  });

export interface SugestaoAtivo {
  ticker: string;
  nome: string;
  fonte: "B3" | "Tesouro Transparente" | "Exterior";
  detalhe?: string | null;
  preco?: number | null;
}

/** Categorias negociadas na B3 (sufixo .SA no Yahoo). */
const CATEGORIAS_B3 = ["Ações", "FIIS", "BDR", "ETF Brasil", "Fiagro"];
const CATEGORIAS_TESOURO = ["Tesouro Direto", "Renda Fixa"];
/** Categorias que aceitam tanto papéis da B3 quanto do exterior. */
const CATEGORIAS_MISTAS = ["ETF (Global)", "ETF (Exterior)"];

/**
 * ETFs de índices internacionais listados na B3 (negociados em reais).
 *
 * Ficam no catálogo local para aparecerem no autocomplete mesmo quando a busca
 * do Yahoo falha ou devolve o papel estrangeiro homônimo (ex.: "IVVB" nos EUA
 * em vez de "IVVB11" na B3, que cotam em moedas diferentes).
 */
const ETFS_GLOBAIS_B3: Array<{ ticker: string; nome: string }> = [
  { ticker: "IVVB11", nome: "iShares S&P 500 FIC de Fundo de Índice - Investimento no Exterior" },
  { ticker: "SPXI11", nome: "It Now S&P 500 Fundo de Índice" },
  { ticker: "WRLD11", nome: "iShares MSCI ACWI FIC de Fundo de Índice" },
  { ticker: "NASD11", nome: "Trend ETF Nasdaq 100 Fundo de Índice" },
  { ticker: "URET11", nome: "Trend ETF MSCI US REITs Fundo de Índice" },
  { ticker: "EURP11", nome: "Trend ETF MSCI Europa Fundo de Índice" },
  { ticker: "ACWI11", nome: "Buena Vista ETF MSCI ACWI Fundo de Índice" },
  { ticker: "XINA11", nome: "Trend ETF MSCI China Fundo de Índice" },
  { ticker: "JAPA11", nome: "Trend ETF MSCI Japão Fundo de Índice" },
  { ticker: "BDEF11", nome: "Bradesco ETF S&P 500 Fundo de Índice" },
  { ticker: "USTK11", nome: "Investo Wilshire US Large Cap Fundo de Índice" },
  { ticker: "BIGT11", nome: "Investo Big Tech Fundo de Índice" },
  { ticker: "ALUG11", nome: "Investo US REITs Fundo de Índice" },
  { ticker: "WRLD39", nome: "BDR de ETF iShares MSCI World" },
];

/**
 * Autocomplete de ativos: títulos do Tesouro Transparente e papéis listados na
 * B3 / exterior (Yahoo Finance), filtrados pela categoria escolhida.
 */
export const procurarAtivos = createServerFn({ method: "GET" })
  .inputValidator((d: { termo: string; categoria?: string }) => ({
    termo: String(d.termo ?? "")
      .trim()
      .slice(0, 40),
    categoria: String(d.categoria ?? "").slice(0, 40),
  }))
  .handler(async ({ data }): Promise<SugestaoAtivo[]> => {
    const termo = data.termo;
    if (termo.length < 1) return [];
    const categoria = data.categoria;
    const alvo = termo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    const sugestoes: SugestaoAtivo[] = [];

    // 1) Tesouro Transparente
    if (!categoria || CATEGORIAS_TESOURO.includes(categoria) || alvo.startsWith("TESOURO")) {
      try {
        const { listarTesouroDireto } = await import("@/lib/tesouro.server");
        const hoje = new Date().toISOString().slice(0, 10);
        const titulos = (await listarTesouroDireto())
          // apenas títulos ainda disponíveis (não vencidos), do vencimento mais próximo ao mais distante
          .filter((t) => !t.vencimento || t.vencimento >= hoje)
          .sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""));
        for (const t of titulos) {
          const nome = t.nome;
          const normal = nome
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();
          if (!normal.includes(alvo) && !"TESOURO".startsWith(alvo)) continue;
          sugestoes.push({
            ticker: nome.toUpperCase(),
            nome,
            fonte: "Tesouro Transparente",
            detalhe: t.vencimento
              ? `Vencimento ${t.vencimento.split("-").reverse().join("/")}`
              : null,
            preco: t.precoCompra ?? t.precoVenda ?? null,
          });
          if (sugestoes.length >= 12) break;
        }
      } catch {
        /* fonte indisponível: segue com a B3 */
      }
    }

    // 2) ETFs internacionais listados na B3 (catálogo local, sempre disponível)
    const misto = CATEGORIAS_MISTAS.includes(categoria);
    if (!categoria || misto || categoria === "ETF Brasil") {
      for (const e of ETFS_GLOBAIS_B3) {
        const normal = e.nome
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase();
        if (!e.ticker.startsWith(alvo) && !normal.includes(alvo)) continue;
        sugestoes.push({
          ticker: e.ticker,
          nome: e.nome,
          fonte: "B3",
          detalhe: "ETF internacional negociado em reais",
        });
      }
    }

    // 3) B3 / exterior via Yahoo Finance
    if (!CATEGORIAS_TESOURO.includes(categoria)) {
      try {
        const mercado = await import("@/lib/market.server");
        const brasileiro = !categoria || CATEGORIAS_B3.includes(categoria);
        const encontrados = await mercado.procurarAtivo(termo);
        for (const a of encontrados) {
          const ehSA = a.simbolo.endsWith(".SA");
          if (categoria === "Criptomoedas" && !/-(BRL|USD)$/.test(a.simbolo)) continue;
          if (categoria && categoria !== "Criptomoedas" && !misto) {
            if (brasileiro && !ehSA) continue;
            if (!brasileiro && ehSA) continue;
          }

          sugestoes.push({
            ticker: a.simbolo.replace(/\.SA$/, ""),
            nome: a.nome ?? a.simbolo,
            fonte: ehSA ? "B3" : "Exterior",
            detalhe: a.bolsa,
          });
        }
      } catch {
        /* fonte indisponível */
      }
    }

    const vistos = new Set<string>();
    return sugestoes.filter((s) => !vistos.has(s.ticker) && vistos.add(s.ticker)).slice(0, 12);
  });
