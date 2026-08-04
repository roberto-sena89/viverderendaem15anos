import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeletons padronizados das grades/listas.
 * Mesmos tokens de espaçamento das grades reais (p-cartao, pilha-bloco, gap-bloco)
 * para que o carregamento não gere salto de layout nem quebra de margem.
 */
export function SkeletonLinhasGrade({
  quantidade = 8,
  colunas = 5,
  className,
}: {
  quantidade?: number;
  colunas?: number;
  className?: string;
}) {
  const linhas = Array.from({ length: Math.max(1, Math.min(quantidade, 20)) });
  const celulas = Array.from({ length: Math.max(1, colunas) });

  return (
    <div aria-hidden className={cn("animate-pulse", className)}>
      {linhas.map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-bloco border-b border-border px-3 py-2.5 last:border-b-0 sm:px-4"
        >
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
          {celulas.map((__, j) => (
            <Skeleton
              key={j}
              className={cn("h-3 w-16 shrink-0 rounded", j > 1 && "hidden lg:block")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCartoesGrade({
  quantidade = 6,
  altura = "h-[104px]",
  className,
}: {
  quantidade?: number;
  altura?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid animate-pulse gap-bloco sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: Math.max(1, quantidade) }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-xl", altura)} />
      ))}
    </div>
  );
}
