// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { createPortal } from "react-dom";
import { render, cleanup, screen } from "@testing-library/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

afterEach(cleanup);

function ExemploTooltip({ rotulo = "gatilho" }: { rotulo?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>{rotulo}</TooltipTrigger>
      <TooltipContent>ajuda</TooltipContent>
    </Tooltip>
  );
}

function PortalHost({ children }: { children: React.ReactNode }) {
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  return createPortal(children, alvo);
}

describe("Tooltip (regressão de TooltipProvider)", () => {
  it("renderiza sem provider explícito", () => {
    expect(() => render(<ExemploTooltip />)).not.toThrow();
    expect(screen.getByText("gatilho")).toBeTruthy();
  });

  it("renderiza dentro de um provider explícito", () => {
    expect(() =>
      render(
        <TooltipProvider>
          <ExemploTooltip rotulo="com-provider" />
        </TooltipProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByText("com-provider")).toBeTruthy();
  });

  it("renderiza dentro de um portal sem provider acima", () => {
    expect(() =>
      render(
        <PortalHost>
          <ExemploTooltip rotulo="portal-sem-provider" />
        </PortalHost>,
      ),
    ).not.toThrow();
    expect(screen.getByText("portal-sem-provider")).toBeTruthy();
  });

  it("herda o provider através do portal (React context atravessa portais)", () => {
    expect(() =>
      render(
        <TooltipProvider>
          <PortalHost>
            <ExemploTooltip rotulo="portal-com-provider" />
          </PortalHost>
        </TooltipProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByText("portal-com-provider")).toBeTruthy();
  });

  it("suporta múltiplos tooltips aninhados em subárvores desacopladas", () => {
    expect(() =>
      render(
        <div>
          <ExemploTooltip rotulo="a" />
          <PortalHost>
            <div>
              <ExemploTooltip rotulo="b" />
              <PortalHost>
                <ExemploTooltip rotulo="c" />
              </PortalHost>
            </div>
          </PortalHost>
        </div>,
      ),
    ).not.toThrow();
    ["a", "b", "c"].forEach((r) => expect(screen.getByText(r)).toBeTruthy());
  });
});
