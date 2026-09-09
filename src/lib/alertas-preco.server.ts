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
type LinhaAlertaPreco = AlertaPrecoAtivo & {
  ativo: boolean;
  mensagem?: string | null;
  variacao_percent?: number | null;
  preco_referencia?: number | null;
  frequencia?: string | null;
  disparos?: number | null;
  ultimo_disparo_em?: string | null;
};

/**
 * Busca todos os alertas `ativo = true`, verifica o preço atual de cada ticker
 * contra o alvo e dispara push para os que forem atingidos.
 */
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Alvo efetivo: valor em reais ou variação percentual sobre o preço de referência. */
function alvoEfetivo(a: LinhaAlertaPreco): number | null {
  const pct = Number(a.variacao_percent);
  const ref = Number(a.preco_referencia);
  if (Number.isFinite(pct) && pct > 0 && Number.isFinite(ref) && ref > 0) {
    const fator = a.tipo === "acima" ? 1 + pct / 100 : 1 - pct / 100;
    return Math.round(ref * fator * 100) / 100;
  }
  const v = Number(a.valor_alvo);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Respeita a frequência escolhida (uma vez, diária, sempre). */
function podeDisparar(a: LinhaAlertaPreco): boolean {
  const freq = a.frequencia ?? "uma_vez";
  if (freq === "sempre") return true;
  if (!a.ultimo_disparo_em) return true;
  if (freq === "diaria") {
    return Date.now() - new Date(a.ultimo_disparo_em).getTime() >= 24 * 60 * 60 * 1000;
  }
  return false;
}

export async function verificarAlertas(supabase: SupabaseClient): Promise<ResultadoVerificacao> {
  // Busca alertas ativos
  const { data: alertas, error } = await supabase
    .from("alertas_preco")
    .select("*")
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

    const alvo = alvoEfetivo(alerta);
    if (alvo == null) {
      erros++;
      continue;
    }

    const atingiu = alerta.tipo === "acima" ? preco >= alvo : preco <= alvo;

    if (!atingiu || !podeDisparar(alerta)) continue;

    const agora = new Date().toISOString();
    const freq = alerta.frequencia ?? "uma_vez";

    // Marca o disparo (mantém ativo quando a frequência é recorrente)
    await supabase
      .from("alertas_preco")
      .update({
        ativo: freq !== "uma_vez",
        disparado_em: agora,
        ultimo_disparo_em: agora,
        disparos: Number(alerta.disparos ?? 0) + 1,
      })
      .eq("id", alerta.id);


    disparados++;

    const direcao = alerta.tipo === "acima" ? "acima" : "abaixo";
    const titulo = `📊 ${alerta.ticker} ${direcao} do alvo`;
    const corpo =
      `Cotação: ${brl(preco)} | Alvo: ${brl(alvo)}` +
      (alerta.mensagem ? ` — ${alerta.mensagem}` : "");
    const url = `/cotacoes?ticker=${alerta.ticker}`;

    const caixa = supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    };

    // Histórico de alertas disparados
    try {
      await caixa.from("alertas_disparos").insert({
        user_id: alerta.user_id,
        alerta_id: alerta.id,
        ticker: alerta.ticker,
        tipo: alerta.tipo,
        preco,
        valor_alvo: alvo,
        variacao_percent: alerta.variacao_percent ?? null,
        frequencia: freq,
        mensagem: alerta.mensagem ?? null,
      });
    } catch {
      /* histórico é complementar */
    }

    // Notificação dentro do app (sino) — independe de permissão do navegador
    try {
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
