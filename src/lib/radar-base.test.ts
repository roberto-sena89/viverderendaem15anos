import { describe, expect, it } from "vitest";
import {
  BT_LUCRO_ALVO_PCT,
  LIMITE_ALTA,
  LIMITE_BAIXA,
  LIMITE_MEDIA,
  backtestSinal,
  posicaoPercentil,
  rotuloScore,
  scoreOportunidade,
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

  it("não cai em sem-dados na faixa cara (70–90%) do histórico", () => {
    const sinal = sinalRadar({
      variacaoDia: 1,
      dy12: 6,
      pvp: 2,
      percentil: 75,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("manter");
    expect(sinal.motivo).toContain("caro");
    expect(sinal.zona).toBe("alta");
  });

  it("mantém exatamente no limite de 90% da faixa", () => {
    const sinal = sinalRadar({
      variacaoDia: 1,
      dy12: 4,
      pvp: 1,
      percentil: 90,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("manter");
  });

  it("observa nas mínimas com DY atrativo mas P/VPA de armadilha", () => {
    const sinal = sinalRadar({
      variacaoDia: 1,
      dy12: 8,
      pvp: 3.2,
      percentil: 12,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("observar");
    expect(sinal.motivo).toContain("armadilha de valor");
  });

  it("observa na faixa barata quando o P/VPA é muito alto", () => {
    const sinal = sinalRadar({
      variacaoDia: 0,
      dy12: 6,
      pvp: 4.1,
      percentil: 38,
      noticiaImpacto: false,
    });
    expect(sinal.tipo).toBe("observar");
    expect(sinal.zona).toBe("baixa");
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

describe("scoreOportunidade", () => {
  it("premia posição nas mínimas com DY alto", () => {
    const score = scoreOportunidade({
      percentil: 10,
      dy12: 10,
      drawdownMaximoPct: -20,
      noticiaImpacto: false,
    });
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThanOrEqual(70);
    expect(rotuloScore(score!)).toBe("excelente");
  });

  it("penaliza o topo do histórico mesmo com DY alto", () => {
    const score = scoreOportunidade({
      percentil: 95,
      dy12: 9,
      drawdownMaximoPct: -10,
      noticiaImpacto: false,
    });
    expect(score!).toBeLessThan(50);
    expect(rotuloScore(score!)).toBe("media");
  });

  it("sem histórico devolve null", () => {
    expect(
      scoreOportunidade({
        percentil: null,
        dy12: 8,
        drawdownMaximoPct: null,
        noticiaImpacto: false,
      }),
    ).toBeNull();
  });

  it("desconta notícia de alto impacto", () => {
    const base = { percentil: 20, dy12: 8, drawdownMaximoPct: -25 };
    const semNoticia = scoreOportunidade({ ...base, noticiaImpacto: false })!;
    const comNoticia = scoreOportunidade({ ...base, noticiaImpacto: true })!;
    expect(comNoticia).toBeLessThan(semNoticia);
  });

  it("penaliza drawdown máximo profundo", () => {
    const leve = scoreOportunidade({
      percentil: 30,
      dy12: 6,
      drawdownMaximoPct: -15,
      noticiaImpacto: false,
    })!;
    const profundo = scoreOportunidade({
      percentil: 30,
      dy12: 6,
      drawdownMaximoPct: -75,
      noticiaImpacto: false,
    })!;
    expect(profundo).toBeLessThan(leve);
  });

  it("mantém o score dentro da faixa 0–100", () => {
    const score = scoreOportunidade({
      percentil: 0,
      dy12: 30,
      drawdownMaximoPct: 0,
      noticiaImpacto: true,
    })!;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("backtestSinal", () => {
  it("retorna null com série curta demais", () => {
    const curta = Array.from({ length: 30 }, (_, i) => ({ f: 10 + i }));
    expect(backtestSinal(curta)).toBeNull();
  });

  it("não compra em tendência de alta constante após a mínima inicial", () => {
    // 200 semanas subindo 2% por semana: o preço nunca volta à vizinhança da mínima 52s.
    const serie = Array.from({ length: 200 }, (_, i) => ({ f: 100 * 1.02 ** i }));
    const resultado = backtestSinal(serie)!;
    expect(resultado).not.toBeNull();
    expect(resultado.negocios).toBe(0);
  });

  it("compra na queda e vende ao bater o lucro-alvo", () => {
    // 180 semanas em queda suave (compra perto do fundo), depois retomada até +20%.
    const serie: Array<{ f: number }> = [];
    for (let i = 0; i < 180; i++) serie.push({ f: 100 - i * 0.45 });
    const fundo = serie[serie.length - 1].f;
    for (let i = 0; i < 12; i++) serie.push({ f: fundo * (1 + 0.02 * (i + 1)) });
    const resultado = backtestSinal(serie)!;
    expect(resultado.negocios).toBeGreaterThanOrEqual(1);
    expect(resultado.vencedores).toBeGreaterThanOrEqual(1);
    expect(resultado.taxaAcertoPct).toBeGreaterThan(0);
  });

  it("aciona a proteção quando o preço despenca após a compra", () => {
    const serie: Array<{ f: number }> = [];
    let preco = 100;
    for (let i = 0; i < 60; i++) {
      serie.push({ f: preco });
      preco -= 1.5; // queda constante de 1,5% ao dia
    }
    for (let i = 0; i < 40; i++) {
      serie.push({ f: preco });
      preco *= 0.95; // queda adicional alta
    }
    const resultado = backtestSinal(serie)!;
    // Sempre há um negócio (líquida no fim) e o stop foi tocado: retorno < lucro-alvo.
    expect(resultado.negocios).toBeGreaterThanOrEqual(1);
    expect(resultado.retornoMedioPct).toBeLessThan(BT_LUCRO_ALVO_PCT);
  });

  it("calcula o buy-and-hold como o salto da ponta a ponta", () => {
    const serie = Array.from({ length: 150 }, (_, i) => ({ f: 50 + i }));
    const resultado = backtestSinal(serie)!;
    const esperado = ((149 - 0) / 50) * 100;
    expect(resultado.buyHoldPct).toBeCloseTo(esperado, 6);
    expect(resultado.buyHoldAnualPct).toBeGreaterThan(0);
  });
});
