import { describe, expect, it } from "vitest";
import { apurarIR, lancarVendas, ultimoDiaUtilDoMes } from "./tributacao";
import type { Aporte } from "./portfolio";

const mov = (
  data: string,
  ticker: string,
  quantidade: number,
  preco: number,
  categoria: Aporte["categoria"] = "Ações",
  taxas = 0,
): Aporte => ({
  id: `${ticker}-${data}-${quantidade}`,
  data,
  corretora: "Teste",
  ticker,
  categoria,
  quantidade,
  preco,
  taxas,
  observacoes: null,
});

describe("tributação", () => {
  it("ultimoDiaUtilDoMes: fevereiro/2025 termina em sex 28", () => {
    expect(ultimoDiaUtilDoMes("2025-02")).toBe("2025-02-28");
  });

  it("ultimoDiaUtilDoMes: março/2025 termina em seg 31", () => {
    expect(ultimoDiaUtilDoMes("2025-03")).toBe("2025-03-31");
  });

  it("lança venda com custo médio correto", () => {
    const vendas = lancarVendas([
      mov("2025-01-05", "PETR4", 10, 30),
      mov("2025-02-10", "PETR4", -4, 35),
    ]);
    expect(vendas).toHaveLength(1);
    expect(vendas[0].precoMedio).toBe(30);
    expect(vendas[0].ganho).toBe(4 * 35 - 4 * 30);
    expect(vendas[0].bruto).toBe(140);
  });

  it("ações: vendas <= R$ 20k no mês → ganho isento, sem DARF", () => {
    const { linhas, totalIR } = apurarIR([
      mov("2025-01-05", "PETR4", 10, 30),
      mov("2025-01-20", "PETR4", -10, 35),
    ]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].isencaoAplicada).toBe(true);
    expect(linhas[0].ganhoTributavel).toBe(0);
    expect(totalIR).toBe(0);
  });

  it("ações: vendas > R$ 20k → IR 15% e DARF 6015", () => {
    const { linhas } = apurarIR([
      mov("2025-01-05", "PETR4", 1000, 10),
      mov("2025-01-20", "PETR4", -1000, 30),
    ]);
    expect(linhas[0].ganhoTributavel).toBe(20_000);
    expect(linhas[0].ir).toBe(3_000);
    expect(linhas[0].codigoDarf).toBe("6015");
    expect(linhas[0].precisaDarf).toBe(true);
  });

  it("fii: 20% sem isenção", () => {
    const { linhas } = apurarIR([
      mov("2025-03-05", "KNRI11", 100, 100, "FIIs"),
      mov("2025-03-15", "KNRI11", -100, 120, "FIIs"),
    ]);
    expect(linhas[0].regra).toBe("fii");
    expect(linhas[0].ir).toBeCloseTo(400); // 20% de 2000
  });

  it("prejuízo de um mês compensa ganho do seguinte (ações)", () => {
    const { linhas } = apurarIR([
      mov("2025-01-05", "PETR4", 1000, 20),
      mov("2025-01-10", "PETR4", -1000, 18), // prejuízo 2.000
      mov("2025-02-05", "PETR4", 1000, 20),
      mov("2025-02-10", "PETR4", -1000, 26), // ganho 6.000 → tributa 4.000
    ]);
    expect(linhas).toHaveLength(2);
    const fev = linhas.find((l) => l.mes === "2025-02")!;
    expect(fev.prejuizoCompensado).toBe(2_000);
    expect(fev.ganhoTributavel).toBe(4_000);
    expect(fev.ir).toBe(600);
  });

  it("cripto: isenção de R$ 35k e código 4600", () => {
    const { linhas } = apurarIR([
      mov("2025-04-01", "BTC", 0.1, 300_000, "Criptomoedas"),
      mov("2025-04-10", "BTC", -0.1, 400_000, "Criptomoedas"),
    ]);
    expect(linhas[0].regra).toBe("cripto");
    expect(linhas[0].isencaoAplicada).toBe(false); // 40k > 35k
    expect(linhas[0].codigoDarf).toBe("4600");
    expect(linhas[0].ir).toBeCloseTo(1500); // 15% de 10.000
  });
});
