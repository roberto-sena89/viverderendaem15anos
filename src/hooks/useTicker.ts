import { useCallback } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cotacoesTicker, type CotacaoTicker } from "@/services/marketService";

export type UseTicker = {
  assets: CotacaoTicker[];
  loading: boolean;
  /** true quando a BRAPI falhou e estamos exibindo o último preço em cache. */
  degradado: boolean;
  atualizadoEm: number | null;
  refresh: () => void;
};

/** Cotações da fita, atualizadas automaticamente (padrão: 5s). */
export function useTicker(refreshInterval = 5_000): UseTicker {
  const buscar = useServerFn(cotacoesTicker);

  const q = useQuery({
    queryKey: ["ticker-tape"],
    queryFn: () => buscar({}),
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: refreshInterval,
    gcTime: 60 * 60 * 1000,
    retry: 3,
    retryDelay: (t) => Math.min(30_000, 2 ** t * 1000),
    placeholderData: keepPreviousData,
  });

  const refresh = useCallback(() => {
    void q.refetch();
  }, [q]);

  return {
    assets: q.data?.itens ?? [],
    loading: q.isLoading,
    degradado: q.isError,
    atualizadoEm: q.dataUpdatedAt || null,
    refresh,
  };
}
