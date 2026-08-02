// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ABAS_COTACOES, ABAS_CATEGORIA_GENERICA } from "@/lib/cotacoes-abas";

afterEach(cleanup);

describe("Abas de Cotações · remoção do Câmbio", () => {
  it("não contém a aba Câmbio", () => {
    expect(ABAS_COTACOES.some((a) => a.id === "cambio")).toBe(false);
    expect(ABAS_COTACOES.some((a) => /c[âa]mbio/i.test(a.rotulo))).toBe(false);
  });

  it("mantém as demais abas na ordem esperada", () => {
    expect(ABAS_COTACOES.map((a) => a.id)).toEqual([
      "geral",
      "acoes",
      "fiis",
      "indices",
      "tesouro",
      "etfs",
      "cripto",
      "commodities",
    ]);
  });

  it("não deixa entradas vazias ou ids duplicados na grade", () => {
    expect(ABAS_COTACOES.every((a) => a.id && a.rotulo)).toBe(true);
    expect(new Set(ABAS_COTACOES.map((a) => a.id)).size).toBe(ABAS_COTACOES.length);
  });

  it("não gera painel genérico de categoria para câmbio", () => {
    expect(ABAS_CATEGORIA_GENERICA.some((a) => a.id === "cambio")).toBe(false);
    expect(ABAS_CATEGORIA_GENERICA.every((a) => a.categoria)).toBe(true);
  });
});

function GradeAbas() {
  return (
    <Tabs defaultValue="geral">
      <TabsList>
        {ABAS_COTACOES.map((a) => (
          <TabsTrigger key={a.id} value={a.id}>
            {a.rotulo}
          </TabsTrigger>
        ))}
      </TabsList>
      {ABAS_COTACOES.map((a) => (
        <TabsContent key={a.id} value={a.id}>
          <div>painel-{a.id}</div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

describe("Navegação da grade de Cotações", () => {
  it("renderiza um gatilho por aba e nenhum de Câmbio", () => {
    render(<GradeAbas />);
    expect(screen.getAllByRole("tab")).toHaveLength(ABAS_COTACOES.length);
    expect(screen.queryByRole("tab", { name: /c[âa]mbio/i })).toBeNull();
  });

  it("abre a Visão geral por padrão", () => {
    render(<GradeAbas />);
    expect(screen.getByText("painel-geral")).toBeTruthy();
  });

  it("troca de painel ao clicar em cada aba restante", () => {
    render(<GradeAbas />);
    for (const aba of ABAS_COTACOES) {
      fireEvent.mouseDown(screen.getByRole("tab", { name: aba.rotulo }), { button: 0, ctrlKey: false });
      expect(screen.getByText(`painel-${aba.id}`)).toBeTruthy();
      expect(screen.getByRole("tab", { name: aba.rotulo })).toHaveProperty(
        "ariaSelected",
        "true",
      );
    }
  });
});
