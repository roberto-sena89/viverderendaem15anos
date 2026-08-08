import { createFileRoute } from "@tanstack/react-router";

/**
 * Streaming de cotações (Server-Sent Events).
 *
 * Endpoint público e somente-leitura: recebe uma lista de tickers e mantém
 * a conexão aberta empurrando atualizações assim que o preço muda na fonte.
 * Usado principalmente por ativos internacionais (ETFs de exterior, stocks,
 * REITs, BDRs e cripto), que negociam fora do pregão da B3.
 *
 * O cliente cai automaticamente para o polling tradicional se o stream não
 * estiver disponível (rede, proxy sem suporte a SSE, navegador antigo).
 */

const MAX_TICKERS = 40;
const INTERVALO_MS = 5_000;
/** Encerra o stream antes do limite de execução do runtime; o cliente reconecta. */
const DURACAO_MAX_MS = 4 * 60_000;

const CATEGORIAS_VALIDAS = new Set([
  "Stocks",
  "REITs",
  "ETF (Exterior)",
  "ETF EUA",
  "BDR",
  "Criptomoedas",
]);

function parsearItens(url: URL) {
  const bruto = url.searchParams.get("itens") ?? "";
  const itens: Array<{ ticker: string; categoria: string }> = [];
  const vistos = new Set<string>();

  for (const parte of bruto.split(",")) {
    const [tickerBruto, categoriaBruta] = parte.split(":");
    const ticker = (tickerBruto ?? "").trim().toUpperCase();
    const categoria = decodeURIComponent((categoriaBruta ?? "").trim());
    if (!/^[A-Z0-9.-]{1,15}$/.test(ticker)) continue;
    if (!CATEGORIAS_VALIDAS.has(categoria)) continue;
    if (vistos.has(ticker)) continue;
    vistos.add(ticker);
    itens.push({ ticker, categoria });
    if (itens.length >= MAX_TICKERS) break;
  }
  return itens;
}

export const Route = createFileRoute("/api/public/stream/cotacoes")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const itens = parsearItens(url);

        if (itens.length === 0) {
          return Response.json({ error: "nenhum ticker válido" }, { status: 400 });
        }

        const { cotarCarteira } = await import("@/lib/cotacoes.server");
        const encoder = new TextEncoder();
        const inicio = Date.now();
        const ultimos = new Map<string, number | null>();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let aberto = true;
            const enviar = (evento: string, dados: unknown) => {
              if (!aberto) return;
              try {
                controller.enqueue(
                  encoder.encode(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`),
                );
              } catch {
                aberto = false;
              }
            };

            const fechar = () => {
              if (!aberto) return;
              aberto = false;
              try {
                controller.close();
              } catch {
                /* já encerrado */
              }
            };

            request.signal.addEventListener("abort", fechar);
            enviar("aberto", { tickers: itens.map((i) => i.ticker), intervaloMs: INTERVALO_MS });

            while (aberto && !request.signal.aborted) {
              try {
                const cotacoes = await cotarCarteira(itens);
                const mudaram = cotacoes.filter((c) => {
                  const anterior = ultimos.get(c.ticker);
                  if (anterior === c.preco) return false;
                  ultimos.set(c.ticker, c.preco);
                  return c.preco !== null;
                });
                if (mudaram.length > 0) enviar("cotacoes", { cotacoes: mudaram });
                else enviar("ping", { em: Date.now() });
              } catch {
                enviar("erro", { mensagem: "fonte indisponível" });
              }

              if (Date.now() - inicio > DURACAO_MAX_MS) {
                enviar("fim", { motivo: "reconectar" });
                break;
              }
              await new Promise((r) => setTimeout(r, INTERVALO_MS));
            }
            fechar();
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
