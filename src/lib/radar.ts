/**
 * Radar — hooks de dados do cliente (TanStack Query + server functions).
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  radarAnaliseIA,
  radarDetalhe,
  radarPosicoes,
  radarSerie,
  radarVisao,
  type AnaliseIA,
  type RadarDetalhe,
  type RadarVisao,
} from "./radar.functions";
import type { LinhaRadarBase, PosicaoHistorica, PosicaoSerie } from "./radar.server";
import { sinalRadar, type SinalRadar } from "./radar-base";

export type { AnaliseIA, LinhaRadarBase, PosicaoHistorica, PosicaoSerie, RadarDetalhe, RadarVisao };

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

  return { posicoes: query.data ?? {}, carregando: query.isFetching };
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
    return { ...l, posicao, sinal };
  });
}
