import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cotacaoBrapi, type CotacaoBrapi } from "@/lib/mercado-brapi.functions";

/** Intervalo de atualização automática das cotações BRAPI. */
export const INTERVALO_BRAPI_MS = 5_000;

export type UseMarketQuote = {
  loading: boolean;
  error: string | null;
  quote: CotacaoBrapi | null;
  refresh: () => void;
};

/**
 * Cotação em tempo real de um ativo, atualizada a cada 5s.
 * O intervalo é gerenciado pelo TanStack Query (limpo automaticamente ao desmontar).
 */
export function useMarketQuote(symbol: string | null): UseMarketQuote {
  const buscar = useServerFn(cotacaoBrapi);
  const ativo = Boolean(symbol && symbol.trim());

  const q = useQuery({
    queryKey: ["brapi-quote", symbol],
    queryFn: () => buscar({ data: { symbol: symbol } }),
    enabled: ativo,
    refetchInterval: INTERVALO_BRAPI_MS,
    refetchIntervalInBackground: false,
    staleTime: INTERVALO_BRAPI_MS,
    retry: 1,
  });

  const refresh = useCallback(() => {
    void q.refetch();
  }, [q]);

  return {
    loading: ativo && q.isLoading,
    error: q.error ? q.error.message : null,
    quote: q.data ?? null,
    refresh,
  };
}
