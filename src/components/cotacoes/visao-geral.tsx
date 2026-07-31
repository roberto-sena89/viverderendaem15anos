import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { corVar, fmtPercent, fmtPreco } from "@/components/cotacoes/formatos";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { visaoGeralMercado, type LinhaCotacao } from "@/lib/grade-mercado.functions";

export function VisaoGeralMercado({ intervaloMs }: { intervaloMs: number }) {
  const buscar = useServerFn(visaoGeralMercado);
  const { favoritos } = useFavoritos();

  const { data, isLoading } = useQuery({
    queryKey: ["visao-geral-mercado"],
    queryFn: () => buscar(),
    refetchInterval: intervaloMs > 0 ? intervaloMs : false,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    gcTime: 30 * 60_000,
  });


  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {(data?.indices ?? []).map((l) => (
          <CardIndice key={l.ticker} linha={l} />
        ))}
      </div>




      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Maiores altas do dia"
          hint="Ações, FIIs e criptomoedas"
          bodyClassName="p-0"
          action={<TrendingUp className="size-4 text-positive" aria-hidden />}
        >
          <ListaCompacta linhas={data?.altas ?? []} />
        </Panel>
        <Panel
          title="Maiores baixas do dia"
          hint="Ações, FIIs e criptomoedas"
          bodyClassName="p-0"
          action={<TrendingDown className="size-4 text-negative" aria-hidden />}
        >
          <ListaCompacta linhas={data?.baixas ?? []} />
        </Panel>
      </div>
    </div>
  );
}

function CardIndice({ linha }: { linha: LinhaCotacao }) {
  const pos = (linha.variacaoPercent ?? 0) >= 0;
  return (
    <div className="panel p-3">
      <p className="truncate text-xs tracking-[0.08em] text-muted-foreground uppercase">{linha.ticker}</p>
      <p className="mt-1 font-display text-lg tabular-nums">{fmtPreco(linha.preco, linha.moeda)}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className={`text-xs tabular-nums ${corVar(linha.variacaoPercent)}`}>
          {fmtPercent(linha.variacaoPercent)}
        </span>
        <Sparkline serie={linha.spark} positivo={pos} largura={64} altura={22} />
      </div>
    </div>
  );
}

function ListaCompacta({ linhas }: { linhas: LinhaCotacao[] }) {
  if (linhas.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Sem dados disponíveis no momento.</p>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {linhas.map((l) => (
        <li key={`${l.categoria}-${l.ticker}`} className="flex items-center gap-3 px-4 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{l.ticker}</span>
            <span className="block truncate text-xs text-muted-foreground">{l.nome}</span>
          </span>
          <Sparkline serie={l.spark} positivo={(l.variacaoPercent ?? 0) >= 0} largura={56} altura={22} />
          <span className="shrink-0 text-right">
            <span className="block text-sm tabular-nums">{fmtPreco(l.preco, l.moeda)}</span>
            <span className={`block text-xs tabular-nums ${corVar(l.variacaoPercent)}`}>
              {fmtPercent(l.variacaoPercent)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
