/**
 * Camada modular de cotações em lote para os ativos da carteira.
 *
 * Cada "provedor" resolve um subconjunto de tickers. Para adicionar/trocar
 * fontes no futuro basta registrar outro provedor em `PROVEDORES` — a
 * interface (`CotacaoLive`) e a UI permanecem inalteradas.
 */

export type CotacaoLive = {
  ticker: string;
  preco: number | null;
  fechamentoAnterior: number | null;
  variacaoPercent: number | null;
  moeda: string;
  fonte: string;
  atualizadoEm: string;
  erro?: string;
};

export type PedidoCotacao = { ticker: string; categoria: string };

type Provedor = {
  id: string;
  /** Decide se este provedor atende o ativo. */
  aceita: (p: PedidoCotacao) => boolean;
  cotar: (pedidos: PedidoCotacao[]) => Promise<CotacaoLive[]>;
};

const CATEGORIAS_TESOURO = ["Tesouro Direto", "Tesouro", "Renda Fixa", "Fundos de Investimentos"];
const CATEGORIAS_EXTERIOR = ["Stocks", "REITs", "ETF (Exterior)", "ETF EUA", "BDR"];

const agora = () => new Date().toISOString();

const falha = (ticker: string, fonte: string, erro: string): CotacaoLive => ({
  ticker,
  preco: null,
  fechamentoAnterior: null,
  variacaoPercent: null,
  moeda: "BRL",
  fonte,
  atualizadoEm: agora(),
  erro,
});

/** Ticker "limpo" da B3 (sem sufixo .SA e sem espaços). */
const tickerB3 = (t: string) => t.trim().toUpperCase().replace(/\.SA$/i, "");

/* ------------------------------------------------------------------ *
 * Provedor 1 — B3 (ações, FIIs, ETFs, Fiagro) via brapi.dev em lote.
 * ------------------------------------------------------------------ */

type BrapiResposta = {
  results?: Array<{
    symbol?: string;
    currency?: string;
    regularMarketPrice?: number | null;
    regularMarketPreviousClose?: number | null;
    regularMarketChangePercent?: number | null;
  }>;
};

async function brapiLote(tickers: string[]): Promise<Map<string, CotacaoLive>> {
  const mapa = new Map<string, CotacaoLive>();
  const token = process.env.BRAPI_TOKEN;
  const tamanho = token ? 20 : 5;

  for (let i = 0; i < tickers.length; i += tamanho) {
    const lote = tickers.slice(i, i + tamanho);
    try {
      const url = `https://brapi.dev/api/quote/${lote.join(",")}${token ? `?token=${token}` : ""}`;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const json = (await res.json()) as BrapiResposta;
      for (const r of json.results ?? []) {
        if (!r.symbol || !r.regularMarketPrice) continue;
        const chave = tickerB3(r.symbol);
        const preco = r.regularMarketPrice;
        const anterior = r.regularMarketPreviousClose ?? null;
        mapa.set(chave, {
          ticker: chave,
          preco,
          fechamentoAnterior: anterior,
          variacaoPercent:
            r.regularMarketChangePercent ??
            (anterior && anterior > 0 ? ((preco - anterior) / anterior) * 100 : null),
          moeda: r.currency ?? "BRL",
          fonte: "brapi",
          atualizadoEm: agora(),
        });
      }
    } catch {
      /* lote indisponível: os tickers caem no fallback do Yahoo */
    }
  }
  return mapa;
}

const provedorB3: Provedor = {
  id: "b3",
  aceita: (p) => !CATEGORIAS_TESOURO.includes(p.categoria) && !CATEGORIAS_EXTERIOR.includes(p.categoria) && p.categoria !== "Criptomoedas",
  cotar: async (pedidos) => {
    const mercado = await import("@/lib/market.server");
    const chaves = [...new Set(pedidos.map((p) => tickerB3(p.ticker)))];
    const mapa = await brapiLote(chaves);
    const saida: CotacaoLive[] = [];

    for (const chave of chaves) {
      const achado = mapa.get(chave);
      if (achado) {
        saida.push(achado);
        continue;
      }
      // Fallback individual (Yahoo), sem travar os demais ativos.
      try {
        const c = await mercado.buscarCotacao(`${chave}.SA`);
        saida.push({
          ticker: chave,
          preco: c.preco,
          fechamentoAnterior: c.fechamentoAnterior,
          variacaoPercent: c.variacaoDiaPercent,
          moeda: c.moeda ?? "BRL",
          fonte: "yahoo",
          atualizadoEm: c.atualizadoEm ?? agora(),
        });
      } catch {
        saida.push(falha(chave, "b3", "Ativo não encontrado na fonte de mercado."));
      }
    }
    return saida;
  },
};

/* ------------------------------------------------------------------ *
 * Provedor 2 — Exterior e cripto (Yahoo Finance).
 * ------------------------------------------------------------------ */

/** Dólar comercial (USD→BRL) com cache curto em memória do worker. */
let cacheDolar: { valor: number; em: number } | null = null;

async function dolarParaReal(): Promise<number | null> {
  if (cacheDolar && Date.now() - cacheDolar.em < 60_000) return cacheDolar.valor;
  try {
    const mercado = await import("@/lib/market.server");
    const c = await mercado.buscarCotacao("USDBRL=X");
    if (c.preco && c.preco > 0) {
      cacheDolar = { valor: c.preco, em: Date.now() };
      return c.preco;
    }
  } catch {
    /* mantém o último valor conhecido, se houver */
  }
  return cacheDolar?.valor ?? null;
}

const provedorGlobal: Provedor = {
  id: "global",
  aceita: (p) => CATEGORIAS_EXTERIOR.includes(p.categoria) || p.categoria === "Criptomoedas",
  cotar: async (pedidos) => {
    const mercado = await import("@/lib/market.server");
    const saida: CotacaoLive[] = [];
    for (const p of pedidos) {
      const base = p.ticker.trim().toUpperCase();
      const simbolo =
        p.categoria === "Criptomoedas" && !base.includes("-") ? `${base}-BRL` : base;
      try {
        const c = await mercado.buscarCotacao(simbolo);
        const moeda = (c.moeda ?? "USD").toUpperCase();
        // A carteira é contabilizada em reais: converte cotações em moeda
        // estrangeira pelo câmbio do momento (ETFs globais, stocks, REITs…).
        const cambio = moeda === "BRL" ? 1 : await dolarParaReal();
        const fator = moeda === "BRL" ? 1 : (cambio ?? 1);
        const converteu = moeda !== "BRL" && cambio !== null;
        saida.push({
          ticker: base,
          preco: c.preco === null ? null : c.preco * fator,
          fechamentoAnterior: c.fechamentoAnterior === null ? null : c.fechamentoAnterior * fator,
          variacaoPercent: c.variacaoDiaPercent,
          moeda: converteu || moeda === "BRL" ? "BRL" : moeda,
          fonte: converteu ? `yahoo (${moeda}→BRL)` : "yahoo",
          atualizadoEm: c.atualizadoEm ?? agora(),
        });
      } catch {
        saida.push(falha(base, "yahoo", "Cotação indisponível para este ticker."));
      }
    }
    return saida;
  },
};

/* ------------------------------------------------------------------ *
 * Provedor 3 — Tesouro Direto / Renda Fixa (Tesouro Transparente, diário).
 * ------------------------------------------------------------------ */

const provedorTesouro: Provedor = {
  id: "tesouro",
  aceita: (p) => CATEGORIAS_TESOURO.includes(p.categoria),
  cotar: async (pedidos) => {
    const saida: CotacaoLive[] = [];
    try {
      const { precoTesouro } = await import("@/lib/tesouro.server");
      for (const p of pedidos) {
        try {
          const preco = await precoTesouro(p.ticker);
          saida.push({
            ticker: p.ticker.toUpperCase(),
            preco: preco ?? null,
            fechamentoAnterior: null,
            variacaoPercent: null,
            moeda: "BRL",
            fonte: "Tesouro Transparente",
            atualizadoEm: agora(),
            erro: preco ? undefined : "Título não localizado na tabela do Tesouro.",
          });
        } catch {
          saida.push(falha(p.ticker.toUpperCase(), "Tesouro Transparente", "Fonte indisponível."));
        }
      }
    } catch {
      for (const p of pedidos) saida.push(falha(p.ticker.toUpperCase(), "Tesouro Transparente", "Fonte indisponível."));
    }
    return saida;
  },
};

const PROVEDORES: Provedor[] = [provedorTesouro, provedorGlobal, provedorB3];

/** Cota todos os ativos pedidos, agrupando por provedor (batch). */
export async function cotarCarteira(pedidos: PedidoCotacao[]): Promise<CotacaoLive[]> {
  const vistos = new Set<string>();
  const unicos = pedidos.filter((p) => {
    const chave = `${p.categoria}|${p.ticker.trim().toUpperCase()}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });

  const grupos = PROVEDORES.map((prov) => ({
    prov,
    itens: unicos.filter((p) => prov.aceita(p)),
  })).filter((g) => g.itens.length > 0);

  const resultados = await Promise.all(
    grupos.map(async (g) => {
      try {
        return await g.prov.cotar(g.itens);
      } catch {
        return g.itens.map((p) => falha(p.ticker.toUpperCase(), g.prov.id, "Provedor indisponível."));
      }
    }),
  );

  return resultados.flat();
}
