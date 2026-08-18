import { describe, expect, it } from "vitest";
import { educacaoPush, type EntradaEducacaoPush } from "@/lib/educacao-push";

function entrada(parcial: Partial<EntradaEducacaoPush> = {}): EntradaEducacaoPush {
  return {
    ativos: [],
    aportes: [],
    metas: [],
    planoConfig: {
      idadeAtual: 32,
      idadeAposentadoria: 47,
      aporteMensal: 3000,
      aumentoAnual: 8,
      rentabilidadeAnual: 11,
      inflacaoAnual: 4.5,
      taxaRetirada: 4,
      patrimonioAtual: 0,
    },
    perfil: "moderado",
    planoSalvo: true,
    ...parcial,
  };
}

const ids = (g: ReturnType<typeof educacaoPush>) => g.gaps.map((x) => x.id);

describe("educacaoPush", () => {
  it("carteira vazia detecta o gap de começo", () => {
    const r = educacaoPush(entrada());
    expect(r.sem_gaps).toBe(false);
    expect(ids(r)).toContain("carteira_vazia");
  });

  it("sem reserva de emergência sugere conteúdo e ações", () => {
    const r = educacaoPush(
      entrada({
        ativos: [
          {
            ticker: "PETR4",
            categoria: "Ações",
            quantidade: 100,
            preco_medio: 30,
            preco_atual: 40,
            dy: 6,
          },
        ],
      }),
    );
    expect(ids(r)).toContain("reserva_emergencia");
    const gap = r.gaps.find((g) => g.id === "reserva_emergencia");
    expect(gap?.acoes.length).toBeGreaterThan(0);
    expect(gap?.conceito.length).toBeGreaterThan(0);
  });

  it("com renda fixa no alvo não aponta reserva nem renda fixa", () => {
    const r = educacaoPush(
      entrada({
        metas: [{ nome: "Primeiro milhão", alvo: 1_000_000, ordem: 1 }],
        ativos: [
          {
            ticker: "TESOURO",
            categoria: "Tesouro Direto",
            quantidade: 500,
            preco_medio: 10,
            preco_atual: 10,
            dy: 0,
          },
          {
            ticker: "PETR4",
            categoria: "Ações",
            quantidade: 100,
            preco_medio: 30,
            preco_atual: 30,
            dy: 6,
          },
        ],
      }),
    );
    expect(ids(r)).not.toContain("reserva_emergencia");
    expect(ids(r)).not.toContain("sem_renda_fixa");
  });

  it("concentração alta é apontada com valor a reduzir", () => {
    const r = educacaoPush(
      entrada({
        ativos: [
          {
            ticker: "PETR4",
            categoria: "Ações",
            quantidade: 100,
            preco_medio: 30,
            preco_atual: 50,
            dy: 6,
          },
          {
            ticker: "HGLG11",
            categoria: "FIIs",
            quantidade: 10,
            preco_medio: 100,
            preco_atual: 100,
            dy: 8,
          },
        ],
      }),
    );
    expect(ids(r)).toContain("concentracao");
  });

  it("plano não salvo é apontado", () => {
    const r = educacaoPush(entrada({ planoSalvo: false }));
    expect(ids(r)).toContain("plano_nao_definido");
  });

  it("sem metas é apontado", () => {
    const r = educacaoPush(
      entrada({
        ativos: [
          {
            ticker: "TESOURO",
            categoria: "Tesouro Direto",
            quantidade: 100,
            preco_medio: 10,
            preco_atual: 10,
            dy: 0,
          },
          {
            ticker: "PETR4",
            categoria: "Ações",
            quantidade: 100,
            preco_medio: 30,
            preco_atual: 30,
            dy: 6,
          },
        ],
      }),
    );
    expect(ids(r)).toContain("sem_metas");
  });

  it("filtro por gap específico retorna só ele", () => {
    const r = educacaoPush(
      entrada({
        ativos: [
          {
            ticker: "PETR4",
            categoria: "Ações",
            quantidade: 100,
            preco_medio: 30,
            preco_atual: 40,
            dy: 6,
          },
        ],
      }),
      "reserva_emergencia",
    );
    expect(ids(r)).toEqual(["reserva_emergencia"]);
  });

  it("carteira saudável tem poucos gaps", () => {
    const r = educacaoPush(
      entrada({
        metas: [{ nome: "Primeiro milhão", alvo: 1_000_000, ordem: 1 }],
        ativos: [
          {
            ticker: "TESOURO",
            categoria: "Tesouro Direto",
            quantidade: 500,
            preco_medio: 10,
            preco_atual: 10,
            dy: 0,
          },
          {
            ticker: "PETR4",
            categoria: "Ações",
            quantidade: 30,
            preco_medio: 30,
            preco_atual: 30,
            dy: 6,
          },
          {
            ticker: "HGLG11",
            categoria: "FIIs",
            quantidade: 10,
            preco_medio: 100,
            preco_atual: 100,
            dy: 8,
          },
          {
            ticker: "IVVB11",
            categoria: "ETF (Global)",
            quantidade: 5,
            preco_medio: 400,
            preco_atual: 400,
            dy: 1,
          },
          {
            ticker: "BOVA11",
            categoria: "ETF Brasil",
            quantidade: 5,
            preco_medio: 150,
            preco_atual: 150,
            dy: 3,
          },
        ],
        aportes: [
          { data: "2026-01-05", ticker: "BOVA11", quantidade: 1, preco: 150 },
          { data: "2026-02-05", ticker: "BOVA11", quantidade: 1, preco: 150 },
          { data: "2026-03-05", ticker: "BOVA11", quantidade: 1, preco: 150 },
        ],
      }),
    );
    expect(ids(r)).not.toContain("carteira_vazia");
    expect(ids(r)).not.toContain("sem_renda_fixa");
    expect(ids(r)).not.toContain("sem_acoes");
    expect(ids(r)).not.toContain("sem_fiis");
    expect(ids(r)).not.toContain("sem_metas");
  });
});
