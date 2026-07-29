import { describe, expect, it } from "vitest";
import { CLASSE_POS_FIXADO, classeDoAtivo, alocacaoIdeal } from "./portfolio";
import type { Ativo, Categoria } from "./portfolio";

const ativo = (over: Partial<Ativo>): Ativo => ({
  id: "1",
  ticker: "",
  nome: "",
  categoria: "Renda Fixa" as Categoria,
  quantidade: 1,
  precoMedio: 1,
  precoAtual: 1,
  dy: 0,
  ...over,
});

describe("classeDoAtivo · Tesouro Direto e Renda Fixa", () => {
  const casos: [string, string, string][] = [
    ["TESOURO PRE-2032", "TESOURO PRE-2032", "Renda Fixa\nPré-fixado"],
    ["TESOURO PREFIXADO 2029", "", "Renda Fixa\nPré-fixado"],
    ["LTN", "Tesouro Prefixado", "Renda Fixa\nPré-fixado"],
    ["NTN-F", "", "Renda Fixa\nPré-fixado"],
    ["TESOURO IPCA+ 2035", "", "Renda Fixa\nIPCA+"],
    ["NTN-B", "Tesouro IPCA+ com juros", "Renda Fixa\nIPCA+"],
    ["SELIC", "TESOURO SELIC 2031", CLASSE_POS_FIXADO],
    ["LFT", "", CLASSE_POS_FIXADO],
  ];

  it("classifica cada título no indexador correto", () => {
    for (const [ticker, nome, esperado] of casos) {
      expect(classeDoAtivo(ativo({ ticker, nome, categoria: "Tesouro Direto" }))).toBe(esperado);
    }
  });

  it("CDB/LCI/LCA caem em pós-fixado", () => {
    for (const t of ["CDB BANCO X", "LCI 2027", "LCA AGRO"]) {
      expect(classeDoAtivo(ativo({ ticker: t, categoria: "Renda Fixa" }))).toBe(CLASSE_POS_FIXADO);
    }
  });

  it("renda fixa sem indexador identificável usa pós-fixado como padrão", () => {
    expect(classeDoAtivo(ativo({ ticker: "RF GENERICA", categoria: "Renda Fixa" }))).toBe(CLASSE_POS_FIXADO);
  });

  it("Tesouro sem indexador identificável usa IPCA+ como padrão", () => {
    expect(classeDoAtivo(ativo({ ticker: "TESOURO XPTO", categoria: "Tesouro Direto" }))).toBe("Renda Fixa\nIPCA+");
  });
});

describe("classeDoAtivo · demais categorias", () => {
  const mapa: [Categoria, string][] = [
    ["Ações", "Ações"],
    ["ETF Brasil", "ETF (Brasil)"],
    ["ETF EUA", "ETF (EUA)"],
    ["ETF (Exterior)", "ETF (EUA)"],
    ["BDR", "BDRs"],
    ["Stocks", "Stocks"],
    ["REITs", "REITs"],
    ["Criptomoedas", "Criptomoedas"],
    ["Fundos de Investimentos", "Fundos de\nInvestimentos"],
    ["Fundos Imobiliários", "FIIs"],
    ["FIIs", "FIIs"],
    ["Fiagro", "FIIs"],
  ];

  it("mapeia cada categoria para a janela correspondente", () => {
    for (const [categoria, esperado] of mapa) {
      expect(classeDoAtivo(ativo({ ticker: "TESTE11", categoria }))).toBe(esperado);
    }
  });

  it("ticker com palavra de renda fixa não muda a classe de categorias de variável", () => {
    expect(classeDoAtivo(ativo({ ticker: "SELIC11", nome: "ETF Selic", categoria: "ETF Brasil" }))).toBe(
      "ETF (Brasil)",
    );
  });
});

describe("integridade das janelas de rebalanceamento", () => {
  it("toda classe retornada existe na tabela de alocação-alvo", () => {
    const categorias = [
      "Ações",
      "Fundos Imobiliários",
      "Tesouro Direto",
      "BDR",
      "ETF Brasil",
      "ETF (Exterior)",
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

  it("os três indexadores de renda fixa têm janela própria", () => {
    for (const c of [CLASSE_POS_FIXADO, "Renda Fixa\nIPCA+", "Renda Fixa\nPré-fixado"]) {
      expect(alocacaoIdeal).toHaveProperty(c);
    }
  });

  it("a alocação-alvo padrão soma 100%", () => {
    const soma = Object.values(alocacaoIdeal).reduce((s, v) => s + v, 0);
    expect(soma).toBeCloseTo(100, 5);
  });
});
