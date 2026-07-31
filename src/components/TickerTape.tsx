import { useMemo } from "react";
import { useTicker } from "@/hooks/useTicker";
import { TickerContainer } from "@/components/TickerContainer";
import { TickerItem } from "@/components/TickerItem";

export type TickerTapeProps = {
  /** Menor = mais rápido. */
  speed?: number;
  pauseOnHover?: boolean;
  refreshInterval?: number;
  theme?: "dark" | "light";
  showIcons?: boolean;
  showCurrency?: boolean;
};

/** Barra de cotações contínua (BRAPI), atualizada automaticamente. */
export function TickerTape({
  speed = 40,
  pauseOnHover = true,
  refreshInterval = 5_000,
  theme = "dark",
  showIcons = true,
  showCurrency = true,
}: TickerTapeProps) {
  const { assets, loading, degradado } = useTicker(refreshInterval);

  const itens = useMemo(
    () =>
      assets.map((a) => (
        <TickerItem key={a.id} item={a} showIcons={showIcons} showCurrency={showCurrency} />
      )),
    [assets, showIcons, showCurrency],
  );

  if (!assets.length && loading) return null;

  const fundo = theme === "dark" ? "#111827" : "#f3f4f6";
  const texto = theme === "dark" ? "#ffffff" : "#111827";

  return (
    <div
      role="marquee"
      aria-label="Cotações em tempo real"
      className="flex h-10 w-full items-center overflow-hidden select-none"
      style={{ backgroundColor: fundo, color: texto }}
    >
      <TickerContainer speed={speed} pauseOnHover={pauseOnHover}>
        {itens}
      </TickerContainer>

      {degradado ? (
        <span className="shrink-0 px-3 text-[0.7rem]" style={{ color: "#9ca3af" }}>
          Dados temporariamente indisponíveis
        </span>
      ) : null}
    </div>
  );
}
