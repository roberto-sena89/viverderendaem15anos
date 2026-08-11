import { describe, expect, it } from "vitest";
import {
  DY_ALVO_GESTOR,
  IMPACTO_VOLUME_PCT,
  LIMITE_PATRIMONIO_POR_RATING,
  LIMITE_RATING_A,
  LIMITE_RATING_B,
  LIMITE_RATING_C,
  PESO_MINIMO_NOTA,
  avaliarParaGestor,
  corNotaGestor,
  estimarPayout,
  limiteAporte,
  pontosDividendos,
  rotuloGestor,
  vereditoGestor,
} from "@/lib/score-gestor";

const base = {
  ticker: "TEST4",
  fundamentos: 80,
  oportunidade: 75,
  sinal: "comprar" as const,
  dy12: 8,
  pl: 10,
  payout: 80,
  liquidez: 50_000_000,
  dividaPatrimonio: 0.5,
  margemLiquida: 15,
  regime: null,
};

describe("estimarPayout", () => {
  it("estima payout a partir de DY e P/L (DY% × P/L)", () => {
    expect(estimarPayout(8, 10)).toBe(80);
    expect(estimarPayout(5, 15)).toBe(75);
  });

  it("retorna null sem dados válidos", () => {
    expect(estimarPayout(null, 10)).toBeNull();
    expect(estimarPayout(8, null)).toBeNull();
    expect(estimarPayout(0, 10)).toBeNull();
    expect(estimarPayout(-3, 10)).toBeNull();
  });
});

describe("pontosDividendos", () => {
  it("premia DY alto com payout sustentável", () => {
    expect(pontosDividendos(DY_ALVO_GESTOR, 60)).toBe(100);
  });

  it("rebaixa payout acima do sustentável, zerando em 200%", () => {
    const abaixo = pontosDividendos(8, 95);
    const acima = pontosDividendos(8, 100);
    expect(abaixo).toBeLessThan(100);
    expect(acima).toBeLessThan(abaixo);
    expect(pontosDividendos(8, 200)).toBe(60);
  });

  it("sem DY não há renda para pontuar", () => {
    expect(pontosDividendos(null, 60)).toBe(40);
  });
});

describe("vereditoGestor", () => {
  it("sinal de venda sobrepõe qualquer nota", () => {
    expect(vereditoGestor(95, "vender")).toBe("evitar");
  });

  it("nota A libera compra; nota B depende do radar; C/D evitam", () => {
    expect(vereditoGestor(LIMITE_RATING_A, "manter")).toBe("comprar");
    expect(vereditoGestor(LIMITE_RATING_B + 2, "comprar")).toBe("comprar");
    expect(vereditoGestor(LIMITE_RATING_B + 2, "manter")).toBe("observar");
    expect(vereditoGestor(LIMITE_RATING_C, "manter")).toBe("evitar");
    expect(vereditoGestor(null, "manter")).toBe("observar");
  });
});

describe("limiteAporte", () => {
  it("aplica o percentual do rating e limita pelo volume diário", () => {
    const limite = limiteAporte(10_000_000, "A", 50_000_000);
    expect(limite).not.toBeNull();
    expect(limite!.maxPatrimonioPct).toBe(8);
    expect(limite!.maxValor).toBe(Math.min(800_000, 5_000_000));
    expect(limite!.impactoVolumePct).toBe(IMPACTO_VOLUME_PCT);
  });

  it("rating D bloqueia aporte mesmo com patrimônio grande", () => {
    const limite = limiteAporte(10_000_000, "D", 50_000_000);
    expect(limite!.maxPatrimonioPct).toBe(0);
    expect(limite!.maxValor).toBeNull();
  });

  it("liquidez baixa reduz o teto absoluto do aporte", () => {
    const limite = limiteAporte(100_000_000, "A", 1_000_000);
    expect(limite!.maxValor).toBe(100_000);
  });
});

describe("avaliarParaGestor", () => {
  it("gera nota alta e rating A para empresa sólida", () => {
    const r = avaliarParaGestor(base);
    expect(r.rating).toBe("A");
    expect(r.nota).toBeGreaterThanOrEqual(LIMITE_RATING_A);
    expect(r.veredito).toBe("comprar");
    expect(r.alertas).toHaveLength(0);
  });

  it("exibe os 5 componentes com pesos e notas", () => {
    const r = avaliarParaGestor(base);
    expect(r.componentes).toHaveLength(5);
    const fundamentos = r.componentes.find((c) => c.chave === "fundamentos");
    expect(fundamentos!.nota).toBe(80);
    expect(fundamentos!.peso).toBe(0.4);
  });

  it("sinal de vender vira evitar mesmo com nota de compra", () => {
    const r = avaliarParaGestor({ ...base, sinal: "vender" });
    expect(r.veredito).toBe("evitar");
    expect(r.alertas.length).toBeGreaterThanOrEqual(1);
  });

  it("alerta payout acima de 100% (financiado por dívida)", () => {
    const r = avaliarParaGestor({ ...base, payout: 120 });
    expect(r.alertas.some((a) => a.includes("100%"))).toBe(true);
  });

  it("estima payout quando não informado", () => {
    const r = avaliarParaGestor({ ...base, payout: null });
    const dividendos = r.componentes.find((c) => c.chave === "dividendos");
    expect(dividendos!.detalhe).toContain("80%");
  });

  it("alerta endividamento alto e margem negativa", () => {
    const r = avaliarParaGestor({ ...base, dividaPatrimonio: 3, margemLiquida: -5 });
    expect(r.alertas.some((a) => a.includes("Endividamento"))).toBe(true);
    expect(r.alertas.some((a) => a.includes("prejuízo"))).toBe(true);
  });

  it("retorna null quando a cobertura de pesos é insuficiente", () => {
    const r = avaliarParaGestor({
      ...base,
      fundamentos: null,
      oportunidade: null,
      dy12: null,
      pl: null,
      payout: null,
      liquidez: null,
      dividaPatrimonio: null,
      margemLiquida: null,
    });
    expect(r.nota).toBeNull();
    expect(r.rating).toBeNull();
    expect(r.veredito).toBe("observar");
    expect(PESO_MINIMO_NOTA).toBe(0.5);
  });

  it("estimativa de payout sustenta a avaliação mesmo sem campo próprio", () => {
    const completo = avaliarParaGestor({ ...base, payout: null });
    const semNada = avaliarParaGestor({ ...base, payout: null, dy12: null, pl: null });
    expect(completo.nota).not.toBeNull();
    const dySemDado = semNada.componentes.find((c) => c.chave === "dividendos")!;
    expect(dySemDado.nota).toBe(20);
  });
});

describe("rótulos e cores", () => {
  it("mapeia nota para rótulo qualitativo e cor", () => {
    expect(rotuloGestor(80)).toBe("excelente");
    expect(rotuloGestor(55)).toBe("boa");
    expect(rotuloGestor(null)).toBeNull();
    expect(corNotaGestor(80)).toContain("emerald");
  });

  it("mantém os limites de rating em constante", () => {
    expect(LIMITE_RATING_A).toBe(75);
    expect(LIMITE_RATING_B).toBe(60);
    expect(LIMITE_RATING_C).toBe(45);
    expect(LIMITE_PATRIMONIO_POR_RATING.A).toBe(8);
  });
});
