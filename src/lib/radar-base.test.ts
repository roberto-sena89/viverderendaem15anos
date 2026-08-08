import { describe, expect, it } from "vitest";
import {
  LIMITE_ALTA,
  LIMITE_BAIXA,
  LIMITE_MEDIA,
  posicaoPercentil,
  sinalRadar,
  zonaDePercentil,
} from "@/lib/radar-base";

describe("posicaoPercentil", () => {
  it("calcula a posição do preço dentro do range histórico", () => {
    expect(posicaoPercentil(10, 0, 100)).toBe(10);
    expect(posicaoPercentil(50, 0, 100)).toBe(50);
    expect(posicaoPercentil(100, 0, 100)).toBe(100);
  });

  it("clampa valores acima da faixa e rejeita preço inválido", () => {
    expect(posicaoPercentil(150, 0, 100)).toBe(100);
    expect(posicaoPercentil(-5, 0, 100)).toBeNull();
  });

  it("retorna null quando falta dados ou o range é degenerado", () => {
    expect(posicaoPercentil(null, 0, 100)).toBeNull();
    expect(posicaoPercentil(10, null, 100)).toBeNull();
    expect(posicaoPercentil(10, 0, null)).toBeNull();
    expect(posicaoPercentil(10, 50, 50)).toBeNull();
    expect(posicaoPercentil(0, 0, 100)).toBeNull();
  });
});

describe("zonaDePercentil", () => {
  it("classifica as faixas históricas nos limites exatos", () => {
    expect(zonaDePercentil(0)).toBe("minima");
    expect(zonaDePercentil(25)).toBe("minima");
    expect(zonaDePercentil(26)).toBe("baixa");
    expect(zonaDePercentil(40)).toBe("baixa");
    expect(zonaDePercentil(41)).toBe("media");
    expect(zonaDePercentil(70)).toBe("media");
    expect(zonaDePercentil(71)).toBe("alta");
    expect(zonaDePercentil(90)).toBe("alta");
    expect(zonaDePercentil(91)).toBe("maxima");
    expect(zonaDePercentil(100)).toBe("maxima");
    expect(zonaDePercentil(null)).toBe("sem-dados");
  });

  it("mantém os limites consolidados em constantes", () => {
    expect(LIMITE_BAIXA).toBe(40);
    expect(LIMITE_MEDIA).toBe(70);
    expect(LIMITE_ALTA).toBe(90);
  });
});

describe("sinalRadar", () => {
  it("sugere compra nas mínimas históricas com DY atrativo", () => {
    const sinal = sinalRadar({
      variacaoDia: 1,
      dy12: 8,
      pvp: 0.8,
      percentil: 12,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("comprar");
    expect(sinal.motivo).toContain("mínimas históricas");
    expect(sinal.urgente).toBe(false);
  });

  it("sugere compra também na faixa de até 40% do histórico", () => {
    const sinal = sinalRadar({
      variacaoDia: 0,
      dy12: 6,
      pvp: 1,
      percentil: 38,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("comprar");
  });

  it("troca a compra por observação quando o DY não compensa", () => {
    const sinal = sinalRadar({
      variacaoDia: 1,
      dy12: 2,
      pvp: 1,
      percentil: 10,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("observar");
    expect(sinal.motivo).toContain("sem DY atrativo");
  });

  it("indica venda em choque diário acima de 12%", () => {
    const sinal = sinalRadar({
      variacaoDia: -15,
      dy12: null,
      pvp: null,
      percentil: 30,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("vender");
    expect(sinal.urgente).toBe(true);
  });

  it("não vende em queda de 6% sem notícia associada", () => {
    const sinal = sinalRadar({
      variacaoDia: -6,
      dy12: 7,
      pvp: 0.9,
      percentil: 35,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).not.toBe("vender");
  });

  it("indica venda em queda relevante com notícia de alto impacto", () => {
    const sinal = sinalRadar({
      variacaoDia: -7,
      dy12: 5,
      pvp: 1,
      percentil: 55,
      noticiaImpacto: true,
    });
    expect(sinal.tipo).toBe("vender");
    expect(sinal.urgente).toBe(true);
  });

  it("chama atenção na zona intermediária do histórico", () => {
    const sinal = sinalRadar({
      variacaoDia: 1,
      dy12: 5,
      pvp: 1,
      percentil: 55,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("observar");
  });

  it("mantém em zona máxima do histórico", () => {
    const sinal = sinalRadar({
      variacaoDia: 1,
      dy12: 3,
      pvp: 5,
      percentil: 93,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("manter");
  });

  it("evita comprar no topo mesmo com DY elevado", () => {
    const sinal = sinalRadar({
      variacaoDia: 0,
      dy12: 9,
      pvp: 3,
      percentil: 97,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("manter");
  });

  it("sem histórico suficiente devolve sem-dados", () => {
    const sinal = sinalRadar({
      variacaoDia: 1,
      dy12: null,
      pvp: null,
      percentil: null,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("sem-dados");
  });
});
