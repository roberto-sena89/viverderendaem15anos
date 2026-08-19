import { describe, expect, it } from "vitest";
import { selecionarConhecimento, type ConhecimentoItem } from "../../lib/conhecimento.server";

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