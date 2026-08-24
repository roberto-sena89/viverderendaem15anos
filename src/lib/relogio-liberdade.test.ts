import { describe, expect, it } from "vitest";
import {
  calcularRelogioLiberdade,
  estagioDoProgresso,
  anosAteLiberdade,
} from "./relogio-liberdade";
import type { Ativo, Dividendo, PlanoConfig } from "./portfolio";

const ativo = (ticker: string, quantidade: number, precoAtual: number, dy: number): Ativo => ({
  id: ticker,
  ticker,
  nome: ticker,
  categoria: "Ações",
  quantidade,
  precoMedio: precoAtual,
  precoAtual,
  dy,
});

const dividendo = (data: string, valor: number): Dividendo => ({
  id: `${data}-${valor}`,
  data,
  ticker: "PETR4",
  tipo: "DIVIDENDO",
  valor,
});

const planoBase: PlanoConfig = {
  idadeAtual: 32,
  idadeAposentadoria: 47,
  aporteMensal: 3000,
  aumentoAnual: 8,
  rentabilidadeAnual: 11,
  inflacaoAnual: 4.5,
  taxaRetirada: 4,
};

describe("Relógio da Liberdade", () => {
  it("estagioDoProgresso mapeia faixas de progresso", () => {
    expect(estagioDoProgresso(10).cor).toBe("vermelho");
    expect(estagioDoProgresso(40).cor).toBe("laranja");
    expect(estagioDoProgresso(75).cor).toBe("verde");
    expect(estagioDoProgresso(100).cor).toBe("dourado");
  });

  it("calcula dias de liberdade e progresso a partir da renda passiva", () => {
    // 100 ações de PETR4 a R$ 40 com DY 6% → dividendos 12m = R$ 240/ano → R$ 20/mês
    const relogio = calcularRelogioLiberdade(
      [ativo("PETR4", 100, 40, 6)],
      [],
      2400, // meta de R$ 2.400/mês
    );

    expect(relogio.rendaPassivaMensal).toBeCloseTo(20, 2);
    // 20 / 2400 * 30 = 0,25 dias
    expect(relogio.diasDeLiberdade).toBeCloseTo(0.25, 4);
    // 20 / 2400 * 100 ≈ 0,83%
    expect(relogio.progresso).toBeCloseTo(0.8333, 2);
    expect(relogio.estagio.cor).toBe("vermelho");
  });

  it("libera ao atingir a meta (progresso 100+)", () => {
    // Renda passiva >= meta → progresso >= 100 → estágio dourado
    const relogio = calcularRelogioLiberdade(
      [ativo("PETR4", 10_000, 40, 6)], // dividendos 12m = R$ 24.000 → R$ 2.000/mês
      [],
      2000,
    );

    expect(relogio.progresso).toBeGreaterThanOrEqual(100);
    expect(relogio.estagio.cor).toBe("dourado");
    expect(relogio.diasDeLiberdade).toBeGreaterThanOrEqual(30);
  });

  it("agrega proventos dos últimos 12 meses em dias de liberdade", () => {
    const agora = new Date();
    const mesAtual = new Date(agora.getFullYear(), agora.getMonth(), 15);
    const m1 = new Date(mesAtual);
    m1.setMonth(m1.getMonth() - 1);

    const relogio = calcularRelogioLiberdade(
      [ativo("PETR4", 100, 40, 0)],
      [dividendo(m1.toISOString().slice(0, 10), 600)],
      6000, // meta de R$ 6.000/mês
    );

    // 600 / 6000 * 30 = 3 dias
    expect(relogio.historico.length).toBeGreaterThanOrEqual(1);
    expect(relogio.melhorMes?.dias).toBeCloseTo(3, 4);
    expect(relogio.totalDiasAno).toBeCloseTo(3, 4);
  });

  it("anosAteLiberdade projeta com e sem aportes", () => {
    // Patrimônio de R$ 100 mil com DY 6% → renda inicial R$ 500/mês; meta R$ 2.000/mês.
    const comAportes = anosAteLiberdade([ativo("PETR4", 1000, 100, 6)], planoBase, 2000);
    const semAportes = anosAteLiberdade(
      [ativo("PETR4", 1000, 100, 6)],
      { ...planoBase, aporteMensal: 0 },
      2000,
    );

    // Com aportes chega antes (ou igual) que sem aportes.
    expect(semAportes).not.toBeNull();
    if (comAportes != null && semAportes != null) {
      expect(comAportes).toBeLessThanOrEqual(semAportes + 1e-9);
    }
  });

  it("anosAteLiberdade retorna 0 quando a renda já cobre a meta", () => {
    const anos = anosAteLiberdade(
      [ativo("PETR4", 10_000, 40, 6)], // R$ 2.000/mês de renda
      planoBase,
      2000,
    );
    expect(anos).toBe(0);
  });
});
