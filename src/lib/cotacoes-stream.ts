import { useEffect, useRef, useState } from "react";
import type { CotacaoLive } from "@/lib/cotacoes.functions";

/**
 * Assinatura de cotações em tempo real por streaming (SSE).
 *
 * Ativos internacionais (ETFs de exterior, stocks, REITs, BDRs e cripto)
 * continuam negociando fora do pregão da B3, então em vez de polling fixo
 * mantemos uma conexão aberta que empurra o preço assim que ele muda na
 * fonte. Se o stream falhar, o consumidor volta ao polling normal.
 */

export type StatusStream = "inativo" | "conectando" | "ao-vivo" | "indisponivel";

export interface ItemStream {
  ticker: string;
  categoria: string;
}

const CATEGORIAS_STREAM = new Set([
  "Stocks",
  "REITs",
  "ETF (Exterior)",
  "ETF EUA",
  "BDR",
  "Criptomoedas",
]);

/** Filtra os ativos que a fonte de streaming consegue acompanhar. */
export function itensStreamaveis(
  ativos: Array<{ ticker: string; categoria: unknown }>,
): ItemStream[] {
  const vistos = new Set<string>();
  const itens: ItemStream[] = [];
  for (const a of ativos) {
    const categoria = String(a.categoria);
    const ticker = a.ticker.trim().toUpperCase();
    if (!CATEGORIAS_STREAM.has(categoria) || vistos.has(ticker)) continue;
    vistos.add(ticker);
    itens.push({ ticker, categoria });
  }
  return itens;
}

export function chaveStream(itens: ItemStream[]) {
  return itens
    .map((i) => `${i.ticker}:${encodeURIComponent(i.categoria)}`)
    .sort()
    .join(",");
}

interface OpcoesStream {
  /** Liga/desliga a assinatura (ex.: usuário desativou a sincronização). */
  habilitado: boolean;
  /** Recebe cada lote de cotações empurrado pela fonte. */
  aoReceber: (cotacoes: CotacaoLive[]) => void;
}

export function useCotacoesStream(itens: ItemStream[], { habilitado, aoReceber }: OpcoesStream) {
  const [status, setStatus] = useState<StatusStream>("inativo");
  const chave = chaveStream(itens);
  const callbackRef = useRef(aoReceber);
  callbackRef.current = aoReceber;

  useEffect(() => {
    if (!habilitado || chave.length === 0 || typeof window === "undefined") {
      setStatus("inativo");
      return;
    }
    if (typeof window.EventSource === "undefined") {
      setStatus("indisponivel");
      return;
    }

    let fonte: EventSource | null = null;
    let reconexao: number | undefined;
    let falhas = 0;
    let encerrado = false;

    const conectar = () => {
      if (encerrado) return;
      setStatus((s) => (s === "ao-vivo" ? s : "conectando"));
      fonte = new EventSource(`/api/public/stream/cotacoes?itens=${chave}`);

      fonte.addEventListener("aberto", () => {
        falhas = 0;
        setStatus("ao-vivo");
      });

      fonte.addEventListener("cotacoes", (evento) => {
        try {
          const payload = JSON.parse(String(evento.data)) as { cotacoes: CotacaoLive[] };
          if (payload.cotacoes?.length) {
            setStatus("ao-vivo");
            callbackRef.current(payload.cotacoes);
          }
        } catch {
          /* payload inválido: ignora este evento */
        }
      });

      fonte.addEventListener("fim", () => {
        // Fim programado do stream: reconecta imediatamente.
        fonte?.close();
        reconexao = window.setTimeout(conectar, 500);
      });

      fonte.onerror = () => {
        fonte?.close();
        falhas += 1;
        if (falhas >= 3) {
          // Fonte sem suporte a streaming: consumidor volta ao polling.
          setStatus("indisponivel");
          return;
        }
        setStatus("conectando");
        reconexao = window.setTimeout(conectar, Math.min(2_000 * falhas, 15_000));
      };
    };

    conectar();

    return () => {
      encerrado = true;
      if (reconexao) window.clearTimeout(reconexao);
      fonte?.close();
      setStatus("inativo");
    };
  }, [chave, habilitado]);

  return { status, streaming: status === "ao-vivo" };
}
