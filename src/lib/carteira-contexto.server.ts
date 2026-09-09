/**
 * Contexto real da carteira do usuário para o "Painel do analista".
 * Reúne ativos (com cotação ao vivo), rentabilidade, proventos e as últimas
 * auditorias persistidas, para que o painel use números concretos em vez de
 * depender apenas do prompt genérico da IA.
 */

import { brl } from "@/lib/formato-numero";

export interface ContextoCarteira {
  /** Bloco em texto para injetar no prompt da IA. */
  prompt: string;
  /** Linhas determinísticas exibidas no painel mesmo sem resposta da IA. */
  linhas: string[];
  temDados: boolean;
}

const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

export async function montarContextoCarteira(userId: string): Promise<ContextoCarteira> {
  const vazio: ContextoCarteira = { prompt: "", linhas: [], temDados: false };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [ativosRes, dividendosRes, auditoriasRes] = await Promise.all([
      supabaseAdmin
        .from("ativos")
        .select("ticker, nome, categoria, quantidade, preco_medio, preco_atual")
        .eq("user_id", userId),
      supabaseAdmin.from("dividendos").select("valor").eq("user_id", userId),
      supabaseAdmin
        .from("relatorios")
        .select("titulo, status, score_diversificacao, patrimonio_total, created_at")
        .eq("user_id", userId)
        .eq("tipo", "auditoria")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const ativos = (ativosRes.data ?? []).filter((a) => Number(a.quantidade) > 0);
    if (ativos.length === 0) return vazio;

    // Cotações ao vivo — mesma fonte do card "Patrimônio Total" do Dashboard.
    const { buscarCotacao } = await import("@/lib/market.server");
    const precos = new Map<string, { preco: number; variacao: number | null }>();
    await Promise.all(
      ativos.slice(0, 20).map(async (a) => {
        try {
          const c = await buscarCotacao(a.ticker);
          if (c && Number.isFinite(Number(c.preco)) && Number(c.preco) > 0) {
            precos.set(a.ticker, {
              preco: Number(c.preco),
              variacao: c.variacaoPercent == null ? null : Number(c.variacaoPercent),
            });
          }
        } catch {
          /* mantém o preço armazenado */
        }
      }),
    );

    let custo = 0;
    let atual = 0;
    const porCategoria = new Map<string, number>();
    const linhasAtivos: string[] = [];
    const variacoes: { ticker: string; variacao: number }[] = [];

    for (const a of ativos) {
      const qtd = Number(a.quantidade);
      const vivo = precos.get(a.ticker);
      const preco = vivo?.preco ?? Number(a.preco_atual) ?? Number(a.preco_medio);
      const valor = qtd * preco;
      custo += qtd * Number(a.preco_medio);
      atual += valor;
      porCategoria.set(a.categoria, (porCategoria.get(a.categoria) ?? 0) + valor);
      if (vivo?.variacao != null) variacoes.push({ ticker: a.ticker, variacao: vivo.variacao });
      linhasAtivos.push(
        `${a.ticker} (${a.categoria}): ${qtd} cotas, PM ${brl(Number(a.preco_medio), 2)}, atual ${brl(preco, 2)}, posição ${brl(valor, 2)}`,
      );
    }

    const proventos = (dividendosRes.data ?? []).reduce((s, d) => s + Number(d.valor ?? 0), 0);
    const ganhoCapital = atual - custo;
    const lucroTotal = ganhoCapital + proventos;
    const rentabilidade = custo > 0 ? (lucroTotal / custo) * 100 : 0;

    const categorias = [...porCategoria.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, valor]) => `${cat} ${((valor / (atual || 1)) * 100).toFixed(1)}% (${brl(valor, 2)})`);

    variacoes.sort((a, b) => b.variacao - a.variacao);
    const melhores = variacoes.slice(0, 3).map((v) => `${v.ticker} ${pct(v.variacao)}`);
    const piores = variacoes.slice(-3).reverse().map((v) => `${v.ticker} ${pct(v.variacao)}`);

    const auditorias = (auditoriasRes.data ?? []).map(
      (r) =>
        `${new Date(r.created_at).toLocaleDateString("pt-BR")} — ${r.titulo} (${r.status}` +
        (r.score_diversificacao == null ? "" : `, score ${Number(r.score_diversificacao)}/100`) +
        (r.patrimonio_total == null ? "" : `, patrimônio ${brl(Number(r.patrimonio_total), 2)}`) +
        ")",
    );

    const linhas = [
      `- Sua carteira: patrimônio ${brl(atual, 2)} em ${ativos.length} ativos; lucro total ${brl(lucroTotal, 2)} (${pct(rentabilidade)}), sendo ${brl(ganhoCapital, 2)} de ganho de capital e ${brl(proventos, 2)} de proventos.`,
      categorias.length > 0 ? `- Alocação atual: ${categorias.slice(0, 6).join("; ")}.` : null,
      melhores.length > 0 ? `- Destaques do dia: alta ${melhores.join(", ")} | baixa ${piores.join(", ")}.` : null,
      auditorias.length > 0 ? `- Auditorias recentes: ${auditorias.join(" | ")}.` : null,
    ].filter((l): l is string => l !== null);

    const prompt = [
      "DADOS REAIS DA CARTEIRA DESTE USUÁRIO (use números concretos, não invente valores):",
      `Patrimônio atual: ${brl(atual, 2)} | Custo: ${brl(custo, 2)} | Ganho de capital: ${brl(ganhoCapital, 2)} | Proventos: ${brl(proventos, 2)} | Lucro total: ${brl(lucroTotal, 2)} | Rentabilidade: ${pct(rentabilidade)}`,
      `Alocação: ${categorias.join("; ") || "—"}`,
      `Posições: ${linhasAtivos.slice(0, 20).join(" | ")}`,
      `Auditorias: ${auditorias.join(" | ") || "nenhuma auditoria registrada"}`,
    ].join("\n");

    return { prompt, linhas, temDados: true };
  } catch {
    return vazio;
  }
}
