import { createFileRoute } from "@tanstack/react-router";
import type { CategoriaMercado } from "@/lib/grade-mercado.server";

/**
 * Job de aquecimento do cache de cotações (chamado pelo pg_cron).
 *
 * Busca as grades nas fontes públicas e grava em `public.cotacoes_cache`.
 * Com isso a página de Cotações lê sempre do cache — resposta imediata,
 * sem multiplicar chamadas às APIs externas por visitante.
 */

const CATEGORIAS: CategoriaMercado[] = [
  "indices",
  "acoes",
  "fiis",
  "etfs",
  "cripto",
  "cambio",
  "futuros",
  "commodities",
];

function autorizado(request: Request) {
  const esperado = process.env.CRON_SECRET ?? "";
  const recebido =
    request.headers.get("x-cron-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (esperado.length === 0 || recebido.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/hooks/atualizar-cotacoes")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!autorizado(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

        const corpo = (await request.json().catch(() => ({}))) as { categorias?: string[] };
        const alvo = Array.isArray(corpo.categorias)
          ? CATEGORIAS.filter((c) => corpo.categorias!.includes(c))
          : CATEGORIAS;

        const inicio = Date.now();
        const { buscarGrade } = await import("@/lib/grade-mercado.server");
        const { gravarCache, dentroDoPregao } = await import("@/lib/cotacoes-cache.server");

        const resultados: Array<{ categoria: string; linhas: number; parcial: boolean }> = [];
        // Sequencial de propósito: evita rajadas simultâneas nas fontes públicas.
        for (const categoria of alvo) {
          try {
            const grade = await buscarGrade(categoria);
            await gravarCache(categoria, grade);
            resultados.push({
              categoria,
              linhas: grade.linhas.filter((l) => l.preco !== null).length,
              parcial: grade.parcial,
            });
          } catch {
            resultados.push({ categoria, linhas: 0, parcial: true });
          }
        }

        // Grade completa de FIIs: regravar o cache dispara o evento de tempo
        // real (WebSocket) que atualiza preço e variação nos navegadores abertos.
        if (alvo.includes("fiis")) {
          try {
            const { gradeFiisComCache } = await import("@/lib/fiis.server");
            const g = await gradeFiisComCache(true);
            resultados.push({
              categoria: "fiis:grade",
              linhas: g.linhas.filter((l) => l.preco !== null).length,
              parcial: g.parcial,
            });
          } catch {
            resultados.push({ categoria: "fiis:grade", linhas: 0, parcial: true });
          }
        }

        // Grade completa de ações: mesma lógica — regravar o cache empurra
        // preço e variação por WebSocket para quem está com a aba aberta.
        if (alvo.includes("acoes")) {
          try {
            const { gradeAcoesComCache } = await import("@/lib/acoes.server");
            const g = await gradeAcoesComCache(true);
            resultados.push({
              categoria: "acoes:grade",
              linhas: g.linhas.filter((l) => l.preco !== null).length,
              parcial: g.parcial,
            });
          } catch {
            resultados.push({ categoria: "acoes:grade", linhas: 0, parcial: true });
          }
        }

        // Aquecimento do feed de notícias: re-busca os RSS e grava no cache
        // compartilhado, para a página de Notícias abrir sempre instantânea.
        try {
          const { agregarNoticias } = await import("@/lib/noticias.server");
          const itens = await agregarNoticias();
          resultados.push({ categoria: "noticias", linhas: itens.length, parcial: false });
        } catch {
          resultados.push({ categoria: "noticias", linhas: 0, parcial: true });
        }

        return Response.json({
          ok: true,
          dentroDoPregao: dentroDoPregao(),
          duracaoMs: Date.now() - inicio,
          resultados,
        });
      },
    },
  },
});
