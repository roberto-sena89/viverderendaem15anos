import type { Ativo, Dividendo } from "@/lib/portfolio";
import { baixarArquivo } from "./formatadores";
import { gerarCsvChatGpt } from "./gerador-csv";
import { gerarXlsxCarteira } from "./gerador-xlsx";
import { montarDadosExportacao } from "./montar-dados";
import type { FormatoExportacao } from "./tipos";

export * from "./tipos";
export { montarDadosExportacao } from "./montar-dados";

/**
 * Serviço de exportação da carteira — executa 100% no cliente.
 * Lança erro em caso de falha para que a UI exiba a notificação adequada.
 */
export async function exportarCarteira(
  formato: FormatoExportacao,
  ativos: Ativo[],
  dividendos: Dividendo[] = [],
): Promise<void> {
  if (!ativos.length) throw new Error("Nenhum ativo na carteira para exportar.");

  const dados = montarDadosExportacao(ativos, dividendos);

  if (formato === "xlsx" || formato === "ambos") {
    const blob = await gerarXlsxCarteira(dados);
    baixarArquivo(blob, `Carteira_Investimentos_${dados.data}.xlsx`);
  }

  if (formato === "csv" || formato === "ambos") {
    const blob = gerarCsvChatGpt(dados);
    baixarArquivo(blob, `Carteira_ChatGPT_${dados.data}.csv`);
  }
}
