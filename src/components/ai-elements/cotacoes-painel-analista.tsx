import { useMemo } from "react";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import {
  chaveTicker,
  useAtivosAoVivo,
  useCotacoesTempoReal,
} from "@/lib/cotacoes-tempo-real";
import { tempoRelativo } from "@/components/status-cotacoes";
import { arredondar, brl, valorAtual } from "@/lib/portfolio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bloco de preços e variações ao vivo dentro do Painel do analista.
 * Usa a mesma fonte de cotações do Dashboard (`useAtivosAoVivo`), portanto
 * atualiza sozinho no intervalo de polling, sem recarregar a página.
 */
export function CotacoesPainelAnalista() {
  const { data: ativos = [] } = useAtivosAoVivo();
  const { mapa, flash, atualizadoEm, atualizarAgora, carregando, pregaoAberto } =
    useCotacoesTempoReal();

  const { total, variacaoDia, linhas } = useMemo(() => {
    let total = 0;
    let anterior = 0;
    const linhas = ativos
      .map((a) => {
        const cot = mapa.get(chaveTicker(a.ticker));
        const preco = cot?.preco && cot.preco > 0 ? cot.preco : a.precoAtual;
        const valor = arredondar(valorAtual(a));
        total += valor;
        const fech = cot?.fechamentoAnterior ?? null;
        anterior += fech && fech > 0 ? fech * a.quantidade : valor;
        return {
          id: a.id,
          ticker: a.ticker,
          preco,
          valor,
          variacao: cot?.variacaoPercent ?? null,
          flash: flash[chaveTicker(a.ticker)] ?? null,
        };
      })
      .sort((a, b) => b.valor - a.valor);
    const variacaoDia = anterior > 0 ? ((total - anterior) / anterior) * 100 : 0;
    return { total, variacaoDia, linhas };
  }, [ativos, mapa, flash]);

  if (ativos.length === 0) return null;

  const pesos = linhas.map((l) => ({
    ...l,
    peso: total > 0 ? (l.valor / total) * 100 : 0,
  }));

  return (
    <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preços ao vivo
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            pregaoAberto
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/40 bg-muted text-muted-foreground",
          )}
        >
          {pregaoAberto ? "mercado aberto" : "mercado fechado"}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground" aria-live="polite">
          atualizado {tempoRelativo(atualizadoEm)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 shrink-0 rounded-full px-2 text-[11px]"
          onClick={() => atualizarAgora()}
          disabled={carregando}
          aria-label="Atualizar cotações agora"
        >
          <RefreshCw className={cn("mr-1 size-3", carregando && "animate-spin")} aria-hidden />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-lg font-bold tabular-nums">{brl(total, 2)}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
            variacaoDia >= 0
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {variacaoDia >= 0 ? (
            <TrendingUp className="size-3" aria-hidden />
          ) : (
            <TrendingDown className="size-3" aria-hidden />
          )}
          {variacaoDia >= 0 ? "+" : ""}
          {variacaoDia.toFixed(2)}% hoje
        </span>
      </div>

      <ul className="grid gap-1">
        {pesos.slice(0, 8).map((l) => (
          <li
            key={l.id}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors duration-500",
              l.flash === "up" && "bg-primary/10",
              l.flash === "down" && "bg-destructive/10",
            )}
          >
            <span className="w-16 shrink-0 font-semibold">{l.ticker}</span>
            <span className="tabular-nums">{brl(l.preco, 2)}</span>
            <span
              className={cn(
                "tabular-nums font-semibold",
                (l.variacao ?? 0) >= 0 ? "text-primary" : "text-destructive",
              )}
            >
              {l.variacao === null
                ? "—"
                : `${l.variacao >= 0 ? "+" : ""}${l.variacao.toFixed(2)}%`}
            </span>
            <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
              {l.peso.toFixed(1)}% da carteira
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
