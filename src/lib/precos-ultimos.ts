/**
 * Último preço válido guardado no banco (`public.precos_ultimos`).
 *
 * A carteira usa isto como rede de segurança: ao recarregar a página, ou quando
 * BRAPI e a aba "Cotações" ficam indisponíveis por um período longo, a coluna
 * "P. atual" continua mostrando o último preço válido conhecido em vez de cair
 * para o preço médio.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lerUltimosPrecos, sincronizarUltimosPrecos } from "@/lib/precos-ultimos.functions";
import type { PrecoPersistido } from "@/lib/precos-ultimos.server";

export type { PrecoPersistido };

/** Intervalo mínimo entre gravações no banco (evita escrever a cada polling). */
const INTERVALO_GRAVACAO_MS = 60_000;

export const chavePreco = (t: string) => t.trim().toUpperCase().replace(/\.SA$/i, "");

/**
 * As funções de servidor abaixo exigem sessão. Sem este gate, páginas públicas
 * (ex.: /auth) disparariam a chamada e o servidor responderia "Unauthorized".
 */
function useSessaoAtiva(): boolean {
  const [ativa, setAtiva] = useState(false);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (vivo) setAtiva(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => {
      setAtiva(Boolean(sessao));
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return ativa;
}

/** Mapa ticker -> último preço salvo no banco. */
export function useUltimosPrecosSalvos(tickers: string[]): Map<string, PrecoPersistido> {
  const buscar = useServerFn(lerUltimosPrecos);
  const autenticado = useSessaoAtiva();
  const lista = useMemo(
    () => [...new Set(tickers.map(chavePreco).filter((t) => /^[A-Z0-9.-]{2,12}$/.test(t)))].sort(),
    [tickers],
  );

  const q = useQuery({
    queryKey: ["precos-ultimos", lista.join(",")],
    queryFn: () => buscar({ data: { tickers: lista } }),
    enabled: autenticado && lista.length > 0,
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

/**
 * Pede ao servidor, no máximo uma vez por minuto, que atualize no banco o
 * último preço dos tickers acompanhados. O preço é buscado no servidor: nada
 * vindo do navegador é gravado.
 */
export function usePersistirPrecos(tickers: string[]) {
  const sincronizar = useServerFn(sincronizarUltimosPrecos);
  const autenticado = useSessaoAtiva();
  const ultimoEnvio = useRef(0);
  const lista = useMemo(
    () => [...new Set(tickers.map(chavePreco).filter((t) => /^[A-Z0-9.-]{2,12}$/.test(t)))].sort(),
    [tickers],
  );

  useEffect(() => {
    if (!autenticado || !lista.length) return;
    const enviar = () => {
      const agora = Date.now();
      if (agora - ultimoEnvio.current < INTERVALO_GRAVACAO_MS) return;
      ultimoEnvio.current = agora;
      void sincronizar({ data: { tickers: lista } }).catch(() => undefined);
    };
    enviar();
    const id = setInterval(enviar, INTERVALO_GRAVACAO_MS);
    return () => clearInterval(id);
  }, [autenticado, lista, sincronizar]);
}
