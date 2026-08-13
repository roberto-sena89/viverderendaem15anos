import { describe, expect, it } from "vitest";
import { casarTitulo, ehTituloTesouro, type TituloTesouro } from "./tesouro.server";

const titulo = (nome: string, vencimento: string): TituloTesouro => ({
  nome,
  vencimento,
  dataBase: "2026-01-01",
  taxaCompra: 10,
  taxaVenda: 10,
  precoCompra: 1000,
  precoVenda: 1000,
  serie: [],
});

const titulos = [
  titulo("Tesouro Prefixado 2027", "2027-01-01"),
  titulo("Tesouro Prefixado 2032", "2032-01-01"),
  titulo("Tesouro Selic 2029", "2029-03-01"),
  titulo("Tesouro IPCA+ 2035", "2035-05-15"),
];

describe("ehTituloTesouro", () => {
  it("reconhece títulos do Tesouro em vários formatos", () => {
    const exemplos = [
      "TESOURO PREFIXADO 2032",
      "TESOURO SELIC 2029",
      "TESOURO IPCA+ 2035",
      "TESOURO RENDA+ 2030",
      "SELIC 2029",
      "PREFIXADO 2032",
      "IPCA+ 2035",
      "LFT",
      "NTN-B",
      "LTN 2027",
    ];
    for (const t of exemplos) {
      expect(ehTituloTesouro(t), t).toBe(true);
    }
  });

  it("não confunde tickers da B3 (ex.: ETF Selic) com Tesouro", () => {
    const tickers = ["SELIC11", "IPCA11", "BOVA11", "HGLG11", "PETR4", "IVVB11", "AAPL"];
    for (const t of tickers) {
      expect(ehTituloTesouro(t), t).toBe(false);
    }
  });
});

describe("casarTitulo", () => {
  it("casa pelo ano do vencimento", () => {
    expect(casarTitulo("TESOURO PREFIXADO 2032", titulos)?.vencimento).toBe("2032-01-01");
  });

  it("casa IPCA+ pelo ano", () => {
    expect(casarTitulo("TESOURO IPCA+ 2035", titulos)?.vencimento).toBe("2035-05-15");
  });

  it("sem ano, usa o vencimento mais próximo do indexador", () => {
    expect(casarTitulo("SELIC", titulos)?.vencimento).toBe("2029-03-01");
  });

  it("ticker de ETF com 'SELIC' no nome não casa título", () => {
    expect(casarTitulo("SELIC11", titulos)).toBeNull();
  });

  it("texto que não parece Tesouro não casa título", () => {
    expect(casarTitulo("PETR4", titulos)).toBeNull();
    expect(casarTitulo("HGLG11", titulos)).toBeNull();
  });
});
