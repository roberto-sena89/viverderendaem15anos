import { describe, expect, it } from "vitest";
import {
  colunasVisiveis,
  distribuirLarguras,
  type ColunaResponsiva,
} from "../../lib/colunas-responsivas";

const COLUNAS: ColunaResponsiva[] = [
  { id: "ticker", rotulo: "Ativo", peso: 2, essencial: true },
  { id: "preco", rotulo: "Preço", peso: 1 },
  { id: "minimo", rotulo: "Mínimo", peso: 1, visivelDe: "desktop" },
  { id: "volume", rotulo: "Volume", peso: 1, visivelDe: "desktop" },
];

describe("colunasVisiveis", () => {
  it("mostra todas as colunas no desktop e acima", () => {
    expect(colunasVisiveis(COLUNAS, "desktop").map((c) => c.id)).toEqual([
      "ticker",
      "preco",
      "minimo",
      "volume",
    ]);
    expect(colunasVisiveis(COLUNAS, "ultraWide").map((c) => c.id)).toHaveLength(4);
  });

  it("esconde colunas abaixo do breakpoint de visibilidade", () => {
    expect(colunasVisiveis(COLUNAS, "tablet").map((c) => c.id)).toEqual(["ticker", "preco"]);
    expect(colunasVisiveis(COLUNAS, "mobile").map((c) => c.id)).toEqual(["ticker", "preco"]);
  });

  it("colunas mínimas forçam visibilidade mesmo fora do visivelDe", () => {
    expect(colunasVisiveis(COLUNAS, "mobile", ["minimo"]).map((c) => c.id)).toEqual([
      "ticker",
      "preco",
      "minimo",
    ]);
  });
});

describe("distribuirLarguras", () => {
  it("distribui pesos proporcionalmente somando 100%", () => {
    const larguras = distribuirLarguras(COLUNAS);
    expect(larguras.get("ticker")).toBe("40.00%"); // 2/(2+1+1+1)
    expect(larguras.get("preco")).toBe("20.00%");
    expect(larguras.get("minimo")).toBe("20.00%");
    expect(larguras.get("volume")).toBe("20.00%");
  });

  it("ignora colunas com classeLargura fixa", () => {
    const comClasse: ColunaResponsiva[] = [
      { id: "rank", rotulo: "#", classeLargura: "w-10" },
      { id: "ticker", rotulo: "Ativo", peso: 3 },
    ];
    const larguras = distribuirLarguras(comClasse);
    expect(larguras.has("rank")).toBe(false);
    expect(larguras.get("ticker")).toBe("100.00%");
  });

  it("pesos iguais dividem o espaço igualmente", () => {
    const tres: ColunaResponsiva[] = [
      { id: "a", rotulo: "A" },
      { id: "b", rotulo: "B" },
      { id: "c", rotulo: "C" },
    ];
    const larguras = distribuirLarguras(tres);
    expect(larguras.get("a")).toBe("33.33%");
    expect(larguras.get("b")).toBe("33.33%");
    expect(larguras.get("c")).toBe("33.33%");
  });
});