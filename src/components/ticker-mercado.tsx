import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { painelB3 } from "@/lib/market.functions";

function fmt(valor: number | null, moeda: string) {
  if (valor === null) return "—";
  if (moeda === "BRL" && valor >= 1000)
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TickerMercado() {
  const painelFn = useServerFn(painelB3);
  const { data } = useQuery({
    queryKey: ["painel-b3-ticker"],
    queryFn: () => painelFn({}),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const itens = data?.indices ?? [];
  if (itens.length === 0) return null;

  return (
    <div className="border-b border-border bg-sidebar">
      <div className="flex items-center gap-6 overflow-x-auto px-5 py-1.5 lg:px-8">
        {itens.map((i) => (
          <div key={i.simbolo} className="flex shrink-0 items-center gap-2 text-[0.7rem] tabular-nums">
            <span className="font-semibold text-sidebar-foreground">{i.nome}</span>
            <span className="text-muted-foreground">{fmt(i.preco, i.moeda)}</span>
            <span
              className={
                (i.variacaoPercent ?? 0) >= 0 ? "font-medium text-success" : "font-medium text-destructive"
              }
            >
              {i.variacaoPercent === null
                ? "—"
                : `${i.variacaoPercent >= 0 ? "" : "-"}${Math.abs(i.variacaoPercent).toFixed(2).replace(".", ",")}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
