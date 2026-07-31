import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const CLASSES_VALIDAS = [
  "Renda Fixa",
  "ETFs - Brasil",
  "ETFs - Global",
  "FIIs",
  "Ações",
  "BDRs",
  "Fundos de Investimentos",
  "Criptomoedas",
  "REITs",
  "Stocks",
] as const;

export type EntradaRecomendacao = {
  perfil: string;
  horizonte: string;
  objetivo: string;
  valor: number;
};

export type LinhaSugerida = {
  grupo: string;
  risco: string;
  indexador: string;
  prazo: string;
  classe: string;
  alvo: number;
};

export type RespostaRecomendacao = {
  resumo: string;
  linhas: LinhaSugerida[];
};

const esquema = z.object({
  resumo: z.string(),
  linhas: z.array(
    z.object({
      grupo: z.string(),
      risco: z.string(),
      indexador: z.string(),
      prazo: z.string(),
      classe: z.string(),
      alvo: z.number(),
    }),
  ),
});

function prompt(dados: EntradaRecomendacao) {
  return [
    "Você é um planejador financeiro brasileiro. Monte uma alocação-alvo por classe de ativo.",
    `Perfil de risco: ${dados.perfil}.`,
    `Horizonte: ${dados.horizonte}.`,
    `Objetivo: ${dados.objetivo}.`,
    `Valor disponível para alocar: R$ ${dados.valor.toLocaleString("pt-BR")}.`,
    "",
    "Regras:",
    "- Retorne entre 5 e 10 linhas.",
    `- O campo "classe" deve ser exatamente um destes: ${CLASSES_VALIDAS.join(", ")}.`,
    '- O campo "grupo" deve ser "Renda Fixa" ou "Renda Variável".',
    '- O campo "risco" deve ser "Baixo", "Médio" ou "Alto".',
    '- "indexador" é o tipo/estratégia (ex.: Tesouro SELIC (CDI), ETF - Brasil, FIIs (Fundos Imobiliários)).',
    '- "prazo" é o prazo recomendado ou um ativo de referência (ex.: BOVA11, MXRF11, liquidez imediata).',
    '- "alvo" é o percentual da carteira total; a soma de todos os "alvo" deve ser exatamente 100.',
    "- O resumo deve ter no máximo 300 caracteres, em português do Brasil.",
  ].join("\n");
}

/** Gera uma sugestão de alocação com IA, normalizando a soma para 100%. */
export async function gerarRecomendacaoIA(dados: EntradaRecomendacao): Promise<RespostaRecomendacao> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Serviço de IA indisponível no momento.");

  const gateway = createLovableAiGatewayProvider(key, undefined, { structuredOutputs: true });

  let bruto: RespostaRecomendacao;
  try {
    const { output } = await generateText({
      model: gateway("openai/gpt-5.6-sol"),
      output: Output.object({ schema: esquema }),
      prompt: prompt(dados),
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });
    bruto = output as RespostaRecomendacao;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      try {
        bruto = JSON.parse(error.text ?? "{}") as RespostaRecomendacao;
      } catch {
        throw new Error("Não foi possível gerar a recomendação. Tente novamente.");
      }
    } else {
      throw error;
    }
  }

  const linhas = (bruto.linhas ?? [])
    .filter((l) => Number.isFinite(l.alvo) && l.alvo > 0)
    .slice(0, 12)
    .map((l) => ({
      grupo: l.grupo === "Renda Fixa" ? "Renda Fixa" : "Renda Variável",
      risco: ["Baixo", "Médio", "Alto"].includes(l.risco) ? l.risco : "Médio",
      indexador: String(l.indexador ?? "").slice(0, 80),
      prazo: String(l.prazo ?? "").slice(0, 120),
      classe: (CLASSES_VALIDAS as readonly string[]).includes(l.classe) ? l.classe : "Renda Fixa",
      alvo: Math.round(l.alvo * 10) / 10,
    }));

  if (linhas.length === 0) throw new Error("A IA não retornou uma alocação válida.");

  const soma = linhas.reduce((s, l) => s + l.alvo, 0);
  if (soma > 0 && Math.abs(soma - 100) > 0.05) {
    for (const l of linhas) l.alvo = Math.round(((l.alvo * 100) / soma) * 10) / 10;
  }

  return { resumo: String(bruto.resumo ?? "").slice(0, 400), linhas };
}
