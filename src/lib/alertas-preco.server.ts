/**
 * Alertas de Preço server-side — verifica preços de ativos contra alvos
 * definidos pelo usuário e dispara notificações push.
 *
 * Chamado por um hook agendado (CRON_SECRET) ou manualmente.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AlertaPrecoAtivo {
  id: string;
  user_id: string;
  ticker: string;
  tipo: "acima" | "abaixo";
  valor_alvo: number;
}

export interface ResultadoVerificacao {
  verificados: number;
  disparados: number;
  erros: number;
}

/**
 * Linha tipada da tabela nova `alertas_preco` — remova quando o typegen do
 * Supabase incluir a tabela.
 */
type LinhaAlertaPreco = AlertaPrecoAtivo & { ativo: boolean; mensagem?: string | null };

/**
 * Busca todos os alertas `ativo = true`, verifica o preço atual de cada ticker
 * contra o alvo e dispara push para os que forem atingidos.
 */
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function verificarAlertas(supabase: SupabaseClient): Promise<ResultadoVerificacao> {
  // Busca alertas ativos
  const { data: alertas, error } = await supabase
    .from("alertas_preco")
    .select("id, user_id, ticker, tipo, valor_alvo, mensagem")
    .eq("ativo", true);

  const linhas = (alertas ?? []) as unknown as LinhaAlertaPreco[];
  if (error || !linhas.length) return { verificados: 0, disparados: 0, erros: 0 };

  // Agrupa por ticker para buscar preços de uma vez
  const tickers = [...new Set(linhas.map((a) => a.ticker))];
  const { lerPrecosPersistidos } = await import("@/lib/precos-ultimos.server");
  const precos = await lerPrecosPersistidos(tickers);
  const mapaPrecos = new Map(precos.map((p) => [p.ticker, p.preco]));

  let disparados = 0;
  let erros = 0;

  for (const alerta of linhas) {
    const preco = mapaPrecos.get(alerta.ticker);
    if (preco == null || !Number.isFinite(preco)) {
      erros++;
      continue;
    }

    const atingiu =
      alerta.tipo === "acima" ? preco >= alerta.valor_alvo : preco <= alerta.valor_alvo;

    if (!atingiu) continue;

    // Marca como disparado
    await supabase
      .from("alertas_preco")
      .update({ ativo: false, disparado_em: new Date().toISOString() })
      .eq("id", alerta.id);

    disparados++;

    const direcao = alerta.tipo === "acima" ? "acima" : "abaixo";
    const titulo = `📊 ${alerta.ticker} ${direcao} do alvo`;
    const corpo =
      `Cotação: ${brl(preco)} | Alvo: ${brl(alerta.valor_alvo)}` +
      (alerta.mensagem ? ` — ${alerta.mensagem}` : "");
    const url = `/cotacoes?ticker=${alerta.ticker}`;

    // Notificação dentro do app (sino) — independe de permissão do navegador
    try {
      const caixa = supabase as unknown as {
        from: (t: string) => {
          insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      await caixa.from("notificacoes").insert({
        user_id: alerta.user_id,
        tipo: "alerta_preco",
        titulo,
        corpo,
        url,
        ticker: alerta.ticker,
      });
    } catch {
      erros++;
    }

    // Push nativo (quando o usuário tiver assinatura registrada)
    try {
      const { enviarPushParaUsuario } = await import("@/lib/push-server");
      await enviarPushParaUsuario(supabase, alerta.user_id, {
        titulo,
        corpo,
        url,
        tag: `alerta-${alerta.id}`,
      });
    } catch {
      /* sem assinatura de push: a notificação no app já foi entregue */
    }

  }

  return { verificados: linhas.length, disparados, erros };
}

/**
 * Hook agendado (CRON_SECRET) que verifica todos os alertas e dispara push.
 * Chamado por /api/public/hooks/verificar-alertas-preco.
 */
export async function executarVerificacaoAlertas(): Promise<ResultadoVerificacao> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return verificarAlertas(supabaseAdmin);
}
