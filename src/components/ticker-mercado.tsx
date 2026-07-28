import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, WifiOff } from "lucide-react";
import { painelB3 } from "@/lib/market.functions";

const INTERVALO_MS = 60 * 1000;

function fmt(valor: number | null, moeda: string) {
  if (valor === null) return "—";
  if (moeda === "BRL" && valor >= 1000)
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function TickerMercado() {
  const painelFn = useServerFn(painelB3);
  const online = useOnline();

  const { data, isFetching, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["painel-b3-ticker"],
    queryFn: () => painelFn({}),
    refetchInterval: online ? INTERVALO_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (tentativa) => Math.min(30_000, 2 ** tentativa * 1000),
    staleTime: 30 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const itens = data?.indices ?? [];
  const hora = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  const degradado = !online || isError;

  if (itens.length === 0 && !degradado) return null;

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

        <button
          type="button"
          onClick={() => void refetch()}
          aria-live="polite"
          aria-label="Atualizar cotações"
          title={degradado ? "Sem conexão com a fonte — exibindo últimos dados" : "Atualizar cotações"}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.65rem] text-muted-foreground transition-colors hover:bg-sidebar-accent/60"
        >
          {degradado ? (
            <WifiOff className="size-3 text-destructive" />
          ) : isFetching ? (
            <RefreshCw className="size-3 animate-spin text-primary" />
          ) : (
            <span className="size-1.5 rounded-full bg-success" />
          )}
          <span className="tabular-nums">
            {degradado
              ? hora
                ? `Offline · últimos dados ${hora}`
                : "Cotações indisponíveis"
              : isFetching
                ? "Atualizando…"
                : hora
                  ? `Ao vivo · ${hora}`
                  : "Ao vivo"}
          </span>
        </button>
      </div>
    </div>
  );
}
