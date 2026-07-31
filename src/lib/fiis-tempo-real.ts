/**
 * Tempo real dos FIIs.
 *
 * Canal primário: WebSocket (Supabase Realtime) escutando `public.cotacoes_cache`.
 * Sempre que o job de aquecimento regrava a grade de FIIs, o novo preço/variação
 * chega empurrado ao navegador — sem nenhuma requisição do cliente.
 *
 * Fallback: quando o WebSocket não conecta (rede corporativa, proxy que bloqueia
 * ws, aba sem sessão), o componente volta a fazer polling de 10–20s durante o
 * pregão. O hook devolve o intervalo recomendado já pronto para o React Query.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LinhaFii, RespostaFiis } from "@/lib/fiis-base";

/** Chave da grade de FIIs dentro de `cotacoes_cache`. */
const CATEGORIA_FIIS = "fiis:grade";

/** Tempo máximo de espera pelo WebSocket antes de assumir o polling. */
const ESPERA_WS_MS = 8_000;

/** Polling de fallback durante o pregão (10–20s) e fora dele. */
export const POLLING_PREGAO_MS = 15_000;
export const POLLING_FECHADO_MS = 300_000;

export type PrecoAoVivo = {
  preco: number | null;
  variacao: number | null;
  variacaoPercent: number | null;
  volume: number | null;
};

export type CanalTempoReal = "websocket" | "polling" | "conectando";

export type EstadoTempoRealFiis = {
  /** Preços empurrados pelo WebSocket, por ticker. */
  precos: Map<string, PrecoAoVivo>;
  /** Canal efetivamente em uso no momento. */
  canal: CanalTempoReal;
  /** Momento da última mensagem recebida pelo WebSocket. */
  atualizadoEm: string | null;
  /** Intervalo de polling a usar no React Query (0 = polling desligado). */
  intervaloPolling: number;
};

function extrairPrecos(payload: unknown): { precos: Map<string, PrecoAoVivo>; em: string | null } {
  const precos = new Map<string, PrecoAoVivo>();
  const grade = payload as Partial<RespostaFiis> | null;
  const linhas = Array.isArray(grade?.linhas) ? (grade!.linhas as LinhaFii[]) : [];
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
 * Assina o canal de cotações de FIIs e informa qual estratégia está ativa.
 *
 * @param ativo   liga/desliga a sincronização (respeita a preferência do usuário)
 * @param pregao  true quando a B3 está aberta (define o ritmo do fallback)
 */
export function useFiisAoVivo(ativo: boolean, pregao: boolean): EstadoTempoRealFiis {
  const [precos, setPrecos] = useState<Map<string, PrecoAoVivo>>(() => new Map());
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
      .channel("fiis-cotacoes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cotacoes_cache",
          filter: `categoria=eq.${CATEGORIA_FIIS}`,
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

    // Se o WebSocket não subir a tempo, cai para polling sem travar a tela.
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

    // Com WebSocket ativo mantemos apenas uma rede de segurança lenta;
    // sem ele, polling de 15s no pregão (faixa de 10–20s pedida).
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
export function mesclarPrecos(linhas: LinhaFii[], precos: Map<string, PrecoAoVivo>): LinhaFii[] {
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
