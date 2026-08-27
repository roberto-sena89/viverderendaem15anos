import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CarteiraCompartilhada } from "@/lib/carteira-publica";

/** Lê uma carteira compartilhada pelo token (rota pública, executa no servidor). */
export const lerCarteiraCompartilhada = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().min(1).max(64) }).parse(data))
  .handler(async ({ data }): Promise<CarteiraCompartilhada | null> => {
    const { lerCarteiraPorToken } = await import("@/lib/carteira-publica");
    return lerCarteiraPorToken(data.token);
  });
