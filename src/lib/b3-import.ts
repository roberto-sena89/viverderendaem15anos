/**
 * Leitura dos relatórios exportados pela Área do Investidor da B3
 * (Extrato de Negociação e Extrato de Movimentação) em CSV ou Excel.
 */
import * as XLSX from "xlsx";
import type { Categoria } from "@/lib/portfolio";

export interface AporteB3 {
  data: string;
  corretora: string;
  ticker: string;
  categoria: Categoria;
  quantidade: number;
  preco: number;
  taxas: number;
  observacoes?: string;
}

export interface DividendoB3 {
  data: string;
  ticker: string;
  tipo: string;
  valor: number;
}

export interface ResultadoB3 {
  aportes: AporteB3[];
  dividendos: DividendoB3[];
  vendas: number;
  ignoradas: number;
}

const semAcento = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function pegar(linha: Record<string, unknown>, ...chaves: string[]): string {
  for (const chave of chaves) {
    const alvo = semAcento(chave);
    for (const [k, v] of Object.entries(linha)) {
      if (semAcento(String(k)) === alvo && v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
  }
  return "";
}

export function numeroBR(valor: string): number {
  if (!valor) return 0;
  const limpo = valor
    .replace(/r\$/i, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

export function dataISO(valor: string): string {
  const v = valor.trim();
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

/** Extrai o código de negociação de "PETR4 - PETROLEO BRASILEIRO" ou "MXRF11". */
export function extrairTicker(produto: string): string {
  const bruto = produto.split(/\s+-\s+/)[0].trim().toUpperCase();
  const m = bruto.match(/[A-Z]{4}\d{1,2}[A-Z]?/);
  return (m?.[0] ?? bruto.split(/\s/)[0] ?? "").toUpperCase();
}

export function categoriaDoTicker(ticker: string, mercado = ""): Categoria {
  const m = semAcento(mercado);
  if (m.includes("fracion") || m.includes("vista")) {
    // segue pela terminação
  }
  if (/11B?$/.test(ticker)) return "FIIs";
  if (/(3|4|5|6)$/.test(ticker)) return "Ações";
  if (/3[1-9]$/.test(ticker)) return "ETF EUA";
  return "Ações";
}

const TIPOS_PROVENTO = ["dividendo", "juros sobre capital", "rendimento", "jcp"];

async function lerLinhas(arquivo: File): Promise<Record<string, unknown>[]> {
  const buffer = await arquivo.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", raw: false, cellDates: false });
  const linhas: Record<string, unknown>[] = [];
  for (const nome of wb.SheetNames) {
    linhas.push(...XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[nome], { defval: "", raw: false }));
  }
  return linhas;
}

export async function lerArquivoB3(arquivo: File): Promise<ResultadoB3> {
  const linhas = await lerLinhas(arquivo);
  const aportes: AporteB3[] = [];
  const dividendos: DividendoB3[] = [];
  let vendas = 0;
  let ignoradas = 0;

  for (const linha of linhas) {
    const produto = pegar(linha, "Código de Negociação", "Codigo de Negociacao", "Produto", "Ativo");
    const ticker = extrairTicker(produto);
    const data = pegar(linha, "Data do Negócio", "Data do Negocio", "Data", "Data Referência");
    const instituicao = pegar(linha, "Instituição", "Instituicao", "Corretora") || "B3";

    if (!ticker || !data) {
      ignoradas++;
      continue;
    }

    const movimento = semAcento(
      pegar(linha, "Tipo de Movimentação", "Tipo de Movimentacao", "Movimentação", "Movimentacao", "Entrada/Saída"),
    );

    if (TIPOS_PROVENTO.some((t) => movimento.includes(t))) {
      const valor = numeroBR(pegar(linha, "Valor da Operação", "Valor da Operacao", "Valor"));
      if (valor > 0) {
        dividendos.push({
          data: dataISO(data),
          ticker,
          tipo: movimento.includes("juros") || movimento.includes("jcp") ? "JCP" : movimento.includes("rendimento") ? "Rendimento" : "Dividendo",
          valor,
        });
      } else ignoradas++;
      continue;
    }

    const compra = movimento.includes("compra") || movimento.includes("credito") || movimento.includes("entrada");
    if (movimento.includes("venda") || movimento.includes("debito") || movimento.includes("saida")) {
      vendas++;
      continue;
    }
    if (!compra) {
      ignoradas++;
      continue;
    }

    const quantidade = numeroBR(pegar(linha, "Quantidade", "Qtde"));
    let preco = numeroBR(pegar(linha, "Preço", "Preco", "Preço unitário", "Preco unitario"));
    const valorTotal = numeroBR(pegar(linha, "Valor", "Valor da Operação", "Valor da Operacao"));
    if (!preco && quantidade > 0 && valorTotal > 0) preco = valorTotal / quantidade;

    if (quantidade > 0 && preco > 0) {
      aportes.push({
        data: dataISO(data),
        corretora: instituicao,
        ticker,
        categoria: categoriaDoTicker(ticker, pegar(linha, "Mercado")),
        quantidade,
        preco,
        taxas: 0,
        observacoes: "Importado da B3",
      });
    } else ignoradas++;
  }

  aportes.sort((a, b) => a.data.localeCompare(b.data));
  dividendos.sort((a, b) => a.data.localeCompare(b.data));
  return { aportes, dividendos, vendas, ignoradas };
}
