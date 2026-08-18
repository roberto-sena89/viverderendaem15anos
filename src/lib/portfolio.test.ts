import { describe, expect, it } from "vitest";
import { CLASSE_POS_FIXADO, classeDoAtivo, alocacaoIdeal } from "./portfolio";
import type { Ativo, Categoria } from "./portfolio";

const ativo = (over: Partial<Ativo>): Ativo => ({
  id: "1",
  ticker: "",
  nome: "",
  categoria: "Renda Fixa",
  quantidade: 1,
  precoMedio: 1,
  precoAtual: 1,
  dy: 0,
  ...over,
});

describe("classeDoAtivo · Tesouro Direto e Renda Fixa", () => {
  const titulos = [
    ["TESOURO PRE-2032", "TESOURO PRE-2032"],
    ["TESOURO PREFIXADO 2029", ""],
    ["LTN", "Tesouro Prefixado"],
    ["NTN-F", ""],
    ["TESOURO IPCA+ 2035", ""],
    ["NTN-B", "Tesouro IPCA+ com juros"],
    ["SELIC", "TESOURO SELIC 2031"],
    ["LFT", ""],
    ["TESOURO XPTO", ""],
  ];

  it("todo título do Tesouro Direto cai na janela única de Renda Fixa", () => {
    for (const [ticker, nome] of titulos) {
      expect(classeDoAtivo(ativo({ ticker, nome, categoria: "Tesouro Direto" }))).toBe(
        CLASSE_POS_FIXADO,
      );
    }
  });

  it("CDB/CDI/LCI/LCA caem na mesma janela de Renda Fixa", () => {
    for (const t of ["CDB BANCO X", "CDI PLUS", "LCI 2027", "LCA AGRO", "RF GENERICA"]) {
      expect(classeDoAtivo(ativo({ ticker: t, categoria: "Renda Fixa" }))).toBe(CLASSE_POS_FIXADO);
    }
  });
});

describe("classeDoAtivo · demais categorias", () => {
  const mapa: [Categoria, string][] = [
    ["Ações", "Ações"],
    ["ETF Brasil", "ETFs - Brasil"],
    ["ETF EUA", "ETFs - Global"],
    ["ETF (Global)", "ETFs - Global"],
    ["BDR", "BDRs"],
    ["Stocks", "Stocks"],
    ["REITs", "REITs"],
    ["Criptomoedas", "Criptomoedas"],
    ["Fundos de Investimentos", "Fundos de Investimentos"],
    ["FIIS", "FIIs"],
    ["FIIs", "FIIs"],
    ["Fiagro", "FIIs"],
  ];

  it("mapeia cada categoria para a janela correspondente", () => {
    for (const [categoria, esperado] of mapa) {
      expect(classeDoAtivo(ativo({ ticker: "TESTE11", categoria }))).toBe(esperado);
    }
  });

  it("ticker com palavra de renda fixa não muda a classe de categorias de variável", () => {
    expect(
      classeDoAtivo(ativo({ ticker: "SELIC11", nome: "ETF Selic", categoria: "ETF Brasil" })),
    ).toBe("ETFs - Brasil");
  });
});

describe("integridade das janelas de rebalanceamento", () => {
  it("toda classe retornada existe na tabela de alocação-alvo", () => {
    const categorias = [
      "Ações",
      "FIIS",
      "Tesouro Direto",
      "BDR",
      "ETF Brasil",
      "ETF (Global)",
      "Fiagro",
      "Fundos de Investimentos",
      "Renda Fixa",
      "Stocks",
      "REITs",
      "Criptomoedas",
      "FIIs",
      "ETF EUA",
      "Tesouro",
    ] as Categoria[];

    for (const categoria of categorias) {
      const classe = classeDoAtivo(ativo({ ticker: "X", categoria }));
      expect(Object.keys(alocacaoIdeal)).toContain(classe);
    }
  });

  it("renda fixa tem uma única janela", () => {
    expect(alocacaoIdeal).toHaveProperty(CLASSE_POS_FIXADO);
    expect(Object.keys(alocacaoIdeal).filter((c) => c.startsWith("Renda Fixa"))).toHaveLength(1);
  });

  it("a alocação-alvo padrão soma 100%", () => {
    const soma = Object.values(alocacaoIdeal).reduce((s, v) => s + v, 0);
    expect(soma).toBeCloseTo(100, 5);
  });
});
