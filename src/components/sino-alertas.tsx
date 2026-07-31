import { Bell, BellOff, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAlertasHistorico } from "@/lib/alertas-historico";

function quando(ts: number) {
  const d = new Date(ts);
  const hoje = new Date().toDateString() === d.toDateString();
  return hoje
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Sino do cabeçalho com o histórico dos alertas de variação disparados. */
export function SinoAlertas() {
  const { alertas, naoLidos, marcarTodosLidos, limpar } = useAlertasHistorico();

  return (
    <Popover onOpenChange={(aberto) => aberto && naoLidos > 0 && marcarTodosLidos()}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={naoLidos > 0 ? `Alertas (${naoLidos} não lidos)` : "Alertas disparados"}
        >
          <Bell className="size-4" />
          {naoLidos > 0 ? (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] leading-4 font-bold text-destructive-foreground">
              {naoLidos > 9 ? "9+" : naoLidos}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Alertas de variação</p>
          {alertas.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpar}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            >
              <Trash2 className="size-3.5" /> Limpar
            </Button>
          ) : null}
        </div>

        {alertas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <BellOff className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum alerta disparado ainda.</p>
            <p className="text-xs text-muted-foreground">
              Configure o percentual em “Atualizar agora → ⚙︎” na barra de cotações.
            </p>
          </div>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {alertas.map((a) => {
              const alta = a.variacaoPercent >= 0;
              return (
                <li key={a.id} className="flex items-start gap-3 px-3 py-2.5">
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                      alta ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {alta ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {a.ticker}{" "}
                      <span className={alta ? "text-success" : "text-destructive"}>
                        {alta ? "+" : ""}
                        {a.variacaoPercent.toFixed(2)}%
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Limite de {a.limite}%
                      {a.preco ? ` · ${a.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                    </p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      {quando(a.em)} · {a.canais.join(" + ")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
