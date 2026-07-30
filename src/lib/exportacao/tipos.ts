/**
 * Tipos compartilhados pelo serviço de exportação da carteira.
 * Uma `LinhaCarteira` já vem calculada e normalizada (números decimais puros),
 * pronta tanto para o gerador Excel quanto para o gerador CSV.
 */

export interface LinhaCarteira {
  tipo: string;
  ticker: string;
  nome: string;
  quantidade: number;
  precoMedio: number;
  cotacaoAtual: number;
  valorInvestido: number;
  valorAtual: number;
  lucro: number;
  lucroPercentual: number;
  dividendYield: number;
  dividendosRecebidos: number;
  setor: string;
  participacao: number;
  /** ISO YYYY-MM-DD */
  atualizadoEm: string;
}

export interface DistribuicaoClasse {
  classe: string;
  valor: number;
  participacao: number;
}

export interface ResumoExportacao {
  patrimonioTotal: number;
  totalInvestido: number;
  valorAtual: number;
  lucroTotal: number;
  rentabilidadeTotal: number;
  dividendosRecebidos: number;
  numeroAtivos: number;
  distribuicao: DistribuicaoClasse[];
}

export interface DadosExportacao {
  linhas: LinhaCarteira[];
  resumo: ResumoExportacao;
  /** ISO YYYY-MM-DD usado nos nomes de arquivo. */
  data: string;
}

export type FormatoExportacao = "xlsx" | "csv" | "ambos";
