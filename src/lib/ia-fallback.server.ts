/**
 * Fallback entre provedores de IA no nível do fetch.
 *
 * Modelos gratuitos (OrcaRouter, OpenRouter, Kilo…) recusam chamadas com
 * frequência ("free model capacity is limited right now"). Em vez de entregar
 * o erro ao usuário, a mesma requisição é reenviada ao próximo provedor
 * configurado — e, por último, ao Lovable AI Gateway.
 */
import { baseUrlProvedorEnv, PROVEDORES_ENV, type ProvedorEnv } from "./provedores-env.server";

export interface CandidatoIA {
  nome: string;
  baseURL: string;
  modelo: string;
  headers: Record<string, string>;
}

const GATEWAY_LOVABLE = "https://ai.gateway.lovable.dev/v1";
const MODELO_LOVABLE = "openai/gpt-5.6-sol";

/** Provedor de ambiente → candidato (quando há chave ou aceita anônimo). */
function candidatoDeProvedor(
  provedor: ProvedorEnv,
  env: NodeJS.ProcessEnv,
): CandidatoIA | null {
  const chave = env[provedor.variavel]?.trim();
  if (!chave && !provedor.aceitaAnonimo) return null;
  return {
    nome: `${provedor.nome} (servidor)`,
    baseURL: baseUrlProvedorEnv(provedor, env).replace(/\/$/, ""),
    modelo: provedor.modelo,
    headers: chave ? { Authorization: `Bearer ${chave}` } : {},
  };
}

/**
 * Lista de candidatos: o principal primeiro, depois os demais provedores de
 * ambiente utilizáveis e, por fim, o Lovable AI Gateway.
 */
export function montarCandidatosIA(
  principal: CandidatoIA,
  env: NodeJS.ProcessEnv,
): CandidatoIA[] {
  const candidatos: CandidatoIA[] = [principal];
  const chaveIgual = (c: CandidatoIA) =>
    candidatos.some((x) => x.baseURL === c.baseURL && x.modelo === c.modelo);

  for (const provedor of PROVEDORES_ENV) {
    const candidato = candidatoDeProvedor(provedor, env);
    if (candidato && !chaveIgual(candidato)) candidatos.push(candidato);
  }

  const chaveLovable = env["LOVABLE_API_KEY"]?.trim();
  if (chaveLovable) {
    const lovable: CandidatoIA = {
      nome: "Lovable AI (servidor)",
      baseURL: GATEWAY_LOVABLE,
      modelo: MODELO_LOVABLE,
      headers: {
        "Lovable-API-Key": chaveLovable,
        Authorization: `Bearer ${chaveLovable}`,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    };
    if (!chaveIgual(lovable)) candidatos.push(lovable);
  }

  return candidatos;
}

/** Erros transitórios/de cota em que vale tentar o próximo provedor. */
function vaiTentarOutro(status: number, corpo: string): boolean {
  if (status === 402 || status === 403 || status === 408 || status === 429) return true;
  if (status >= 500) return true;
  return /capacity|rate limit|too many requests|overload|quota|no endpoints|temporarily/i.test(
    corpo,
  );
}

/**
 * fetch que percorre os candidatos até um responder. Reescreve baseURL, o campo
 * `model` do corpo e os cabeçalhos de autenticação em cada tentativa.
 */
export function criarFetchComFallbackIA(candidatos: CandidatoIA[]) {
  const principal = candidatos[0]!;
  let usado = principal.nome;

  const executar = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlOriginal = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const sufixo = urlOriginal.startsWith(principal.baseURL)
      ? urlOriginal.slice(principal.baseURL.length)
      : new URL(urlOriginal).pathname;

    let corpoBase: Record<string, unknown> | null = null;
    if (typeof init?.body === "string") {
      try {
        const parsed: unknown = JSON.parse(init.body);
        if (parsed && typeof parsed === "object") corpoBase = parsed as Record<string, unknown>;
      } catch {
        /* corpo não-JSON: sem fallback de modelo */
      }
    }

    let ultima: Response | null = null;
    for (const [i, candidato] of candidatos.entries()) {
      const headers = new Headers(init?.headers);
      if (i > 0) {
        headers.delete("authorization");
        headers.delete("Lovable-API-Key");
        for (const [k, v] of Object.entries(candidato.headers)) headers.set(k, v);
      }
      const body =
        i > 0 && corpoBase
          ? JSON.stringify({ ...corpoBase, model: candidato.modelo })
          : init?.body;

      let resposta: Response;
      try {
        resposta = await fetch(`${candidato.baseURL}${sufixo}`, { ...init, headers, body });
      } catch (erro) {
        if (i === candidatos.length - 1) throw erro;
        console.error(
          `[chat] falha de rede em ${candidato.nome}, tentando próximo provedor:`,
          erro instanceof Error ? erro.message : String(erro),
        );
        continue;
      }

      if (resposta.ok) {
        usado = candidato.nome;
        return resposta;
      }

      const texto = await resposta.clone().text().catch(() => "");
      const ehUltimo = i === candidatos.length - 1;
      if (ehUltimo || !corpoBase || !vaiTentarOutro(resposta.status, texto)) {
        usado = candidato.nome;
        return resposta;
      }
      console.error(
        `[chat] ${candidato.nome} indisponível (status ${resposta.status}); tentando próximo provedor.`,
      );
      ultima = resposta;
    }

    return ultima ?? new Response("Nenhum provedor de IA disponível.", { status: 503 });
  };

  return { fetch: executar, provedorUsado: () => usado };
}
