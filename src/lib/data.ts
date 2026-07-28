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

export function useAtivos() {
  return useQuery({
    queryKey: qk.ativos,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ativos }),
  });
}

export function useExcluir(tabela: "ativos" | "aportes" | "dividendos" | "metas") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tabela).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tabela] });
      if (tabela === "aportes") qc.invalidateQueries({ queryKey: qk.ativos });
    },
  });
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

      if (existente) {
        const qtdAtual = Number(existente.quantidade);
        const novaQtd = qtdAtual + a.quantidade;
        const novoPM =
          novaQtd > 0
            ? (qtdAtual * Number(existente.preco_medio) + a.quantidade * a.preco) / novaQtd
            : a.preco;
        const { error: upErr } = await supabase
          .from("ativos")
          .update({ quantidade: novaQtd, preco_medio: novoPM })
          .eq("id", existente.id);
        if (upErr) throw upErr;
      } else {
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
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.aportes });
      qc.invalidateQueries({ queryKey: qk.ativos });
    },
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
