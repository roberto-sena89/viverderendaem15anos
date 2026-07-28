import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, WifiOff } from "lucide-react";
import { fitaMercado } from "@/lib/market.functions";

const INTERVALO_MS = 60 * 1000;

function fmt(valor: number | null, nome: string) {
  if (valor === null) return "—";
  if (nome === "BTC" && valor >= 1000)
    return `R$ ${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} K`;
  if (valor >= 10000)
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function variacao(v: number | null) {
  if (v === null) return "—";
  return `${v >= 0 ? "" : "-"}${Math.abs(v).toFixed(2).replace(".", ",")}%`;
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
  const fitaFn = useServerFn(fitaMercado);
  const online = useOnline();

  const { data, isFetching, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["fita-mercado"],
    queryFn: () => fitaFn({}),
    refetchInterval: online ? INTERVALO_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (tentativa) => Math.min(30_000, 2 ** tentativa * 1000),
    staleTime: 30 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const itens = data?.itens ?? [];
  const hora = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;
  const degradado = !online || isError;

  if (itens.length === 0 && !degradado) return null;

  const sequencia = [...itens, ...itens];

  return (
    <div className="flex items-center border-b border-border bg-sidebar">
      <div className="fita-pausa min-w-0 flex-1 overflow-hidden">
        <div className="fita-rolando flex w-max items-center">
          {sequencia.map((i, idx) => (
            <div
              key={`${i.simbolo}-${idx}`}
              className="flex shrink-0 items-center gap-2 px-5 py-1.5 text-[0.72rem] tabular-nums"
            >
              <span className="font-semibold text-sidebar-foreground">{i.nome}</span>
              <span className="text-muted-foreground">{fmt(i.preco, i.nome)}</span>
              <span
                className={
                  (i.variacaoPercent ?? 0) >= 0
                    ? "font-medium text-success"
                    : "font-medium text-destructive"
                }
              >
                {variacao(i.variacaoPercent)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void refetch()}
        aria-live="polite"
        aria-label="Atualizar cotações"
        title={degradado ? "Sem conexão com a fonte — exibindo últimos dados" : "Atualizar cotações"}
        className="flex shrink-0 items-center gap-1.5 border-l border-border px-3 py-1.5 text-[0.65rem] text-muted-foreground transition-colors hover:bg-sidebar-accent/60"
      >
        {degradado ? (
          <WifiOff className="size-3 text-destructive" />
        ) : isFetching ? (
          <RefreshCw className="size-3 animate-spin text-primary" />
        ) : (
          <span className="size-1.5 rounded-full bg-success" />
        )}
        <span className="hidden tabular-nums sm:inline">
          {degradado
            ? hora
              ? `Offline · ${hora}`
              : "Indisponível"
            : isFetching
              ? "Atualizando…"
              : hora
                ? `Ao vivo · ${hora}`
                : "Ao vivo"}
        </span>
      </button>
    </div>
  );
}
