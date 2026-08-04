import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholders exibidos enquanto o próximo lote de moedas entra na grade.
 * Mantém a altura da linha/cartão para evitar salto de layout.
 */
export function SkeletonLinhasCripto({ quantidade }: { quantidade: number }) {
  const itens = Array.from({ length: Math.max(1, Math.min(quantidade, 12)) });

  return (
    <div aria-hidden className="animate-pulse">
      {/* Desktop: imita as linhas da tabela */}
      <div className="hidden md:block">
        {itens.map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 sm:px-4"
          >
            <Skeleton className="h-3 w-5 shrink-0 rounded" />
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-2.5 w-16 rounded" />
            </div>
            <Skeleton className="h-3 w-20 shrink-0 rounded" />
            <Skeleton className="h-3 w-20 shrink-0 rounded" />
            <Skeleton className="hidden h-3 w-12 shrink-0 rounded lg:block" />
            <Skeleton className="h-3 w-12 shrink-0 rounded" />
            <Skeleton className="hidden h-3 w-12 shrink-0 rounded lg:block" />
            <Skeleton className="hidden h-3 w-24 shrink-0 rounded xl:block" />
          </div>
        ))}
      </div>

      {/* Mobile: imita os cartões */}
      <div className="pilha-bloco p-bloco md:hidden">
        {itens.map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-cartao">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-2.5 w-14 rounded" />
              </div>
              <Skeleton className="h-4 w-20 shrink-0 rounded" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Skeleton className="h-9 rounded-lg" />
              <Skeleton className="h-9 rounded-lg" />
              <Skeleton className="h-9 rounded-lg" />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Skeleton className="h-7 rounded-lg" />
              <Skeleton className="h-7 rounded-lg" />
              <Skeleton className="h-7 rounded-lg" />
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
