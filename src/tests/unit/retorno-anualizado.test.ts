import { describe, expect, it } from "vitest";
import { retornoAnualizado, type Aporte } from "../../lib/portfolio";

const aporte = (data: string, quantidade: number, preco: number, taxas = 0): Aporte => ({
  id: "x",
  data,
  corretora: "Teste",
  ticker: "TEST",
  categoria: "Ações",
  quantidade,
  preco,
  taxas,
});

describe("retornoAnualizado", () => {
  it("retorna 10% a.a. para um aporte que valorizou 10% em exatamente 1 ano", () => {
    const retorno = retornoAnualizado(
      [aporte("2024-08-18", 10, 100)],
      1100,
      new Date("2025-08-18T12:00:00"),
    );
    expect(retorno).not.toBeNull();
    expect(retorno).toBeCloseTo(10, 1);
  });

  it("resolve aportes em datas diferentes (Newton-Raphson converge)", () => {
    const retorno = retornoAnualizado(
      [aporte("2024-08-18", 10, 100), aporte("2025-02-17", 10, 100)],
      2200,
      new Date("2025-08-18T12:00:00"),
    );
    expect(retorno).not.toBeNull();
    expect(retorno).toBeCloseTo(13.47, 1);
  });

  it("considera venda (quantidade negativa) como fluxo de entrada", () => {
    const retorno = retornoAnualizado(
      [aporte("2024-08-18", 10, 100), aporte("2025-02-17", -5, 120, 5)],
      600,
      new Date("2025-08-18T12:00:00"),
    );
    expect(retorno).not.toBeNull();
    expect(retorno).toBeGreaterThan(0);
  });

  it("retorna null sem aportes datados", () => {
    expect(retornoAnualizado([], 1000, new Date("2025-08-18T12:00:00"))).toBeNull();
  });

  it("retorna null com saldo atual zerado", () => {
    expect(
      retornoAnualizado([aporte("2024-08-18", 10, 100)], 0, new Date("2025-08-18T12:00:00")),
    ).toBeNull();
  });

  it("retorna null quando todos os fluxos têm o mesmo sinal", () => {
    const soVendas = retornoAnualizado(
      [aporte("2024-08-18", -10, 100)],
      1100,
      new Date("2025-08-18T12:00:00"),
    );
    expect(soVendas).toBeNull();
  });

  it("ignora aportes com data futura em relação a hoje", () => {
    const retorno = retornoAnualizado(
      [aporte("2026-08-18", 10, 100), aporte("2024-08-18", 10, 100)],
      1100,
      new Date("2025-08-18T12:00:00"),
    );
    expect(retorno).not.toBeNull();
    expect(retorno).toBeCloseTo(10, 1);
  });
});