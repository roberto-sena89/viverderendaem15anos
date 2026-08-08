import type {
  DetalhePanorama,
  JanelaPerformance,
  PontoSerie,
} from "@/lib/detalhe-panorama.functions";

const TTL = 30 * 60_000;
const memoria = new Map<string, { valor: DetalhePanorama; em: number }>();

/** Variação percentual entre o último ponto e o ponto de ~N dias atrás. */
function janela(serie: PontoSerie[], dias: number, rotulo: string): JanelaPerformance {
  if (serie.length < 2) return { rotulo, variacaoPercent: null };
  const ultimo = serie[serie.length - 1];
  const alvo = new Date(ultimo.data).getTime() - dias * 24 * 3600 * 1000;
  let base: PontoSerie | null = null;
  for (const p of serie) {
    if (new Date(p.data).getTime() <= alvo) base = p;
    else break;
  }
  if (!base || base.fechamento <= 0 || base.data === ultimo.data) {
    return { rotulo, variacaoPercent: null };
  }
  return {
    rotulo,
    variacaoPercent: ((ultimo.fechamento - base.fechamento) / base.fechamento) * 100,
  };
}

export async function montarDetalhe(simbolo: string): Promise<DetalhePanorama> {
  const chave = simbolo.toUpperCase();
  const cache = memoria.get(chave);
  if (cache && Date.now() - cache.em < TTL) return cache.valor;

  const { buscarHistorico } = await import("@/lib/market.server");
  const hist = await buscarHistorico(simbolo, "5y", "1wk");
  const serie = hist.serie;

  const valor: DetalhePanorama = {
    simbolo: hist.simbolo,
    nome: hist.nome,
    moeda: hist.moeda,
    serie,
    janelas: [
      janela(serie, 30, "1M"),
      janela(serie, 90, "3M"),
      janela(serie, 180, "6M"),
      janela(serie, 365, "1A"),
      janela(serie, 365 * 3, "3A"),
      janela(serie, 365 * 5, "5A"),
    ],
    estatisticas: {
      maximo: hist.resumo.maximo,
      minimo: hist.resumo.minimo,
      retornoAnualizadoPercent: hist.resumo.retornoAnualizadoPercent,
      volatilidadeAnualPercent: hist.resumo.volatilidadeAnualPercent,
      drawdownMaximoPercent: hist.resumo.drawdownMaximoPercent,
    },
  };

  memoria.set(chave, { valor, em: Date.now() });
  return valor;
}
