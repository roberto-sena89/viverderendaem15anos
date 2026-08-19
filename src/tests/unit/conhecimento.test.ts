import { describe, expect, it } from "vitest";
import {
  formatarPainelMacro,
  montarItemCvm,
  selecionarConhecimento,
  type ConhecimentoItem,
} from "../../lib/conhecimento.server";

const item = (titulo: string, conteudo: string, categoria: ConhecimentoItem["categoria"] = "educacao"): ConhecimentoItem => ({
  categoria,
  titulo,
  conteudo,
  fonte: "fonte",
  atualizadoEm: "2026-01-01",
});

describe("selecionarConhecimento", () => {
  it("prioriza itens que casam com os termos da pergunta", () => {
    const itens = [
      item("Fundos imobiliários", "P/VP, vacância e distribuições de FIIs"),
      item("Ações e dividendos", "rendimento de ações na B3"),
      item("Impostos no Brasil", "IR sobre renda fixa"),
    ];
    const escolhidos = selecionarConhecimento("como declarar imposto de renda?", itens, 1000);
    expect(escolhidos[0].titulo).toBe("Impostos no Brasil");
    expect(escolhidos[0]).toBe(itens[2]);
  });

  it("respeita o orçamento de caracteres", () => {
    const itens = Array.from({ length: 20 }, (_, i) => item(`Item ${i}`, "conteudo ".repeat(30)));
    const escolhidos = selecionarConhecimento("", itens, 500);
    const total = escolhidos.reduce((s, i) => s + i.titulo.length + i.conteudo.length + 40, 0);
    expect(escolhidos.length).toBeGreaterThan(0);
    expect(escolhidos.length).toBeLessThan(itens.length);
    expect(total).toBeLessThan(500 * 1.5);
  });

  it("sem termos relevantes, prefere itens mais recentes", () => {
    const velho = item("Velho", "conteudo antigo");
    velho.atualizadoEm = "2020-01-01";
    const novo = item("Novo", "conteudo recente");
    novo.atualizadoEm = "2026-06-01";
    const escolhidos = selecionarConhecimento("qualquer coisa", [velho, novo], 1000);
    expect(escolhidos[0]).toBe(novo);
  });

  it("base vazia retorna lista vazia", () => {
    expect(selecionarConhecimento("pergunta", [])).toEqual([]);
  });
});

describe("formatarPainelMacro", () => {
  it("formata os últimos pontos das séries com indicador, unidade e data", () => {
    const texto = formatarPainelMacro([
      { indicador: "Meta Selic", unidade: "% a.a.", serie: [{ data: "10/08/2026", valor: 15 }] },
      { indicador: "Dólar comercial (venda)", unidade: "BRL", serie: [{ data: "10/08/2026", valor: 5.42 }] },
    ]);
    expect(texto).toContain("Meta Selic: 15 % a.a.");
    expect(texto).toContain("Dólar comercial (venda): 5.42 BRL");
    expect(texto).toContain("10/08/2026");
  });

  it("ignora séries vazias ou com valor não numérico", () => {
    const texto = formatarPainelMacro([
      { indicador: "Vazia", unidade: "x", serie: [] },
      { indicador: "Inválida", unidade: "x", serie: [{ data: "10/08/2026", valor: Number.NaN }] },
    ]);
    expect(texto).toBe("");
  });
});

describe("montarItemCvm", () => {
  it("retorna null sem data de atualização ou sem tickers com P/L", () => {
    expect(montarItemCvm({}, null)).toBeNull();
    expect(montarItemCvm({ PETR4: { plAtual: null } }, "2026-08-01T00:00:00.000Z")).toBeNull();
  });

  it("destaca os 3 tickers com menor P/L positivo", () => {
    const item = montarItemCvm(
      {
        A: { plAtual: 12.3 },
        B: { plAtual: 4.5 },
        C: { plAtual: 8.9 },
        D: { plAtual: -2 },
        E: { plAtual: 20 },
      },
      "2026-08-01T00:00:00.000Z",
      new Date("2026-08-10T12:00:00.000Z"),
    );
    expect(item).not.toBeNull();
    expect(item!.titulo).toContain("CVM");
    expect(item!.conteudo).toContain("B 4,5x");
    expect(item!.conteudo).toContain("C 8,9x");
    expect(item!.conteudo).toContain("A 12,3x");
    expect(item!.conteudo).not.toContain("-2x");
    expect(item!.conteudo).not.toContain("20x");
    expect(item!.conteudo).toContain("4 empresas");
    expect(item!.fonte).toContain("CVM");
  });
});