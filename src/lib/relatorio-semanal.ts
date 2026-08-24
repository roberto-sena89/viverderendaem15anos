/**
 * Relatório Semanal do Investidor — gera um resumo legível da semana a partir
 * dos dados reais da carteira: evolução do patrimônio, proventos recebidos,
 * aportes e progresso das metas. Exibido no dashboard e copiável para
 * compartilhar (WhatsApp, redes).
 */

import type { Ativo, Aporte, Dividendo, Meta } from "@/lib/portfolio";
import { resumoCarteira } from "@/lib/portfolio";

export interface RelatorioSemanal {
  geradoEm: string; // ISO
  semana: string; // "12 a 18 de ago"
  patrimonioAtual: number;
  patrimonioAnterior: number;
  variacaoSemana: number | null; // %
  aportesSemana: number;
  dividendosSemana: number;
  proximosProventos: number;
  metasProgresso: { nome: string; pct: number }[];
  resumoTexto: string;
}

function inicioDaSemana(): Date {
  const agora = new Date();
  const dia = (agora.getDay() + 6) % 7; // 0 = segunda
  const data = new Date(agora);
  data.setDate(data.getDate() - dia);
  data.setHours(0, 0, 0, 0);
  return data;
}

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/**
 * Gera o relatório semanal com os dados atuais da carteira.
 * `patrimonioAnterior` pode ser o valor salvo do relatório anterior ou null.
 */
export function gerarRelatorioSemanal(input: {
  ativos: Ativo[];
  aportes: Aporte[];
  dividendos: Dividendo[];
  metas: Meta[];
  patrimonioAnterior?: number | null;
}): RelatorioSemanal {
  const { ativos, aportes, dividendos, metas, patrimonioAnterior } = input;
  const resumo = resumoCarteira(ativos);
  const patrimonioAtual = resumo.totalAtual;
  const semana = inicioDaSemana();
  const fimSemana = new Date(semana);
  fimSemana.setDate(fimSemana.getDate() + 6);

  const aportesSemana = aportes
    .filter((a) => new Date(a.data) >= semana)
    .reduce((s, a) => s + Number(a.preco) * Number(a.quantidade) + Number(a.taxas ?? 0), 0);

  const dividendosSemana = dividendos
    .filter((d) => new Date(d.data) >= semana)
    .reduce((s, d) => s + Number(d.valor), 0);

  // Próximos proventos: média dos últimos 12 meses distribuída ao mês corrente
  const dozeMeses = new Date();
  dozeMeses.setMonth(dozeMeses.getMonth() - 12);
  const div12m = dividendos
    .filter((d) => new Date(d.data) >= dozeMeses)
    .reduce((s, d) => s + Number(d.valor), 0);
  const proximosProventos = div12m / 12;

  const variacaoSemana =
    patrimonioAnterior && patrimonioAnterior > 0
      ? ((patrimonioAtual - patrimonioAnterior) / patrimonioAnterior) * 100
      : null;

  const metasProgresso = metas.map((m) => ({
    nome: m.nome,
    pct: Math.min(100, Math.round((patrimonioAtual / Number(m.alvo)) * 100)),
  }));

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const partes: string[] = [];
  partes.push(`📊 Resumo semanal (${formatarData(semana)} a ${formatarData(fimSemana)}):`);
  partes.push(
    `• Patrimônio: ${brl(patrimonioAtual)}${variacaoSemana != null ? ` (${variacaoSemana >= 0 ? "+" : ""}${variacaoSemana.toFixed(1)}% na semana)` : ""}`,
  );
  if (aportesSemana > 0) partes.push(`• Aportes da semana: ${brl(aportesSemana)}`);
  if (dividendosSemana > 0) partes.push(`• Proventos recebidos: ${brl(dividendosSemana)}`);
  partes.push(`• Renda passiva estimada/mês: ${brl(proximosProventos)}`);
  if (metasProgresso.length > 0) {
    const principal = metasProgresso[0];
    partes.push(`• Meta "${principal.nome}": ${principal.pct}% concluída`);
  }

  return {
    geradoEm: new Date().toISOString(),
    semana: `${formatarData(semana)} a ${formatarData(fimSemana)}`,
    patrimonioAtual: Math.round(patrimonioAtual),
    patrimonioAnterior: patrimonioAnterior ? Math.round(patrimonioAnterior) : 0,
    variacaoSemana: variacaoSemana != null ? Math.round(variacaoSemana * 100) / 100 : null,
    aportesSemana: Math.round(aportesSemana * 100) / 100,
    dividendosSemana: Math.round(dividendosSemana * 100) / 100,
    proximosProventos: Math.round(proximosProventos * 100) / 100,
    metasProgresso,
    resumoTexto: partes.join("\n"),
  };
}

/** Persiste o "patrimônio da semana" no localStorage para comparar na próxima. */
const CHAVE_PATRIMONIO_SEMANA = "vr15:patrimonio-semana";

export function lerPatrimonioAnterior(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(CHAVE_PATRIMONIO_SEMANA);
    if (!bruto) return null;
    const { valor, em } = JSON.parse(bruto) as { valor: number; em: string };
    // Só usa se for da semana passada ou mais antigo (senão comparação fica circular)
    if (Date.now() - new Date(em).getTime() > 2 * 86_400_000) return valor;
    return null;
  } catch {
    return null;
  }
}

export function salvarPatrimonioSemana(valor: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CHAVE_PATRIMONIO_SEMANA,
      JSON.stringify({ valor, em: new Date().toISOString() }),
    );
  } catch {
    /* storage indisponível */
  }
}
