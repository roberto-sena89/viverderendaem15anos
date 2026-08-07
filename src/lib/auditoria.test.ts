import { describe, expect, it } from "vitest";
import {
  ALOCACAO_POR_PERFIL,
  analisarCarteiraDe,
  planoDeRebalanceamento,
  type AtivoLinha,
} from "./auditoria";

const ativo = (over: Partial<AtivoLinha>): AtivoLinha => ({
  ticker: "",
  categoria: "Renda Fixa",
  quantidade: 1,
  preco_medio: 1,
  preco_atual: 1,
  dy: 0,
  ...over,
});

describe("analisarCarteiraDe", () => {
  it("reconhece carteira vazia como risco a corrigir", () => {
    const r = analisarCarteiraDe([]);
    expect(r.selo).toBe("Riscos a corrigir");
    expect(r.pontos_fracos.length).toBeGreaterThan(0);
    expect(r.score_diversificacao).toBeLessThan(50);
  });

  it("calcula patrimônio, investido e rentabilidade", () => {
    const r = analisarCarteiraDe([
      ativo({
        ticker: "PETR4",
        categoria: "Ações",
        quantidade: 10,
        preco_medio: 20,
        preco_atual: 30,
        dy: 8,
      }),
      ativo({
        ticker: "HGLG11",
        categoria: "Fundos Imobiliários",
        quantidade: 5,
        preco_medio: 100,
        preco_atual: 110,
        dy: 8,
      }),
    ]);
    expect(r.patrimonio_total).toBe(10 * 30 + 5 * 110);
    expect(r.total_investido).toBe(10 * 20 + 5 * 100);
    expect(r.rentabilidade_pct).toBeCloseTo(((850 - 700) / 700) * 100, 1);
    expect(r.numero_ativos).toBe(2);
  });

  it("sinaliza concentração quando um ativo domina a carteira", () => {
    const r = analisarCarteiraDe([
      ativo({
        ticker: "VALE3",
        categoria: "Ações",
        quantidade: 100,
        preco_medio: 60,
        preco_atual: 60,
        dy: 8,
      }),
      ativo({
        ticker: "PETR4",
        categoria: "Ações",
        quantidade: 1,
        preco_medio: 30,
        preco_atual: 30,
        dy: 8,
      }),
    ]);
    expect(r.concentracao.top1_pct).toBeGreaterThan(90);
    expect(r.pontos_fracos.some((p) => p.includes("Concentração"))).toBe(true);
  });

  it("elogia carteira diversificada com renda fixa, ações e FIIs", () => {
    const r = analisarCarteiraDe([
      ativo({
        ticker: "TESOURO",
        categoria: "Tesouro Direto",
        quantidade: 100,
        preco_medio: 1,
        preco_atual: 1,
        dy: 0,
      }),
      ativo({
        ticker: "IVVB11",
        categoria: "ETF (Global)",
        quantidade: 10,
        preco_medio: 400,
        preco_atual: 400,
        dy: 1,
      }),
      ativo({
        ticker: "BOVA11",
        categoria: "ETF Brasil",
        quantidade: 10,
        preco_medio: 100,
        preco_atual: 100,
        dy: 4,
      }),
      ativo({
        ticker: "HGLG11",
        categoria: "Fundos Imobiliários",
        quantidade: 10,
        preco_medio: 100,
        preco_atual: 100,
        dy: 8,
      }),
      ativo({
        ticker: "PETR4",
        categoria: "Ações",
        quantidade: 10,
        preco_medio: 30,
        preco_atual: 30,
        dy: 8,
      }),
    ]);
    expect(r.score_diversificacao).toBeGreaterThanOrEqual(60);
    expect(r.pontos_fortes.length).toBeGreaterThan(0);
  });
});

describe("planoDeRebalanceamento", () => {
  it("indica quanto aportar nas classes subalocadas", () => {
    const ativos = [
      ativo({
        ticker: "PETR4",
        categoria: "Ações",
        quantidade: 10,
        preco_medio: 30,
        preco_atual: 30,
        dy: 8,
      }),
      ativo({
        ticker: "HGLG11",
        categoria: "Fundos Imobiliários",
        quantidade: 10,
        preco_medio: 100,
        preco_atual: 100,
        dy: 8,
      }),
    ];
    const alvo = ALOCACAO_POR_PERFIL.moderado;
    const plano = planoDeRebalanceamento(ativos, alvo);
    expect(plano.patrimonio_atual).toBe(1300);
    expect(plano.por_classe.length).toBeGreaterThan(0);
    const rf = plano.por_classe.find((l) => l.classe.includes("Renda Fixa"));
    expect(rf).toBeDefined();
    expect(rf!.status).toBe("aportar");
    expect(plano.prioridades_de_aporte.length).toBeGreaterThan(0);
  });
});
