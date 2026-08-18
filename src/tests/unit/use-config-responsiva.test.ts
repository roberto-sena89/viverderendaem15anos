import { describe, expect, it } from "vitest";
import { resolverConfigResponsiva, type ConfigResponsiva } from "../../hooks/use-config-responsiva";

const DEFAULTS: ConfigResponsiva<{ padding: string; metrica: string }> = {
  watch: { padding: "p-1", metrica: "1rem" },
  mobile: { padding: "p-2", metrica: "1.2rem" },
  tablet: { padding: "p-3", metrica: "1.4rem" },
  desktop: { padding: "p-4", metrica: "1.6rem" },
  ultraWide: { padding: "p-5", metrica: "1.8rem" },
};

describe("resolverConfigResponsiva", () => {
  it("retorna a configuração padrão do breakpoint ativo", () => {
    expect(resolverConfigResponsiva(DEFAULTS, undefined, "watch")).toEqual({
      padding: "p-1",
      metrica: "1rem",
    });
    expect(resolverConfigResponsiva(DEFAULTS, undefined, "desktop")).toEqual({
      padding: "p-4",
      metrica: "1.6rem",
    });
    expect(resolverConfigResponsiva(DEFAULTS, undefined, "ultraWide")).toEqual({
      padding: "p-5",
      metrica: "1.8rem",
    });
  });

  it("aplica overrides apenas nas faixas informadas", () => {
    const overrides = {
      mobile: { padding: "p-6", metrica: "2rem" },
      ultraWide: { padding: "p-10" },
    };
    expect(resolverConfigResponsiva(DEFAULTS, overrides, "mobile")).toEqual({
      padding: "p-6",
      metrica: "2rem",
    });
    expect(resolverConfigResponsiva(DEFAULTS, overrides, "ultraWide")).toEqual({
      padding: "p-10",
      metrica: "1.8rem",
    });
    expect(resolverConfigResponsiva(DEFAULTS, overrides, "tablet")).toEqual({
      padding: "p-3",
      metrica: "1.4rem",
    });
  });

  it("defaults para desktop quando o breakpoint não é informado", () => {
    expect(resolverConfigResponsiva(DEFAULTS)).toEqual({
      padding: "p-4",
      metrica: "1.6rem",
    });
  });
});
