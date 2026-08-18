import { describe, expect, it } from "vitest";
import {
  diversificacao,
  exposicaoPorMoeda,
  metricasDeSerieMensal,
  montarBenchmarkGlobal,
  retornoPonderado12m,
} from "./analise-carteira";
import type { Ativo, Categoria } from "./portfolio";

const ativo = (
  ticker: string,
  categoria: Categoria,
  quantidade: number,
  precoAtual: number,
): Ativo => ({
  id: ticker,
  ticker,
  nome: ticker,
  categoria,
  quantidade,
  precoMedio: precoAtual,
  precoAtual,
  dy: 0,
});

describe("análise de carteira", () => {
  it("exposicaoPorMoeda separa BRL/USD/cripto", () => {
    const exposicao = exposicaoPorMoeda([
      ativo("PETR4", "Ações", 2, 50),
      ativo("IVV", "Stocks", 1, 100),
    ]);
    expect(exposicao).toHaveLength(2);
    expect(exposicao.find((e) => e.moeda === "BRL")?.pct).toBeCloseTo(0.5);
    expect(exposicao.find((e) => e.moeda === "USD")?.pct).toBeCloseTo(0.5);
  });

  it("retornoPonderado12m pondera pelo valor atual e mostra cobertura", () => {
    const retornos = new Map<string, number>([
      ["PETR4", 20],
      ["VALE3", 10],
    ]);
    const { retornoPct, coberturaPct } = retornoPonderado12m(
      [ativo("PETR4", "Ações", 1, 100), ativo("VALE3", "Ações", 1, 100)],
      retornos,
    );
    expect(retornoPct).toBe(15);
    expect(coberturaPct).toBe(1);
  });

  it("retornoPonderado12m ignora ativos sem retorno", () => {
    const retornos = new Map<string, number>();
    const { retornoPct, coberturaPct } = retornoPonderado12m(
      [ativo("PETR4", "Ações", 1, 100), ativo("VALE3", "Ações", 1, 100)],
      retornos,
    );
    expect(retornoPct).toBeNull();
    expect(coberturaPct).toBe(0);
  });

  it("montarBenchmarkGlobal calcula excedentes e notas", () => {
    const bm = montarBenchmarkGlobal(25, 10, 30);
    expect(bm.excedenteIbovPct).toBe(15);
    expect(bm.excedenteGlobalPct).toBe(-5);
    expect(bm.notaIbov).toBe(8.75);
    expect(bm.notaGlobal).toBe(3.75);
  });

  it("metricasDeSerieMensal computa drawdown, vol e retorno", () => {
    const m = metricasDeSerieMensal([100, 110, 90, 95, 105], 11);
    expect(m.meses).toBe(4);
    // pico 110 → vale 90 = -18,18%
    expect(m.drawdownMaximoPct).toBeCloseTo(18.18, 0);
    expect(m.piorMesPct).toBeCloseTo(-18.18, 0);
    // 105/95 - 1 = 10,53%
    expect(m.melhorMesPct).toBeCloseTo(10.53, 1);
    expect(m.retornoAnualizadoPct).toBeGreaterThan(0);
  });

  it("diversificacao: dois ativos iguais → numEficaz 2", () => {
    const d = diversificacao([ativo("A", "Ações", 1, 100), ativo("B", "Ações", 1, 100)]);
    expect(d.numEficaz).toBeCloseTo(2, 5);
    expect(d.indice).toBe(20);
  });
});
