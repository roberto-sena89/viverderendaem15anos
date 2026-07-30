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
    tipo: (d?.tipo ?? "acoes") as "acoes" | "fiis" | "bdrs",
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
          return ultimo ? { nome: r.indicador, valor: ultimo.valor, unidade: r.unidade, data: ultimo.data } : null;
        } catch {
          return null;
        }
      }),
    )
  ).filter((v): v is { nome: string; valor: number; unidade: string; data: string } => v !== null);

  return { indices, indicadores, atualizadoEm: new Date().toISOString() };
});

export const cotacaoAtivo = createServerFn({ method: "GET" })
  .inputValidator((d: { simbolo: string }) => ({ simbolo: String(d.simbolo).slice(0, 20) }))
  .handler(async ({ data }) => {
    const mercado = await import("@/lib/market.server");
    return mercado.buscarCotacao(data.simbolo);
  });

export const historicoAtivo = createServerFn({ method: "GET" })
  .inputValidator((d: { simbolo: string; periodo?: "1y" | "5y" | "10y" }) => ({
    simbolo: String(d.simbolo).slice(0, 20),
    periodo: (d.periodo ?? "10y") as "1y" | "5y" | "10y",
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
    const { data: ativos, error } = await context.supabase.from("ativos").select("id, ticker");
    if (error) throw new Error(error.message);

    let atualizados = 0;
    const falhas: string[] = [];

    for (const ativo of ativos ?? []) {
      try {
        const c = await mercado.buscarCotacao(ativo.ticker as string);
        if (c.preco && c.preco > 0) {
          const { error: upErr } = await context.supabase
            .from("ativos")
            .update({ preco_atual: c.preco })
            .eq("id", ativo.id as string);
          if (upErr) throw new Error(upErr.message);
          atualizados++;
        } else falhas.push(ativo.ticker as string);
      } catch {
        falhas.push(ativo.ticker as string);
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
const CATEGORIAS_B3 = [
  "Ações",
  "Fundos Imobiliários",
  "BDR",
  "ETF Brasil",
  "Fiagro",
];
const CATEGORIAS_TESOURO = ["Tesouro Direto", "Renda Fixa"];

/**
 * Autocomplete de ativos: títulos do Tesouro Transparente e papéis listados na
 * B3 / exterior (Yahoo Finance), filtrados pela categoria escolhida.
 */
export const procurarAtivos = createServerFn({ method: "GET" })
  .inputValidator((d: { termo: string; categoria?: string }) => ({
    termo: String(d.termo ?? "").trim().slice(0, 40),
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
        const titulos = await listarTesouroDireto();
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
            detalhe: t.vencimento ? `Vencimento ${t.vencimento.split("-").reverse().join("/")}` : null,
            preco: t.precoCompra ?? t.precoVenda ?? null,
          });
          if (sugestoes.length >= 12) break;
        }
      } catch {
        /* fonte indisponível: segue com a B3 */
      }
    }

    // 2) B3 / exterior via Yahoo Finance
    if (!CATEGORIAS_TESOURO.includes(categoria)) {
      try {
        const mercado = await import("@/lib/market.server");
        const brasileiro = !categoria || CATEGORIAS_B3.includes(categoria);
        const encontrados = await mercado.procurarAtivo(termo);
        for (const a of encontrados) {
          const ehSA = a.simbolo.endsWith(".SA");
          if (categoria === "Criptomoedas" && !/-(BRL|USD)$/.test(a.simbolo)) continue;
          if (categoria && categoria !== "Criptomoedas") {
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
