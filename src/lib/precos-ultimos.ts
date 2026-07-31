/**
 * Último preço válido guardado no banco (`public.precos_ultimos`).
 *
 * A carteira usa isto como rede de segurança: ao recarregar a página, ou quando
 * BRAPI e a aba "Cotações" ficam indisponíveis por um período longo, a coluna
 * "P. atual" continua mostrando o último preço válido conhecido em vez de cair
 * para o preço médio.
 */

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lerUltimosPrecos, salvarUltimosPrecos } from "@/lib/precos-ultimos.functions";
import type { PrecoPersistido } from "@/lib/precos-ultimos.server";

export type { PrecoPersistido };

/** Intervalo mínimo entre gravações no banco (evita escrever a cada polling). */
const INTERVALO_GRAVACAO_MS = 60_000;

export const chavePreco = (t: string) => t.trim().toUpperCase().replace(/\.SA$/i, "");

/** Mapa ticker -> último preço salvo no banco. */
export function useUltimosPrecosSalvos(tickers: string[]): Map<string, PrecoPersistido> {
  const buscar = useServerFn(lerUltimosPrecos);
  const lista = useMemo(
    () => [...new Set(tickers.map(chavePreco).filter((t) => /^[A-Z0-9.\-]{2,12}$/.test(t)))].sort(),
    [tickers],
  );

  const q = useQuery({
    queryKey: ["precos-ultimos", lista.join(",")],
    queryFn: () => buscar({ data: { tickers: lista } }),
    enabled: lista.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return useMemo(() => {
    const m = new Map<string, PrecoPersistido>();
    for (const p of q.data ?? []) {
      if (Number.isFinite(p.preco) && p.preco > 0) m.set(chavePreco(p.ticker), p);
    }
    return m;
  }, [q.data]);
}

/** Persiste no banco, no máximo uma vez por minuto, os preços recebidos ao vivo. */
export function usePersistirPrecos(precos: PrecoPersistido[]) {
  const salvar = useServerFn(salvarUltimosPrecos);
  const ultimoEnvio = useRef(0);
  const pendentes = useRef(new Map<string, PrecoPersistido>());

  for (const p of precos) {
    if (p && Number.isFinite(p.preco) && p.preco > 0) pendentes.current.set(chavePreco(p.ticker), p);
  }

  useEffect(() => {
    const agora = Date.now();
    if (!pendentes.current.size) return;
    if (agora - ultimoEnvio.current < INTERVALO_GRAVACAO_MS) return;
    ultimoEnvio.current = agora;
    const lote = [...pendentes.current.values()];
    pendentes.current.clear();
    void salvar({ data: { precos: lote } }).catch(() => undefined);
  }, [precos, salvar]);
}
