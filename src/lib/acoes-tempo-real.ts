/**
 * Tempo real das ações.
 *
 * Canal primário: WebSocket (Supabase Realtime) escutando `public.cotacoes_cache`.
 * Sempre que o job de aquecimento regrava a grade de ações, o novo preço e a
 * variação chegam empurrados ao navegador — sem requisição do cliente.
 *
 * Fallback: quando o WebSocket não conecta, o painel volta a fazer polling de
 * 10–20s durante o pregão (e bem mais espaçado fora dele).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LinhaAcao, RespostaAcoes } from "@/lib/acoes-base";

/** Chave da grade de ações dentro de `cotacoes_cache`. */
const CATEGORIA_ACOES = "acoes:grade";

const ESPERA_WS_MS = 8_000;

export const POLLING_PREGAO_MS = 15_000;
export const POLLING_FECHADO_MS = 300_000;

export type PrecoAoVivoAcao = {
  preco: number | null;
  variacao: number | null;
  variacaoPercent: number | null;
  volume: number | null;
};

export type CanalTempoReal = "websocket" | "polling" | "conectando";

export type EstadoTempoRealAcoes = {
  precos: Map<string, PrecoAoVivoAcao>;
  canal: CanalTempoReal;
  atualizadoEm: string | null;
  intervaloPolling: number;
};

function extrairPrecos(payload: unknown): { precos: Map<string, PrecoAoVivoAcao>; em: string | null } {
  const precos = new Map<string, PrecoAoVivoAcao>();
  const grade = payload as Partial<RespostaAcoes> | null;
  const linhas = Array.isArray(grade?.linhas) ? (grade!.linhas as LinhaAcao[]) : [];
  for (const l of linhas) {
    if (!l?.ticker) continue;
    precos.set(l.ticker, {
      preco: l.preco ?? null,
      variacao: l.variacao ?? null,
      variacaoPercent: l.variacaoPercent ?? null,
      volume: l.volume ?? null,
    });
  }
  return { precos, em: typeof grade?.atualizadoEm === "string" ? grade.atualizadoEm : null };
}

/**
 * Assina o canal de cotações de ações e informa qual estratégia está ativa.
 *
 * @param ativo   liga/desliga a sincronização (respeita a preferência do usuário)
 * @param pregao  true quando a B3 está aberta (define o ritmo do fallback)
 */
export function useAcoesAoVivo(ativo: boolean, pregao: boolean): EstadoTempoRealAcoes {
  const [precos, setPrecos] = useState<Map<string, PrecoAoVivoAcao>>(() => new Map());
  const [conectado, setConectado] = useState(false);
  const [desistiu, setDesistiu] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ativo) {
      setConectado(false);
      setDesistiu(true);
      return;
    }

    setDesistiu(false);
    let vivo = true;

    const canal = supabase
      .channel("acoes-cotacoes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cotacoes_cache",
          filter: `categoria=eq.${CATEGORIA_ACOES}`,
        },
        (mensagem) => {
          if (!vivo) return;
          const novo = (mensagem.new ?? {}) as { payload?: unknown; atualizado_em?: string };
          const { precos: mapa, em } = extrairPrecos(novo.payload);
          if (!mapa.size) return;
          setPrecos(mapa);
          setAtualizadoEm(em ?? novo.atualizado_em ?? new Date().toISOString());
        },
      )
      .subscribe((status) => {
        if (!vivo) return;
        const ok = status === "SUBSCRIBED";
        setConectado(ok);
        if (ok) setDesistiu(false);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setDesistiu(true);
        }
      });

    timeoutRef.current = window.setTimeout(() => {
      if (vivo) setDesistiu((d) => d || !conectado);
    }, ESPERA_WS_MS);

    return () => {
      vivo = false;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      supabase.removeChannel(canal);
    };
    // `conectado` é lido apenas dentro do timeout; não deve recriar o canal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  return useMemo(() => {
    const canal: CanalTempoReal = !ativo
      ? "polling"
      : conectado
        ? "websocket"
        : desistiu
          ? "polling"
          : "conectando";

    const intervaloPolling = !ativo
      ? 0
      : canal === "websocket"
        ? pregao
          ? 120_000
          : POLLING_FECHADO_MS
        : pregao
          ? POLLING_PREGAO_MS
          : POLLING_FECHADO_MS;

    return { precos, canal, atualizadoEm, intervaloPolling };
  }, [ativo, conectado, desistiu, pregao, precos, atualizadoEm]);
}

/** Aplica os preços recebidos pelo WebSocket sobre as linhas da grade. */
export function mesclarPrecosAcoes(
  linhas: LinhaAcao[],
  precos: Map<string, PrecoAoVivoAcao>,
): LinhaAcao[] {
  if (!precos.size) return linhas;
  let mudou = false;
  const saida = linhas.map((l) => {
    const p = precos.get(l.ticker);
    if (!p || p.preco === null || p.preco === l.preco) return l;
    mudou = true;
    return {
      ...l,
      preco: p.preco,
      variacao: p.variacao ?? l.variacao,
      variacaoPercent: p.variacaoPercent ?? l.variacaoPercent,
      volume: p.volume ?? l.volume,
      precoDefasado: false,
    };
  });
  return mudou ? saida : linhas;
}
