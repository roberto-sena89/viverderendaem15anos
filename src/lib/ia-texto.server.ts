/**
 * Geração de texto com o provedor de IA configurado no servidor
 * (Kilo Code por padrão), com fallback automático entre provedores.
 *
 * Centraliza o que antes estava duplicado em cada funcionalidade: montagem do
 * provedor, headers, fallback e identificação de quem realmente respondeu.
 */
import { baseUrlProvedorEnv, provedorEnvAtivo } from "@/lib/provedores-env.server";

export interface RespostaTextoIA {
  texto: string;
  provedor: string;
  /** Motivo de término reportado pelo modelo (ex.: "stop", "length"). */
  motivo: string;
}

export interface PedidoTextoIA {
  sistema: string;
  prompt: string;
  /**
   * Modelos gratuitos gastam boa parte do orçamento em raciocínio interno:
   * o teto precisa ser alto para sobrar espaço para a resposta final.
   */
  maxTokens?: number;
}

/**
 * Chama o provedor de IA ativo e devolve o texto puro.
 * Lança erro quando nenhum provedor está disponível ou a resposta vem vazia.
 */
export async function gerarTextoIA({
  sistema,
  prompt,
  maxTokens = 8000,
}: PedidoTextoIA): Promise<RespostaTextoIA> {
  const ativo = provedorEnvAtivo(process.env);
  if (!ativo) throw new Error("Nenhum provedor de IA configurado no servidor.");

  const { generateText } = await import("ai");
  const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
  const { criarFetchComFallbackIA, montarCandidatosIA } = await import("@/lib/ia-fallback.server");

  const baseURL = baseUrlProvedorEnv(ativo.provedor, process.env).replace(/\/$/, "");
  const headers: Record<string, string> = ativo.chave
    ? { Authorization: `Bearer ${ativo.chave}` }
    : {};
  const fallbackIA = criarFetchComFallbackIA(
    montarCandidatosIA(
      { nome: ativo.provedor.nome, baseURL, modelo: ativo.provedor.modelo, headers },
      process.env,
    ),
  );

  const modelo = createOpenAICompatible({
    name: "gestor-ia",
    baseURL,
    headers,
    fetch: fallbackIA.fetch,
  })(ativo.provedor.modelo);

  const resposta = await generateText({
    model: modelo,
    system: sistema,
    prompt,
    maxOutputTokens: maxTokens,
  });

  const texto = resposta.text.trim();
  if (!texto) {
    throw new Error(`O provedor de IA respondeu vazio (motivo: ${resposta.finishReason}).`);
  }
  return { texto, provedor: fallbackIA.provedorUsado(), motivo: String(resposta.finishReason) };
}

/** Extrai o primeiro objeto JSON do texto; devolve null quando não houver. */
export function extrairJson(texto: string): Record<string, unknown> | null {
  const ini = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return null;
  try {
    return JSON.parse(texto.slice(ini, fim + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
