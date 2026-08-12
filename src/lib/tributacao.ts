/**
 * Apuração simplificada de IR sobre ganho de capital em vendas.
 *
 * Regras aplicadas (mercado à vista / swing trade):
 * - Ações: isento quando o total vendido no mês <= R$ 20.000; acima disso 15% (código 6015).
 * - FIIs/Fiagro/Fundos Imobiliários: 20% (código 6015), sem isenção.
 * - ETFs/BDRs/Stocks/REITs: 15% (código 6015), sem isenção.
 * - Criptoativos: isenção quando vendas no mês <= R$ 35.000; acima, 15% (código 4600).
 * - Renda fixa/Tesouro/Fundos: tributação na fonte/tabela regressiva — fora do modelo.
 *
 * Prejuízo compensa ganho dentro da mesma regra em meses seguintes.
 * DARF vence no último dia útil do mês seguinte; mínimo de R$ 10,00.
 * Aviso: apuração simplificada para planejamento, não substitui a declaração.
 */
import type { Aporte, Categoria } from "@/lib/portfolio";

export type RegraTributaria = "acao" | "fii" | "etf" | "bdr" | "stock" | "cripto" | "nao-apurado";

export interface RegraInfo {
  aliquota: number; // % sobre o ganho tributável
  isencaoVendas?: number; // isenção por volume de vendas no mês
  codigoDarf: string;
  rotulo: string;
}

export const REGRAS: Record<RegraTributaria, RegraInfo> = {
  acao: { aliquota: 15, isencaoVendas: 20_000, codigoDarf: "6015", rotulo: "Ações" },
  fii: { aliquota: 20, codigoDarf: "6015", rotulo: "FIIs / Fiagros / Fundos Imobiliários" },
  etf: { aliquota: 15, codigoDarf: "6015", rotulo: "ETFs" },
  bdr: { aliquota: 15, codigoDarf: "6015", rotulo: "BDRs" },
  stock: { aliquota: 15, codigoDarf: "6015", rotulo: "Stocks / REITs" },
  cripto: { aliquota: 15, isencaoVendas: 35_000, codigoDarf: "4600", rotulo: "Criptoativos" },
  "nao-apurado": { aliquota: 0, codigoDarf: "", rotulo: "Renda fixa / Tesouro (retido na fonte)" },
};

export function regraDaCategoria(categoria: Categoria): RegraTributaria {
  switch (categoria) {
    case "Ações":
      return "acao";
    case "FIIS":
    case "FIIs":
    case "Fiagro":
      return "fii";
    case "ETF Brasil":
    case "ETF (Global)":
    case "ETF EUA":
      return "etf";
    case "BDR":
      return "bdr";
    case "Stocks":
    case "REITs":
      return "stock";
    case "Criptomoedas":
      return "cripto";
    default:
      return "nao-apurado";
  }
}

export interface VendaApurada {
  mes: string; // AAAA-MM
  ticker: string;
  categoria: Categoria;
  regra: RegraTributaria;
  quantidade: number; // positiva = vendido
  precoVenda: number;
  precoMedio: number;
  taxas: number;
  bruto: number; // valor da venda (sem taxas)
  ganho: number; // ganho (+) ou prejuízo (-)
}

export interface LinhaMesRegra {
  mes: string;
  regra: RegraTributaria;
  rotulo: string;
  aliquota: number;
  vendasBrutas: number;
  ganhoBruto: number;
  isencaoAplicada: boolean;
  prejuizoCompensado: number;
  ganhoTributavel: number;
  ir: number;
  codigoDarf: string;
  vencimento: string;
  precisaDarf: boolean; // ir >= 10
}

export interface ApuracaoIR {
  linhas: LinhaMesRegra[];
  totalIR: number;
  totalVendas: number;
  totalGanho: number;
}

/** Último dia útil (seg-sex) do mês dado em AAAA-MM. */
export function ultimoDiaUtilDoMes(mes: string): string {
  const [ano, mesNum] = mes.split("-").map(Number);
  const data = new Date(ano, mesNum, 0); // último dia do mês
  while (data.getDay() === 0 || data.getDay() === 6) {
    data.setDate(data.getDate() - 1);
  }
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

/**
 * Reconstitui o custo médio por ticker+categoria na ordem cronológica e
 * lança cada venda com o ganho apurado na data (taxas abatidas na venda).
 */
export function lancarVendas(aportes: Aporte[]): VendaApurada[] {
  const ordenados = [...aportes].sort((a, b) => a.data.localeCompare(b.data));
  const estado = new Map<string, { quantidade: number; precoMedio: number }>();
  const vendas: VendaApurada[] = [];

  for (const ap of ordenados) {
    const chave = `${ap.ticker}|${ap.categoria}`;
    const atual = estado.get(chave) ?? { quantidade: 0, precoMedio: 0 };

    if (ap.quantidade > 0) {
      const novaQtd = atual.quantidade + ap.quantidade;
      const custoTotal = atual.quantidade * atual.precoMedio + ap.quantidade * ap.preco + ap.taxas;
      estado.set(chave, {
        quantidade: novaQtd,
        precoMedio: novaQtd > 0 ? custoTotal / novaQtd : 0,
      });
      continue;
    }
    if (ap.quantidade < 0) {
      const qtd = -ap.quantidade;
      const bruto = qtd * ap.preco;
      const ganho = bruto - ap.taxas - qtd * atual.precoMedio;
      vendas.push({
        mes: ap.data.slice(0, 7),
        ticker: ap.ticker,
        categoria: ap.categoria,
        regra: regraDaCategoria(ap.categoria),
        quantidade: qtd,
        precoVenda: ap.preco,
        precoMedio: atual.precoMedio,
        taxas: ap.taxas,
        bruto,
        ganho,
      });
      const novaQtd = atual.quantidade - qtd;
      estado.set(chave, { quantidade: novaQtd, precoMedio: novaQtd > 0 ? atual.precoMedio : 0 });
    }
  }
  return vendas;
}

/**
 * Apura IR por mês × regra: aplica isenção de vendas (Ações/cripto),
 * compensa prejuízo acumulado dentro da mesma regra e monta o DARF.
 */
export function apurarIR(aportes: Aporte[]): ApuracaoIR {
  const vendas = lancarVendas(aportes);
  const porMes: Record<string, VendaApurada[]> = {};
  for (const venda of vendas) {
    (porMes[venda.mes] ??= []).push(venda);
  }

  const prejuizoAcumulado: Partial<Record<RegraTributaria, number>> = {};
  const linhas: LinhaMesRegra[] = [];

  for (const mes of Object.keys(porMes).sort()) {
    const lista = porMes[mes];
    const porRegra = new Map<RegraTributaria, VendaApurada[]>();
    for (const venda of lista) {
      const grupo = porRegra.get(venda.regra) ?? [];
      grupo.push(venda);
      porRegra.set(venda.regra, grupo);
    }

    for (const [regra, grupo] of porRegra) {
      const info = REGRAS[regra];
      const vendasBrutas = grupo.reduce((s, v) => s + v.bruto, 0);
      const ganhoBruto = grupo.reduce((s, v) => s + v.ganho, 0);
      const isencaoAplicada =
        info.isencaoVendas !== undefined && vendasBrutas <= info.isencaoVendas;

      let ganhoTributavel = ganhoBruto;
      let prejuizoCompensado = 0;

      // Isenção por volume de vendas atinge apenas o ganho; prejuízo acumula.
      if (isencaoAplicada && ganhoBruto > 0) {
        ganhoTributavel = 0;
      }

      if (ganhoTributavel > 0) {
        const disponivel = prejuizoAcumulado[regra] ?? 0;
        if (disponivel < 0) {
          prejuizoCompensado = Math.min(ganhoTributavel, -disponivel);
          ganhoTributavel -= prejuizoCompensado;
          prejuizoAcumulado[regra] = disponivel + prejuizoCompensado;
          if ((prejuizoAcumulado[regra] ?? 0) >= 0) delete prejuizoAcumulado[regra];
        }
      } else if (ganhoTributavel < 0) {
        prejuizoAcumulado[regra] = (prejuizoAcumulado[regra] ?? 0) + ganhoTributavel;
      }

      const ir = ganhoTributavel > 0 ? ganhoTributavel * (info.aliquota / 100) : 0;
      linhas.push({
        mes,
        regra,
        rotulo: info.rotulo,
        aliquota: info.aliquota,
        vendasBrutas,
        ganhoBruto,
        isencaoAplicada,
        prejuizoCompensado,
        ganhoTributavel: Math.max(0, ganhoTributavel),
        ir,
        codigoDarf: info.codigoDarf,
        vencimento: ultimoDiaUtilDoMes(mes),
        precisaDarf: ir >= 10,
      });
    }
  }

  return {
    linhas: linhas.sort((a, b) => (a.mes < b.mes ? 1 : a.mes > b.mes ? -1 : 0)),
    totalIR: linhas.reduce((s, l) => s + l.ir, 0),
    totalVendas: vendas.reduce((s, v) => s + v.bruto, 0),
    totalGanho: vendas.reduce((s, v) => s + v.ganho, 0),
  };
}
