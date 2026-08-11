import { describe, expect, it } from "vitest";
import {
  AJUSTE_SETOR,
  CONSISTENCIA_ANOS_MINIMA,
  DY_ALVO_GESTOR,
  IMPACTO_VOLUME_PCT,
  LIMITE_PATRIMONIO_POR_RATING,
  LIMITE_RATING_A,
  LIMITE_RATING_B,
  LIMITE_RATING_C,
  PESO_MINIMO_NOTA,
  VOLATILIDADE_ALERTA,
  VOLATILIDADE_MAX,
  ajusteSetorial,
  avaliarParaGestor,
  corNotaGestor,
  estimarPayout,
  limiteAporte,
  pontosConsistencia,
  pontosDividendos,
  pontosPremio,
  percentilValorizacaoEfetivo,
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
  selic: 7,
  setor: null,
  consistenciaDividendos: null,
  percentilDistribucional: null,
  volatilidadeAnualPct: null,
  percentilPlReal: null,
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

  it("consistência conhecida compensa payout no limite", () => {
    const semHistorico = pontosDividendos(8, 120, null);
    const comHistorico = pontosDividendos(8, 120, 10);
    expect(comHistorico).toBe(93);
    expect(comHistorico).toBeGreaterThan(semHistorico);
  });
});

describe("pontosPremio", () => {
  it("DY muito acima da Selic vale nota cheia", () => {
    expect(pontosPremio(12, 8)).toBe(100);
  });

  it("empate com a Selic vale metade da nota", () => {
    expect(pontosPremio(8, 8)).toBe(50);
  });

  it("DY abaixo da Selic zera o prêmio", () => {
    expect(pontosPremio(4, 8)).toBe(0);
  });

  it("sem Selic ou DY o prêmio não pontua", () => {
    expect(pontosPremio(null, 8)).toBeNull();
    expect(pontosPremio(8, null)).toBeNull();
  });
});

describe("pontosConsistencia e ajuste setorial", () => {
  it("10+ anos de dividendos valem consistência plena", () => {
    expect(pontosConsistencia(10)).toBe(100);
    expect(pontosConsistencia(5)).toBe(50);
    expect(pontosConsistencia(null)).toBeNull();
  });

  it("setores defensivos compensam; cíclicos descontam", () => {
    expect(ajusteSetorial("Utilidade Pública")).toBeGreaterThan(0);
    expect(ajusteSetorial("Consumo Cíclico")).toBeLessThan(0);
    expect(ajusteSetorial(null)).toBe(0);
    expect(ajusteSetorial("Setor Desconhecido")).toBe(0);
    expect(AJUSTE_SETOR["Materiais Básicos"]).toBe(-3);
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

describe("percentilValorizacaoEfetivo", () => {
  it("prefere o P/L real (CVM) ao distribucional de preço", () => {
    expect(percentilValorizacaoEfetivo({ percentilDistribucional: 95, percentilPlReal: 30 })).toBe(
      30,
    );
    expect(
      percentilValorizacaoEfetivo({ percentilDistribucional: null, percentilPlReal: 55 }),
    ).toBe(55);
  });

  it("cai para o distribucional sem P/L real válido", () => {
    expect(
      percentilValorizacaoEfetivo({ percentilDistribucional: 40, percentilPlReal: null }),
    ).toBe(40);
    expect(percentilValorizacaoEfetivo({ percentilDistribucional: 40, percentilPlReal: 120 })).toBe(
      40,
    );
    expect(
      percentilValorizacaoEfetivo({ percentilDistribucional: null, percentilPlReal: null }),
    ).toBeNull();
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

  it("exibe os 6 componentes com pesos e notas", () => {
    const r = avaliarParaGestor(base);
    expect(r.componentes).toHaveLength(6);
    const fundamentos = r.componentes.find((c) => c.chave === "fundamentos");
    expect(fundamentos!.nota).toBe(80);
    expect(fundamentos!.peso).toBe(0.35);
    const premio = r.componentes.find((c) => c.chave === "premioSelic");
    expect(premio).toBeDefined();
    expect(premio!.peso).toBe(0.1);
  });

  it("prêmio abaixo da Selic gera bandeira e rebaixa o componente", () => {
    const r = avaliarParaGestor({ ...base, selic: 12 });
    expect(r.alertas.some((a) => a.includes("Prêmio negativo"))).toBe(true);
    const premio = r.componentes.find((c) => c.chave === "premioSelic")!;
    expect(premio.nota).toBe(0);
  });

  it("setor defensivo compensa a nota de fundamentos", () => {
    const r = avaliarParaGestor({ ...base, setor: "Utilidade Pública" });
    const fundamentos = r.componentes.find((c) => c.chave === "fundamentos")!;
    expect(fundamentos.nota).toBe(84);
    expect(fundamentos.detalhe).toContain("defensivo");
    expect(r.setor).toBe("Utilidade Pública");
  });

  it("histórico curto de dividendos vira bandeira", () => {
    const anos = CONSISTENCIA_ANOS_MINIMA - 1;
    const r = avaliarParaGestor({ ...base, consistenciaDividendos: anos });
    expect(r.alertas.some((a) => a.includes("Histórico curto"))).toBe(true);
  });

  it("sem Selic o prêmio fica de fora e a nota é reescalada", () => {
    const comSelic = avaliarParaGestor(base);
    const semSelic = avaliarParaGestor({ ...base, selic: null });
    expect(comSelic.nota).not.toBeNull();
    expect(semSelic.nota).not.toBeNull();
    const premio = semSelic.componentes.find((c) => c.chave === "premioSelic")!;
    expect(premio.nota).toBeNull();
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

  it("percentil distribucional caro rebaixa a oportunidade e vira bandeira", () => {
    const r = avaliarParaGestor({ ...base, percentilDistribucional: 95 });
    const oportunidade = r.componentes.find((c) => c.chave === "oportunidade")!;
    // 75 × 0.85 + (100 − 95) × 0.15 = 64,5 → 65.
    expect(oportunidade.nota).toBeLessThan(base.oportunidade);
    expect(oportunidade.nota).toBe(65);
    expect(oportunidade.detalhe).toContain("95%");
    expect(r.alertas.some((a) => a.includes("momento caro"))).toBe(true);
  });

  it("percentil distribucional ausente preserva a oportunidade original", () => {
    const r = avaliarParaGestor(base);
    const oportunidade = r.componentes.find((c) => c.chave === "oportunidade")!;
    expect(oportunidade.nota).toBe(75);
  });

  it("P/L real substitui o distribucional quando disponível", () => {
    const r = avaliarParaGestor({ ...base, percentilPlReal: 30 });
    const oportunidade = r.componentes.find((c) => c.chave === "oportunidade")!;
    // 75 × 0.85 + (100 − 30) × 0.15 = 74,3 → 74: P/L barato segura a nota
    // mesmo que o distribucional de preço esteja caro.
    const caro = avaliarParaGestor({ ...base, percentilDistribucional: 95, percentilPlReal: 30 });
    expect(caro.componentes.find((c) => c.chave === "oportunidade")!.nota).toBe(74);
    expect(caro.alertas.some((a) => a.includes("caro"))).toBe(false);
    expect(oportunidade.detalhe).toContain("P/L real");
  });

  it("P/L real caro vira bandeira de valuation (CVM)", () => {
    const r = avaliarParaGestor({ ...base, percentilPlReal: 95 });
    expect(r.alertas.some((a) => a.includes("P/L real") && a.includes("valuation"))).toBe(true);
    expect(r.alertas.some((a) => a.includes("leituras históricas"))).toBe(false);
    const oportunidade = r.componentes.find((c) => c.chave === "oportunidade")!;
    expect(oportunidade.nota).toBe(65);
  });

  it("P/L real inválido cai para o percentil distribucional", () => {
    const r = avaliarParaGestor({
      ...base,
      percentilDistribucional: 40,
      percentilPlReal: 150,
    });
    const oportunidade = r.componentes.find((c) => c.chave === "oportunidade")!;
    // 75 × 0.85 + (100 − 40) × 0.15 = 72,8 → 73.
    expect(oportunidade.nota).toBe(73);
  });

  it("volatilidade alta vira bandeira sem bloquear o veredito", () => {
    const r = avaliarParaGestor({ ...base, volatilidadeAnualPct: VOLATILIDADE_ALERTA });
    expect(r.alertas.some((a) => a.includes("Volatilidade anual"))).toBe(true);
    expect(r.alertas.some((a) => a.includes("fora da mesa"))).toBe(false);
    expect(r.veredito).toBe("comprar");
  });

  it("volatilidade extrema bloqueia o aporte mesmo com nota alta", () => {
    const r = avaliarParaGestor({ ...base, volatilidadeAnualPct: VOLATILIDADE_MAX + 10 });
    expect(r.alertas.some((a) => a.includes("fora da mesa"))).toBe(true);
    expect(r.veredito).toBe("evitar");
    expect(vereditoGestor(90, "comprar", VOLATILIDADE_MAX + 1)).toBe("evitar");
    expect(vereditoGestor(90, "vender", null)).toBe("evitar");
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
