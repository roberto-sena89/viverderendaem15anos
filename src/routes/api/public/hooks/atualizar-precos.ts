import { createFileRoute } from "@tanstack/react-router";

/**
 * Job de sincronização de preços, chamado pelo pg_cron.
 *
 * Escopos:
 * - `b3`      → ações, FIIs, ETFs e BDRs (Yahoo com fallback brapi.dev),
 *               a cada 15 min durante o pregão (10h–18h, dias úteis).
 * - `tesouro` → títulos públicos (API de dados abertos do Tesouro Direto),
 *               uma vez por dia.
 * - `todos`   → executa os dois escopos.
 *
 * Todo preço obtido é gravado em `historico_precos` (um registro por ativo/dia),
 * garantindo série histórica mesmo que as fontes públicas fiquem indisponíveis.
 */

type Escopo = "b3" | "tesouro" | "todos";

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

/** Horário de Brasília, para respeitar a janela do pregão. */
function agoraBrasilia() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    hora: Number(p.hour),
    diaUtil: !["Sat", "Sun"].includes(String(p.weekday)),
  };
}

const ehTesouro = (texto: string) => /TESOURO|SELIC|IPCA|PREFIXAD|NTN|LTN|LFT/i.test(texto);

export const Route = createFileRoute("/api/public/hooks/atualizar-precos")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!autorizado(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

        const corpo = (await request.json().catch(() => ({}))) as {
          escopo?: Escopo;
          forcar?: boolean;
        };
        const escopo: Escopo = corpo.escopo ?? "todos";
        const { data: hoje, hora, diaUtil } = agoraBrasilia();
        const dentroDoPregao = diaUtil && hora >= 10 && hora < 18;

        if (escopo === "b3" && !dentroDoPregao && !corpo.forcar) {
          return Response.json({ ok: true, ignorado: "fora do pregão", hora, diaUtil });
        }

        const [{ supabaseAdmin }, mercado, tesouro] = await Promise.all([
          import("@/integrations/supabase/client.server"),
          import("@/lib/market.server"),
          import("@/lib/tesouro.server"),
        ]);

        const { data: ativos, error } = await supabaseAdmin
          .from("ativos")
          .select("id, ticker, nome, categoria");
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const lista = ativos ?? [];
        const chaves = new Map<string, { ticker: string; texto: string; tesouro: boolean }>();
        for (const a of lista) {
          const ticker = String(a.ticker ?? "").trim();
          if (!ticker) continue;
          const texto = `${ticker} ${a.nome ?? ""} ${a.categoria ?? ""}`;
          chaves.set(ticker, { ticker, texto, tesouro: ehTesouro(texto) });
        }

        const titulos = escopo === "b3" ? [] : await tesouro.listarTesouroDireto().catch(() => []);

        const iniciadoEm = Date.now();
        const precos = new Map<string, { preco: number; fonte: string; classe: string }>();

        // Métricas por fonte, para a tela de auditoria.
        const metricas = {
          tesouro: { total: 0, obtidos: 0, atualizados: 0, gravados: 0, falhas: [] as string[] },
          b3: { total: 0, obtidos: 0, atualizados: 0, gravados: 0, falhas: [] as string[] },
        };
        const falhas: string[] = [];

        for (const item of chaves.values()) {
          const alvoTesouro = item.tesouro;
          if (alvoTesouro && escopo === "b3") continue;
          if (!alvoTesouro && escopo === "tesouro") continue;

          const m = alvoTesouro ? metricas.tesouro : metricas.b3;
          m.total++;

          try {
            if (alvoTesouro) {
              const titulo = tesouro.casarTitulo(item.texto, titulos);
              const preco = titulo?.precoCompra ?? titulo?.precoVenda ?? null;
              if (preco && preco > 0) {
                precos.set(item.ticker, { preco, fonte: "tesouro-direto", classe: "tesouro" });
                m.obtidos++;
              } else {
                m.falhas.push(item.ticker);
              }
            } else {
              const c = await mercado.buscarCotacao(item.ticker);
              if (c.preco && c.preco > 0) {
                precos.set(item.ticker, {
                  preco: c.preco,
                  fonte: "yahoo/brapi",
                  classe: "variavel",
                });
                m.obtidos++;
              } else {
                m.falhas.push(item.ticker);
              }
            }
          } catch (e) {
            m.falhas.push(
              `${item.ticker}: ${e instanceof Error ? e.message : "erro desconhecido"}`,
            );
          }
        }
        falhas.push(...metricas.tesouro.falhas, ...metricas.b3.falhas);

        let atualizados = 0;
        for (const [ticker, info] of precos) {
          const m = info.classe === "tesouro" ? metricas.tesouro : metricas.b3;
          const { error: upErr } = await supabaseAdmin
            .from("ativos")
            .update({ preco_atual: info.preco })
            .eq("ticker", ticker);
          if (upErr) m.falhas.push(`${ticker}: ${upErr.message}`);
          else {
            atualizados++;
            m.atualizados++;
          }
        }

        // Série histórica: um registro por ativo por dia (o último preço do dia vence).
        const historico = [...precos.entries()].map(([ticker, info]) => ({
          ticker,
          data: hoje,
          preco: info.preco,
          fonte: info.fonte,
          classe: info.classe,
          updated_at: new Date().toISOString(),
        }));

        let gravados = 0;
        let erroHistorico: string | null = null;
        if (historico.length > 0) {
          const { error: histErr } = await supabaseAdmin
            .from("historico_precos")
            .upsert(historico, { onConflict: "ticker,data" });
          if (histErr) erroHistorico = histErr.message;
          else {
            gravados = historico.length;
            metricas.tesouro.gravados = historico.filter((h) => h.classe === "tesouro").length;
            metricas.b3.gravados = historico.filter((h) => h.classe !== "tesouro").length;
          }
        }

        // Registro de auditoria: uma linha por fonte consultada nesta execução.
        const duracao = Date.now() - iniciadoEm;
        const registros = [
          escopo !== "b3"
            ? {
                escopo: "tesouro",
                fonte: "Tesouro Transparente",
                metricas: metricas.tesouro,
                erro: titulos.length === 0 ? "Nenhum título retornado pela fonte" : erroHistorico,
              }
            : null,
          escopo !== "tesouro"
            ? {
                escopo: "b3",
                fonte: "Yahoo Finance / brapi.dev",
                metricas: metricas.b3,
                erro: erroHistorico,
              }
            : null,
        ].filter((r): r is NonNullable<typeof r> => r !== null);

        await supabaseAdmin.from("sincronizacoes").insert(
          registros.map((r) => ({
            escopo: r.escopo,
            fonte: r.fonte,
            status: r.erro ? "erro" : r.metricas.falhas.length > 0 ? "parcial" : "ok",
            dentro_do_pregao: dentroDoPregao,
            total_tickers: r.metricas.total,
            atualizados: r.metricas.atualizados,
            historico_gravado: r.metricas.gravados,
            falhas: r.metricas.falhas,
            erro: r.erro,
            duracao_ms: duracao,
          })),
        );

        return Response.json({
          ok: true,
          escopo,
          dentroDoPregao,
          tickers: chaves.size,
          atualizados,
          historicoGravado: gravados,
          falhas,
          duracaoMs: duracao,
          executadoEm: new Date().toISOString(),
        });
      },
    },
  },
});
