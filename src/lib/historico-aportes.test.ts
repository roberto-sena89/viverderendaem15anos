import { describe, expect, it } from "vitest";
import { reconciliarHistoricoAportes, type LinhaAporteBruta } from "./historico-aportes";

const aporte = (over: Partial<LinhaAporteBruta>): LinhaAporteBruta => ({
  data: "2026-01-15",
  ticker: "PETR4",
  quantidade: 10,
  preco: 30,
  ...over,
});

const ativo = (
  over: Partial<{
    ticker: string;
    categoria: string;
    quantidade: number;
    preco_medio: number;
    preco_atual: number;
  }>,
) => ({
  ticker: "PETR4",
  categoria: "Ações",
  quantidade: 10,
  preco_medio: 30,
  preco_atual: 33,
  dy: 0,
  ...over,
});

describe("reconciliarHistoricoAportes", () => {
  it("fica conciliado quando compras equivalem à posição atual", () => {
    const r = reconciliarHistoricoAportes([aporte({})], [ativo({})]);
    expect(r.total_aportado_compras).toBe(300);
    expect(r.total_vendido).toBe(0);
    expect(r.total_aportado_liquido).toBe(300);
    expect(r.total_investido_carteira).toBe(300);
    expect(r.patrimonio_atual_carteira).toBe(330);
    expect(r.diferenca_conciliacao).toBe(0);
    expect(r.nota_conciliacao).toContain("Conciliado");
  });

  it("separa compras e vendas e sinaliza a diferença com a carteira", () => {
    const r = reconciliarHistoricoAportes(
      [aporte({ quantidade: 100, preco: 20 }), aporte({ quantidade: -40, preco: 25 })],
      [ativo({ quantidade: 60, preco_medio: 20, preco_atual: 25 })],
    );
    expect(r.total_aportado_compras).toBe(2000);
    expect(r.total_vendido).toBe(1000);
    expect(r.total_aportado_liquido).toBe(1000);
    expect(r.total_investido_carteira).toBe(1200);
    expect(r.diferenca_conciliacao).toBe(-200);
    expect(r.nota_conciliacao).toContain("difere do total investido");
  });

  it("agrega por mês e por ativo, com a posição atual do ticker", () => {
    const r = reconciliarHistoricoAportes(
      [
        aporte({ data: "2026-01-10", quantidade: 10, preco: 20 }),
        aporte({ data: "2026-02-10", quantidade: 5, preco: 20 }),
      ],
      [ativo({ ticker: "petr4", quantidade: 15, preco_medio: 20, preco_atual: 22 })],
    );
    expect(r.numero_aportes).toBe(2);
    expect(r.meses_com_aporte).toBe(2);
    expect(r.media_mensal).toBe(150);
    expect(r.primeiro_aporte).toBe("2026-01-10");
    expect(r.ultimo_aporte).toBe("2026-02-10");
    expect(r.por_mes).toEqual([
      { mes: "2026-01", total_aportado: 200 },
      { mes: "2026-02", total_aportado: 100 },
    ]);
    expect(r.por_ativo).toEqual([
      {
        ticker: "PETR4",
        total_aportado: 300,
        quantidade_atual: 15,
        investido_atual: 300,
        valor_atual: 330,
        possivel_inconsistencia: false,
      },
    ]);
  });

  it("sinaliza ativo com preço atual implausível no por_ativo e nos alertas", () => {
    const r = reconciliarHistoricoAportes(
      [aporte({ ticker: "TESOURO PREFIXADO 2032", quantidade: 0.47931, preco: 1000 })],
      [
        ativo({
          ticker: "TESOURO PREFIXADO 2032",
          categoria: "Tesouro Direto",
          quantidade: 0.47931,
          preco_medio: 1000,
          preco_atual: 6188.62,
        }),
      ],
    );
    const linha = r.por_ativo.find((l) => l.ticker === "TESOURO PREFIXADO 2032");
    expect(linha?.possivel_inconsistencia).toBe(true);
    expect(r.alertas_consistencia.length).toBe(1);
    expect(r.alertas_consistencia[0]).toContain("TESOURO PREFIXADO 2032");
    expect(r.alertas_consistencia[0]).toContain("R$ 6188.62");
  });

  it("marca totais como parciais quando há filtro de período", () => {
    const r = reconciliarHistoricoAportes(
      [aporte({ data: "2026-01-10" }), aporte({ data: "2026-06-10" })],
      [ativo({})],
      "2026-06-01",
    );
    expect(r.numero_aportes).toBe(1);
    expect(r.nota_conciliacao).toContain("Período parcial");
  });

  it("devolve carteira vazia sem quebrar", () => {
    const r = reconciliarHistoricoAportes([], []);
    expect(r.total_aportado_liquido).toBe(0);
    expect(r.total_investido_carteira).toBe(0);
    expect(r.patrimonio_atual_carteira).toBe(0);
    expect(r.por_ativo).toEqual([]);
    expect(r.alertas_consistencia).toEqual([]);
    expect(r.primeiro_aporte).toBeNull();
    expect(r.media_mensal).toBe(0);
  });
});
