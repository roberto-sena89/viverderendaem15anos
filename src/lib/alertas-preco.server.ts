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
type LinhaAlertaPreco = AlertaPrecoAtivo & { ativo: boolean };

/**
 * Busca todos os alertas `ativo = true`, verifica o preço atual de cada ticker
 * contra o alvo e dispara push para os que forem atingidos.
 */
export async function verificarAlertas(supabase: SupabaseClient): Promise<ResultadoVerificacao> {
  // Busca alertas ativos
  const { data: alertas, error } = await supabase
    .from("alertas_preco")
    .select("id, user_id, ticker, tipo, valor_alvo")
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

    // Dispara push
    try {
      const { enviarPushParaUsuario } = await import("@/lib/push-server");
      const direcao = alerta.tipo === "acima" ? "acima" : "abaixo";
      await enviarPushParaUsuario(supabase, alerta.user_id, {
        titulo: `📊 ${alerta.ticker} ${direcao} do alvo`,
        corpo: `Cotação: R$ ${preco.toFixed(2)} | Alvo: R$ ${alerta.valor_alvo.toFixed(2)}`,
        url: `/cotacoes?ticker=${alerta.ticker}`,
        tag: `alerta-${alerta.id}`,
      });
    } catch {
      erros++;
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
