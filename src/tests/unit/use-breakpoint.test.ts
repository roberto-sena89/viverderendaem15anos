import { describe, expect, it } from "vitest";
import {
  BREAKPOINTS,
  getBreakpointFromWidth,
  isBreakpointDown,
  isBreakpointUp,
} from "../../hooks/use-breakpoint";

describe("getBreakpointFromWidth", () => {
  it("não deixa lacunas entre faixas (cascata contínua)", () => {
    for (let width = 0; width <= 2560; width++) {
      expect(getBreakpointFromWidth(width)).toBeDefined();
    }
  });

  it("mapeia as faixas nos limites corretos", () => {
    expect(getBreakpointFromWidth(0)).toBe("watch");
    expect(getBreakpointFromWidth(320)).toBe("watch");
    expect(getBreakpointFromWidth(321)).toBe("mobile");
    expect(getBreakpointFromWidth(768)).toBe("mobile");
    expect(getBreakpointFromWidth(769)).toBe("tablet");
    expect(getBreakpointFromWidth(1024)).toBe("desktop");
    expect(getBreakpointFromWidth(2559)).toBe("desktop");
    expect(getBreakpointFromWidth(2560)).toBe("ultraWide");
  });

  it("mantém os breakpoints ordenados por largura mínima", () => {
    const widths = BREAKPOINTS.map((b) => b.minWidth);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
  });
});

describe("isBreakpointUp / isBreakpointDown", () => {
  it("isBreakpointUp é verdadeiro para o alvo e acima", () => {
    expect(isBreakpointUp("desktop", "desktop")).toBe(true);
    expect(isBreakpointUp("ultraWide", "desktop")).toBe(true);
    expect(isBreakpointUp("tablet", "desktop")).toBe(false);
  });

  it("isBreakpointDown é verdadeiro para o alvo e abaixo", () => {
    expect(isBreakpointDown("mobile", "mobile")).toBe(true);
    expect(isBreakpointDown("watch", "mobile")).toBe(true);
    expect(isBreakpointDown("tablet", "mobile")).toBe(false);
  });

  it("desktop inicia em 1024px (mesmo limite do Tailwind lg)", () => {
    expect(getBreakpointFromWidth(1024)).toBe("desktop");
  });
});
