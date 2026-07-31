import { memo, useEffect, useRef, useState } from "react";
import type { CotacaoTicker } from "@/services/marketService";

const VERDE = "#22c55e";
const VERMELHO = "#ef4444";
const NEUTRO = "#9ca3af";

function formatar(item: CotacaoTicker, showCurrency: boolean) {
  const v = item.preco;
  if (v === null || !Number.isFinite(v)) return "—";
  if (item.pontos)
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const casas = Math.abs(v) < 1 ? 4 : 2;
  const numero = v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
  const simbolo = item.moeda === "USD" ? "US$" : "R$";
  return showCurrency ? `${simbolo} ${numero}` : numero;
}

function formatarVariacao(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export type TickerItemProps = {
  item: CotacaoTicker;
  showIcons: boolean;
  showCurrency: boolean;
};

/**
 * Um ativo da fita. Memoizado por preço/variação: só re-renderiza (e pisca)
 * quando o próprio ativo muda de preço.
 */
export const TickerItem = memo(function TickerItem({
  item,
  showIcons,
  showCurrency,
}: TickerItemProps) {
  const anterior = useRef<number | null>(item.preco);
  const [flash, setFlash] = useState<"alta" | "baixa" | null>(null);

  useEffect(() => {
    const antes = anterior.current;
    const agora = item.preco;
    if (antes !== null && agora !== null && agora !== antes) {
      setFlash(agora > antes ? "alta" : "baixa");
      const t = setTimeout(() => setFlash(null), 600);
      anterior.current = agora;
      return () => clearTimeout(t);
    }
    anterior.current = agora;
  }, [item.preco]);

  const variacao = item.variacaoPercent;
  const cor = variacao === null ? NEUTRO : variacao > 0 ? VERDE : variacao < 0 ? VERMELHO : NEUTRO;
  const icone = variacao === null || variacao === 0 ? "" : variacao > 0 ? "▲" : "▼";

  return (
    <span
      className="flex shrink-0 items-center gap-2 px-4 text-[0.8rem] tabular-nums sm:px-6"
      style={{
        transition: "background-color 300ms ease",
        backgroundColor:
          flash === "alta"
            ? "rgba(34,197,94,0.18)"
            : flash === "baixa"
              ? "rgba(239,68,68,0.18)"
              : "transparent",
      }}
    >
      <span className="font-semibold text-white">{item.rotulo}</span>
      <span style={{ color: "#e5e7eb" }}>{formatar(item, showCurrency)}</span>
      <span className="font-medium" style={{ color: cor }}>
        {showIcons && icone ? `${icone} ` : ""}
        {formatarVariacao(variacao)}
      </span>
    </span>
  );
});
