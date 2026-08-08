/**
 * Radar — hooks de dados do cliente (TanStack Query + server functions).
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  radarAnaliseIA,
  radarBacktest,
  radarDetalhe,
  radarHistoricoIA,
  radarPosicoes,
  radarSerie,
  radarVisao,
  type AnaliseIA,
  type RadarDetalhe,
  type RadarVisao,
  type RespostaBacktest,
} from "./radar.functions";
import type { LinhaRadarBase, PosicaoHistorica, PosicaoSerie } from "./radar.server";
import { sinalRadar, scoreOportunidade, type SinalRadar } from "./radar-base";

export type {
  AnaliseIA,
  LinhaRadarBase,
  PosicaoHistorica,
  PosicaoSerie,
  RadarDetalhe,
  RadarVisao,
  RespostaBacktest,
};

/** Visão completa do radar de uma categoria (grades + sinais + notícias). */
export function useRadarVisao(categoria: "acao" | "fii") {
  const buscar = useServerFn(radarVisao);
  return useQuery({
    queryKey: ["radar", "visao", categoria],
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => buscar({ data: { categoria } }),
  });
}

/** Posições históricas (busca incremental do que falta no cache). */
export function useRadarPosicoes(tickers: string[], habilitado: boolean) {
  const buscar = useServerFn(radarPosicoes);
  const lista = useMemo(
    () => [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))].sort(),
    [tickers],
  );

  const query = useQuery({
    queryKey: ["radar", "posicoes", lista],
    enabled: habilitado && lista.length > 0,
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => buscar({ data: { tickers: lista } }),
  });

  return {
    posicoes: query.data?.posicoes ?? {},
    sparklines: query.data?.sparklines ?? {},
    carregando: query.isFetching,
  };
}

/** Análise do Técnico IA para o ticker selecionado (cache 72h no servidor). */
export function useRadarAnaliseIA(ticker: string | null) {
  const buscar = useServerFn(radarAnaliseIA);
  return useQuery({
    queryKey: ["radar", "ia", ticker ?? ""],
    enabled: Boolean(ticker),
    staleTime: 72 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => buscar({ data: { ticker: ticker as string } }),
  });
}

/** Série semanal (desde o início) para o gráfico do ativo selecionado. */
export function useRadarSerie(ticker: string | null) {
  const buscar = useServerFn(radarSerie);
  return useQuery({
    queryKey: ["radar", "serie", ticker ?? ""],
    enabled: Boolean(ticker),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => buscar({ data: { ticker: ticker as string } }),
  });
}

/** Ficha completa do ativo: fundamentos + série + posição + notícias. */
export function useRadarDetalhe(ticker: string | null) {
  const buscar = useServerFn(radarDetalhe);
  return useQuery({
    queryKey: ["radar", "detalhe", ticker ?? ""],
    enabled: Boolean(ticker),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => buscar({ data: { ticker: ticker as string } }),
  });
}

/** Histórico do Técnico IA para o ativo selecionado (linha do tempo). */
export function useRadarHistoricoIA(ticker: string | null) {
  const buscar = useServerFn(radarHistoricoIA);
  return useQuery({
    queryKey: ["radar", "historico-ia", ticker ?? ""],
    enabled: Boolean(ticker),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => buscar({ data: { ticker: ticker as string } }),
  });
}

/** Backtest do sinal do radar para o ticker selecionado (cache 7 dias). */
export function useRadarBacktest(ticker: string | null, habilitado: boolean) {
  const buscar = useServerFn(radarBacktest);
  return useQuery({
    queryKey: ["radar", "backtest", ticker ?? ""],
    enabled: Boolean(ticker) && habilitado,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => buscar({ data: { ticker: ticker as string } }),
  });
}

/** Funde a visão do servidor com posições recém-carregadas e recalcula o sinal. */
export function aplicarPosicoes(
  linhas: LinhaRadarBase[],
  extras: Record<string, PosicaoHistorica>,
): (LinhaRadarBase & { sinal: SinalRadar })[] {
  return linhas.map((l) => {
    const posicao = extras[l.ticker] ?? l.posicao;
    if (!posicao) return l;
    const sinal = sinalRadar({
      variacaoDia: l.variacaoDia,
      dy12: l.dy12,
      pvp: l.pvp,
      percentil: posicao.percentil,
      noticiaImpacto: false,
    });
    const score = scoreOportunidade({
      percentil: posicao.percentil,
      dy12: l.dy12,
      drawdownMaximoPct: posicao.drawdownMaximoPct,
      noticiaImpacto: false,
    });
    return { ...l, posicao, sinal, score };
  });
}
