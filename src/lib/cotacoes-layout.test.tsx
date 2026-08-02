// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ABAS_COTACOES,
  CLASSES_BARRA_ABAS,
  CLASSES_LISTA_ABAS,
  CLASSES_GATILHO_ABA,
  CLASSES_ROTULO_ABA,
  CLASSES_BUSCA,
} from "@/lib/cotacoes-abas";

afterEach(cleanup);

const FONTE_PAGINA = readFileSync("src/routes/_authenticated/cotacoes.tsx", "utf8");

describe("Cotações · sem rolagem horizontal no mobile", () => {
  it("não habilita overflow horizontal antes do breakpoint sm", () => {
    expect(CLASSES_BARRA_ABAS).toContain("sm:overflow-x-auto");
    expect(CLASSES_BARRA_ABAS).not.toMatch(/(^|\s)overflow-x-(auto|scroll)/);
  });

  it("não usa largura mínima intrínseca no mobile na lista de abas", () => {
    expect(CLASSES_LISTA_ABAS).not.toMatch(/(^|\s)(w-max|min-w-max)/);
    expect(CLASSES_LISTA_ABAS).toContain("w-full");
    expect(CLASSES_LISTA_ABAS).toContain("sm:w-max");
  });

  it("permite que os rótulos encolham em vez de empurrar a largura", () => {
    expect(CLASSES_GATILHO_ABA).toContain("min-w-0");
    expect(CLASSES_ROTULO_ABA).toContain("truncate");
    expect(CLASSES_GATILHO_ABA).toContain("w-full");
  });

  it("mantém a busca fluida, alinhada à grade das abas", () => {
    expect(CLASSES_BUSCA).toContain("w-full");
    expect(CLASSES_BUSCA).toContain("sm:min-w-[220px]");
  });

  it("a página usa as classes compartilhadas (sem regressão inline)", () => {
    expect(FONTE_PAGINA).toContain("CLASSES_BARRA_ABAS");
    expect(FONTE_PAGINA).toContain("CLASSES_LISTA_ABAS");
    expect(FONTE_PAGINA).toContain("CLASSES_GATILHO_ABA");
    expect(FONTE_PAGINA).toContain("CLASSES_BUSCA");
  });

  it("a página não introduz larguras fixas em px fora de breakpoints", () => {
    const inlineFixo = FONTE_PAGINA.match(/className="[^"]*(?<![:-])w-\[\d+px\]/g);
    expect(inlineFixo).toBeNull();
  });
});

function BarraAbas() {
  return (
    <Tabs defaultValue="geral">
      <div className={CLASSES_BARRA_ABAS} data-testid="barra">
        <TabsList className={CLASSES_LISTA_ABAS} data-testid="lista">
          {ABAS_COTACOES.map((a) => (
            <TabsTrigger key={a.id} value={a.id} className={CLASSES_GATILHO_ABA}>
              {a.rotulo}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}

describe("Cotações · abas em grade no mobile", () => {
  it("renderiza a lista como grade de 4 colunas no mobile e flex no desktop", () => {
    render(<BarraAbas />);
    const lista = screen.getByTestId("lista");
    expect(lista.className).toContain("grid");
    expect(lista.className).toContain("grid-cols-4");
    expect(lista.className).toContain("sm:flex");
    expect(lista.className).not.toMatch(/(^|\s)flex(\s|$)/);
  });

  it("distribui todas as abas em linhas de 4 colunas", () => {
    render(<BarraAbas />);
    const gatilhos = screen.getAllByRole("tab");
    expect(gatilhos).toHaveLength(ABAS_COTACOES.length);
    expect(Math.ceil(gatilhos.length / 4)).toBe(2);
    for (const g of gatilhos) {
      expect(g.className).toContain("w-full");
      expect(g.className).toContain("min-w-0");
    }
  });

  it("a barra permanece fixa no topo sem rolagem lateral", () => {
    render(<BarraAbas />);
    const barra = screen.getByTestId("barra");
    expect(barra.className).toContain("sticky");
    expect(barra.className).not.toMatch(/(^|\s)overflow-x-(auto|scroll)/);
  });
});
