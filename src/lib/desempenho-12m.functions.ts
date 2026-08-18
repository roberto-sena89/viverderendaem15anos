import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desempenho12mLote } from "./desempenho-12m.server";

const entrada = z.object({ tickers: z.array(z.string()).max(80) });

/** Retorno de 12 meses dos ativos da carteira + benchmark (Ibovespa). */
export const obterDesempenho12m = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => entrada.parse(data))
  .handler(async ({ data }) => desempenho12mLote(data.tickers));
