import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HabilidadeIA {
  id: string;
  nome: string;
  titulo: string;
  instrucao: string;
  ativo: boolean;
}

export interface HabilidadeSugerida {
  nome: string;
  titulo: string;
  instrucao: string;
}

/** Habilidades padrão oferecidas no primeiro acesso — o usuário pode
 * desativar, editar o ensino ou criar as próprias habilidades. */
export const HABILIDADES_SUGERIDAS: HabilidadeSugerida[] = [
  {
    nome: "noticias_tempo_real",
    titulo: "Leitura de notícias em tempo real",
    instrucao:
      "Sempre que o usuário perguntar o que está acontecendo no mercado, se houve notícia relevante ou pedir contexto noticioso, chame a ferramenta noticiasMercado (e agendaEconomica quando houver evento próximo). Resuma as 2-3 notícias mais relevantes, conecte cada uma com a carteira do usuário ou com o tema da pergunta, e cite a fonte e a data da notícia.",
  },
  {
    nome: "mercado_global",
    titulo: "Cenário global dos investimentos",
    instrucao:
      "Ao analisar a carteira, comparar desempenho ou sugerir aportes, considere também o cenário internacional: S&P 500 e Nasdaq (via indicesMercado), câmbio USD/BRL, juros americanos (Fed) e dados das bolsas globais. Use compararBenchmark e historico para embasar comparações internacionais e explique o impacto do cenário global nas classes da carteira do usuário.",
  },
  {
    nome: "auditoria_profunda",
    titulo: "Auditoria profunda da carteira",
    instrucao:
      "Em auditorias completas, execute obrigatoriamente a sequência: analisarCarteira → historicoAportes (incluindo a conciliação com a carteira) → historicoDividendos → sugerirRebalanceamento → educacaoPush. Apresente os números reais (patrimônio atual, total investido hoje, total aportado no histórico e renda passiva estimada) sempre separados das projeções de longo prazo, e encerre com um plano de ação de 3-5 passos.",
  },
  {
    nome: "estrategia_dividendos",
    titulo: "Estratégia de dividendos",
    instrucao:
      "Para recomendar ativos de renda passiva, priorize dividend yield consistente e recorrente — não apenas o DY mais alto. Antes de recomendar, confira a recorrência dos proventos com historicoDividendos e explique a diferença entre yield on cost e dividend yield atual. Use o preço-teto de Bazin (dividendo dos últimos 12 meses ÷ taxa mínima desejada) como filtro, nunca como verdade absoluta.",
  },
  {
    nome: "macroeconomia_aplicada",
    titulo: "Macroeconomia aplicada à carteira",
    instrucao:
      "Use indicadorEconomico e projecaoJuros (Selic, CDI, IPCA, PIB, câmbio e boletim Focus) para fundamentar sugestões de renda fixa, prazos e timing de aportes. Explique em linguagem simples como a taxa de juros atual e a inflação afetam cada classe (Tesouro Selic, IPCA+, prefixado, ações e FIIs) antes de sugerir novos aportes.",
  },
];

export const qkHabilidades = ["ia-habilidades"] as const;

export function useIaHabilidades() {
  return useQuery({
    queryKey: qkHabilidades,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<HabilidadeIA[]> => {
      const umNivel = async (): Promise<HabilidadeIA[]> => {
        const { data, error } = await supabase
          .from("ia_habilidades")
          .select("id, nome, titulo, instrucao, ativo")
          .order("criado_em", { ascending: true });
        if (error) throw error;
        return (data ?? []).map((r) => ({
          id: r.id,
          nome: r.nome,
          titulo: r.titulo,
          instrucao: r.instrucao,
          ativo: r.ativo,
        }));
      };

      let linhas = await umNivel();
      if (linhas.length === 0) {
        // Primeiro acesso: semeia as habilidades sugeridas para o usuário aprender de imediato.
        await supabase.from("ia_habilidades").insert(
          HABILIDADES_SUGERIDAS.map((h) => ({
            nome: h.nome,
            titulo: h.titulo,
            instrucao: h.instrucao,
            ativo: true,
          })),
        );
        linhas = await umNivel();
      }
      return linhas;
    },
  });
}

export function useCriarHabilidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: { nome: string; titulo: string; instrucao: string }) => {
      const nome = h.nome
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_");
      const { error } = await supabase.from("ia_habilidades").insert({
        nome: nome || "habilidade_customizada",
        titulo: h.titulo.trim(),
        instrucao: h.instrucao.trim(),
        ativo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qkHabilidades }),
  });
}

export function useAlternarHabilidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("ia_habilidades").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qkHabilidades }),
  });
}

export function useExcluirHabilidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ia_habilidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qkHabilidades }),
  });
}
