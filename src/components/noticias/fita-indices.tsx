import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TrendingDown, TrendingUp } from "lucide-react";
import { indicesNoticias, type IndiceNoticias } from "@/lib/noticias.functions";
import { Skeleton } from "@/components/ui/skeleton";

function valor(i: IndiceNoticias) {
  if (i.preco === null) return "—";
  const casas = i.nome === "Ibovespa" || i.nome === "Nasdaq" || i.nome === "Bitcoin" ? 0 : 2;
  return i.preco.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function Item({ i }: { i: IndiceNoticias }) {
  const v = i.variacaoPercent;
  const positivo = (v ?? 0) >= 0;
  const Icone = positivo ? TrendingUp : TrendingDown;
  return (
    <div className="flex shrink-0 items-center gap-2 px-4 py-2 text-[0.82rem] tabular-nums">
      <span className="font-semibold">{i.nome}</span>
      <span className="text-muted-foreground">{valor(i)}</span>
      {v === null ? null : (
        <span
          className={`flex items-center gap-0.5 font-medium ${positivo ? "text-success" : "text-destructive"}`}
        >
          <Icone className="size-3" aria-hidden="true" />
          {positivo ? "+" : "-"}
          {Math.abs(v).toFixed(2).replace(".", ",")}%
        </span>
      )}
    </div>
  );
}

/**
 * Fita de índices no topo da página: rola sozinha no desktop e permite
 * rolagem manual no mobile (sticky).
 */
export function FitaIndices() {
  const fn = useServerFn(indicesNoticias);
  const { data, isPending } = useQuery({
    queryKey: ["noticias-indices"],
    queryFn: () => fn({}),
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const itens = data?.itens ?? [];

  if (isPending && itens.length === 0) {
    return (
      <div className="panel flex gap-4 overflow-hidden px-4 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-32 shrink-0" />
        ))}
      </div>
    );
  }

  if (itens.length === 0) return null;

  return (
    <div
      className="panel sticky top-0 z-20 overflow-hidden bg-card/95 backdrop-blur"
      aria-label="Índices de mercado"
    >
      {/* Mobile: rolagem horizontal manual */}
      <div className="rolagem-lateral flex md:hidden">
        {itens.map((i) => (
          <Item key={i.simbolo} i={i} />
        ))}
      </div>
      {/* Desktop: fita com rolagem automática */}
      <div className="fita-pausa hidden min-w-0 overflow-hidden md:block">
        <div className="fita-rolando flex w-max items-center">
          {[...itens, ...itens].map((i, idx) => (
            <Item key={`${i.simbolo}-${idx}`} i={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
