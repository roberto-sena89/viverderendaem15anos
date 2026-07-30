import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  planoPadrao,
  type Aporte,
  type Ativo,
  type Categoria,
  type Dividendo,
  type Meta,
  type PlanoConfig,
} from "@/lib/portfolio";

export const qk = {
  ativos: ["ativos"] as const,
  aportes: ["aportes"] as const,
  dividendos: ["dividendos"] as const,
  metas: ["metas"] as const,
  plano: ["plano"] as const,
};

/**
 * Revalida (e aguarda o refetch de) tudo que depende da carteira, incluindo
 * queries montadas em outras abas/telas, para a UI refletir o novo aporte
 * imediatamente — sem recarregar a página.
 */
async function sincronizarCarteira(
  qc: ReturnType<typeof useQueryClient>,
  chaves: readonly (readonly string[])[] = [qk.ativos, qk.aportes, qk.dividendos],
) {
  await Promise.all(
    chaves.map((queryKey) =>
      qc.invalidateQueries({ queryKey, refetchType: "all" }),
    ),
  );
}


export function useAtivos() {
  return useQuery({
    queryKey: qk.ativos,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Ativo[]> => {
      const { data, error } = await supabase.from("ativos").select("*").order("ticker");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        ticker: r.ticker,
        nome: r.nome,
        categoria: r.categoria as Categoria,
        quantidade: Number(r.quantidade),
        precoMedio: Number(r.preco_medio),
        precoAtual: Number(r.preco_atual),
        dy: Number(r.dy),
      }));
    },
  });
}

export function useAportes() {
  return useQuery({
    queryKey: qk.aportes,
    queryFn: async (): Promise<Aporte[]> => {
      const { data, error } = await supabase
        .from("aportes")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        data: r.data,
        corretora: r.corretora,
        ticker: r.ticker,
        categoria: r.categoria as Categoria,
        quantidade: Number(r.quantidade),
        preco: Number(r.preco),
        taxas: Number(r.taxas),
        observacoes: r.observacoes,
      }));
    },
  });
}

export function useDividendos() {
  return useQuery({
    queryKey: qk.dividendos,
    queryFn: async (): Promise<Dividendo[]> => {
      const { data, error } = await supabase
        .from("dividendos")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        data: r.data,
        ticker: r.ticker,
        tipo: r.tipo,
        valor: Number(r.valor),
      }));
    },
  });
}

export function useMetas() {
  return useQuery({
    queryKey: qk.metas,
    queryFn: async (): Promise<Meta[]> => {
      const { data, error } = await supabase
        .from("metas")
        .select("*")
        .order("ordem")
        .order("alvo");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        nome: r.nome,
        alvo: Number(r.alvo),
        ordem: r.ordem,
      }));
    },
  });
}

export function usePlano() {
  return useQuery({
    queryKey: qk.plano,
    queryFn: async (): Promise<PlanoConfig> => {
      const { data, error } = await supabase.from("plano_config").select("*").maybeSingle();
      if (error) throw error;
      if (!data) return planoPadrao;
      return {
        idadeAtual: data.idade_atual,
        idadeAposentadoria: data.idade_aposentadoria,
        aporteMensal: Number(data.aporte_mensal),
        aumentoAnual: Number(data.aumento_anual),
        rentabilidadeAnual: Number(data.rentabilidade_anual),
        inflacaoAnual: Number(data.inflacao_anual),
        taxaRetirada: Number(data.taxa_retirada),
      };
    },
  });
}

export function useSalvarPlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plano: PlanoConfig) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("plano_config").upsert(
        {
          user_id: userId,
          idade_atual: plano.idadeAtual,
          idade_aposentadoria: plano.idadeAposentadoria,
          aporte_mensal: plano.aporteMensal,
          aumento_anual: plano.aumentoAnual,
          rentabilidade_anual: plano.rentabilidadeAnual,
          inflacao_anual: plano.inflacaoAnual,
          taxa_retirada: plano.taxaRetirada,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.plano }),
  });
}

export interface AtivoInput {
  ticker: string;
  nome: string;
  categoria: Categoria;
  quantidade: number;
  precoMedio: number;
  precoAtual: number;
  dy: number;
}

export function useSalvarAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...a }: AtivoInput & { id?: string }) => {
      const row = {
        ticker: a.ticker.toUpperCase(),
        nome: a.nome || a.ticker.toUpperCase(),
        categoria: a.categoria,
        quantidade: a.quantidade,
        preco_medio: a.precoMedio,
        preco_atual: a.precoAtual,
        dy: a.dy,
      };
      const { error } = id
        ? await supabase.from("ativos").update(row).eq("id", id)
        : await supabase.from("ativos").insert(row);
      if (error) throw error;
    },
    onSuccess: () => sincronizarCarteira(qc, [qk.ativos]),
  });
}

export function useExcluir(tabela: "ativos" | "aportes" | "dividendos" | "metas") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tabela).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      sincronizarCarteira(
        qc,
        tabela === "aportes" ? [qk.aportes, qk.ativos] : [[tabela] as const],
      ),
  });
}


/**
 * Recalcula quantidade e preço médio do ativo a partir de TODO o histórico de
 * aportes/vendas do ticker. Usado após editar ou excluir uma transação.
 */
async function recalcularAtivo(ticker: string) {
  const t = ticker.toUpperCase();
  const { data: linhas, error } = await supabase
    .from("aportes")
    .select("*")
    .eq("ticker", t)
    .order("data", { ascending: true });
  if (error) throw error;

  let qtd = 0;
  let custo = 0;
  for (const l of linhas ?? []) {
    const q = Number(l.quantidade);
    const p = Number(l.preco);
    if (q >= 0) {
      qtd += q;
      custo += q * p;
    } else {
      const pm = qtd > 0 ? custo / qtd : 0;
      qtd += q;
      custo += q * pm;
    }
  }
  if (qtd <= 0) {
    qtd = Math.max(0, qtd);
    custo = 0;
  }
  const precoMedio = qtd > 0 ? custo / qtd : 0;

  const { data: ativo } = await supabase.from("ativos").select("*").eq("ticker", t).maybeSingle();
  if (!ativo) return;

  if (qtd === 0 && (linhas ?? []).length === 0) {
    const { error: delErr } = await supabase.from("ativos").delete().eq("id", ativo.id);
    if (delErr) throw delErr;
    return;
  }

  // Mantém o preço atual coerente: se ainda não houver cotação sincronizada,
  // usa o preço médio recalculado para o saldo não ficar zerado.
  const precoAtual = Number(ativo.preco_atual) > 0 ? Number(ativo.preco_atual) : precoMedio;

  const { error: upErr } = await supabase
    .from("ativos")
    .update({ quantidade: qtd, preco_medio: precoMedio, preco_atual: precoAtual })
    .eq("id", ativo.id);
  if (upErr) throw upErr;
}


export interface AporteInput {
  data: string;
  corretora: string;
  ticker: string;
  categoria: Categoria;
  quantidade: number;
  preco: number;
  taxas: number;
  observacoes?: string;
}

/** Registra o aporte e atualiza (ou cria) o ativo correspondente com novo preço médio. */
export function useCriarAporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: AporteInput) => {
      const ticker = a.ticker.toUpperCase();
      const { error } = await supabase.from("aportes").insert({
        data: a.data,
        corretora: a.corretora,
        ticker,
        categoria: a.categoria,
        quantidade: a.quantidade,
        preco: a.preco,
        taxas: a.taxas,
        observacoes: a.observacoes || null,
      });
      if (error) throw error;

      const { data: existente } = await supabase
        .from("ativos")
        .select("*")
        .eq("ticker", ticker)
        .maybeSingle();

      if (!existente) {
        // Primeiro aporte do ticker: cria o ativo com os dados da transação.
        const { error: insErr } = await supabase.from("ativos").insert({
          ticker,
          nome: ticker,
          categoria: a.categoria,
          quantidade: a.quantidade,
          preco_medio: a.preco,
          preco_atual: a.preco,
          dy: 0,
        });
        if (insErr) throw insErr;
      } else if (!existente.categoria && a.categoria) {
        await supabase.from("ativos").update({ categoria: a.categoria }).eq("id", existente.id);
      }

      // Fonte única de verdade: soma TODO o histórico do ticker (aportes + vendas)
      // e regrava quantidade, preço médio e preço atual do ativo.
      await recalcularAtivo(ticker);
    },
    onSuccess: () => sincronizarCarteira(qc),

  });
}

export function useCriarDividendo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: { data: string; ticker: string; tipo: string; valor: number }) => {
      const { error } = await supabase
        .from("dividendos")
        .insert({ ...d, ticker: d.ticker.toUpperCase() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dividendos }),
  });
}

export function useCriarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { nome: string; alvo: number; ordem: number }) => {
      const { error } = await supabase.from("metas").insert(m);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.metas }),
  });
}

/** Importa em lote os aportes e proventos lidos do extrato da B3. */
export function useImportarB3() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      aportes,
      dividendos,
    }: {
      aportes: AporteInput[];
      dividendos: { data: string; ticker: string; tipo: string; valor: number }[];
    }) => {
      if (aportes.length) {
        const { error } = await supabase.from("aportes").insert(
          aportes.map((a) => ({
            data: a.data,
            corretora: a.corretora,
            ticker: a.ticker.toUpperCase(),
            categoria: a.categoria,
            quantidade: a.quantidade,
            preco: a.preco,
            taxas: a.taxas,
            observacoes: a.observacoes || null,
          })),
        );
        if (error) throw error;
      }

      if (dividendos.length) {
        const { error } = await supabase
          .from("dividendos")
          .insert(dividendos.map((d) => ({ ...d, ticker: d.ticker.toUpperCase() })));
        if (error) throw error;
      }

      // Consolida posição e preço médio por ticker
      const porTicker = new Map<string, { qtd: number; total: number; categoria: Categoria }>();
      for (const a of aportes) {
        const t = a.ticker.toUpperCase();
        const atual = porTicker.get(t) ?? { qtd: 0, total: 0, categoria: a.categoria };
        atual.qtd += a.quantidade;
        atual.total += a.quantidade * a.preco;
        porTicker.set(t, atual);
      }

      const { data: existentes } = await supabase.from("ativos").select("*");
      for (const [ticker, novo] of porTicker) {
        const atual = (existentes ?? []).find((e) => e.ticker === ticker);
        if (atual) {
          const qtd = Number(atual.quantidade) + novo.qtd;
          const pm = qtd > 0 ? (Number(atual.quantidade) * Number(atual.preco_medio) + novo.total) / qtd : 0;
          const { error } = await supabase
            .from("ativos")
            .update({ quantidade: qtd, preco_medio: pm })
            .eq("id", atual.id);
          if (error) throw error;
        } else {
          const pm = novo.qtd > 0 ? novo.total / novo.qtd : 0;
          const { error } = await supabase.from("ativos").insert({
            ticker,
            nome: ticker,
            categoria: novo.categoria,
            quantidade: novo.qtd,
            preco_medio: pm,
            preco_atual: pm,
            dy: 0,
          });
          if (error) throw error;
        }
      }

      return { aportes: aportes.length, dividendos: dividendos.length };
    },
    onSuccess: () => sincronizarCarteira(qc),

  });
}

/** Edita uma transação existente e recalcula a posição dos tickers afetados. */
export function useAtualizarAporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...a }: AporteInput & { id: string }) => {
      const { data: anterior } = await supabase
        .from("aportes")
        .select("ticker")
        .eq("id", id)
        .maybeSingle();

      const ticker = a.ticker.toUpperCase();
      const { error } = await supabase
        .from("aportes")
        .update({
          data: a.data,
          corretora: a.corretora,
          ticker,
          categoria: a.categoria,
          quantidade: a.quantidade,
          preco: a.preco,
          taxas: a.taxas,
          observacoes: a.observacoes || null,
        })
        .eq("id", id);
      if (error) throw error;

      const tickers = new Set([ticker, anterior?.ticker?.toUpperCase()].filter(Boolean) as string[]);
      for (const t of tickers) await recalcularAtivo(t);
    },
    onSuccess: () => sincronizarCarteira(qc),

  });
}

/** Exclui uma transação e recalcula a posição do ticker. */
export function useExcluirAporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: linha } = await supabase
        .from("aportes")
        .select("ticker")
        .eq("id", id)
        .maybeSingle();
      const { error } = await supabase.from("aportes").delete().eq("id", id);
      if (error) throw error;
      if (linha?.ticker) await recalcularAtivo(linha.ticker);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.aportes });
      qc.invalidateQueries({ queryKey: qk.ativos });
    },
  });
}
