import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validarBaseUrlProvedor } from "@/lib/url-provedor-ia";

const entrada = z.object({
  baseUrl: z.string().min(1),
  chave: z.string().min(1),
  preset: z.string().optional().default(""),
});

const AUTH_HEADER_POR_PRESET: Record<string, string> = {};

export interface ResultadoTesteProvedor {
  ok: boolean;
  status: number;
  mensagem: string;
  modelos: string[];
}

/** Valida a chave do provedor e lista os modelos disponíveis (endpoint /models). */
export const testarProvedorIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => entrada.parse(data))
  .handler(async ({ data }): Promise<ResultadoTesteProvedor> => {
    const validacao = validarBaseUrlProvedor(data.baseUrl);
    if (!validacao.ok) {
      return { ok: false, status: 0, mensagem: validacao.motivo, modelos: [] };
    }
    const base = validacao.url;
    const headerAuth = AUTH_HEADER_POR_PRESET[data.preset] ?? "Authorization";
    try {
      const resposta = await fetch(`${base}/models`, {
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          [headerAuth]: headerAuth === "Authorization" ? `Bearer ${data.chave.trim()}` : data.chave.trim(),
          "Content-Type": "application/json",
        },
      });

      const texto = await resposta.text();

      if (!resposta.ok) {
        let detalhe = texto.slice(0, 200);
        try {
          const json = JSON.parse(texto) as { error?: { message?: string } | string };
          const err = json.error;
          detalhe = (typeof err === "string" ? err : err?.message) ?? detalhe;
        } catch {
          /* mantém texto bruto */
        }
        const mensagens: Record<number, string> = {
          401: "Chave de API inválida ou expirada.",
          403: "Chave sem permissão para este provedor.",
          404: "Endpoint /models não encontrado nesta URL base.",
          429: "Limite de requisições atingido no provedor.",
        };
        return {
          ok: false,
          status: resposta.status,
          mensagem:
            `${mensagens[resposta.status] ?? "Falha ao conectar no provedor."} ${detalhe}`.trim(),
          modelos: [],
        };
      }

      let modelos: string[] = [];
      try {
        const json = JSON.parse(texto) as { data?: Array<{ id?: string }> };
        modelos = (json.data ?? [])
          .map((m) => m.id)
          .filter((id): id is string => Boolean(id))
          .sort((a, b) => a.localeCompare(b));
      } catch {
        /* provedor sem catálogo padrão */
      }

      return {
        ok: true,
        status: resposta.status,
        mensagem: modelos.length
          ? `Conexão validada · ${modelos.length} modelos disponíveis`
          : "Conexão validada (o provedor não retornou uma lista de modelos)",
        modelos,
      };
    } catch (erro) {
      return {
        ok: false,
        status: 0,
        mensagem: `Não foi possível alcançar ${base}: ${erro instanceof Error ? erro.message : "erro de rede"}`,
        modelos: [],
      };
    }
  });
