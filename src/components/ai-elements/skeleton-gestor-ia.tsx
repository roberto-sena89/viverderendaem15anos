"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SkeletonHistorico() {
  return (
    <div
      className="flex flex-col gap-6 p-4 motion-safe:animate-pulse motion-reduce:animate-none"
      aria-busy="true"
      aria-label="Carregando conversa"
      role="status"
    >
      <span className="sr-only">Carregando histórico da conversa…</span>
      {/* Mensagem do usuário skeleton */}
      <div className="flex flex-col gap-2 ml-auto max-w-[80%]" aria-hidden="true">
        <Skeleton className="h-4 w-32 ml-auto rounded-full" />
        <div className="rounded-xl bg-secondary/60 px-4 py-3 space-y-2 border border-border/40">
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-5/6 rounded-full" />
          <Skeleton className="h-3 w-3/4 rounded-full" />
        </div>
      </div>
      {/* Resposta do Gestor skeleton - cartão principal */}
      <div className="flex gap-3" aria-hidden="true">
        <Skeleton className="size-8 rounded-full shrink-0 mt-1" />
        <div className="flex-1 space-y-3 min-w-0">
          <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-3 w-40 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-11/12 rounded-full" />
            <Skeleton className="h-3 w-10/12 rounded-full" />
            {/* Tabela skeleton elegante */}
            <div className="rounded-xl border border-border/40 overflow-hidden mt-3">
              <div className="bg-muted/40 px-3 py-2.5 flex gap-3">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-3 w-16 rounded-full ml-auto" />
                <Skeleton className="h-3 w-16 rounded-full" />
              </div>
              <div className="divide-y divide-border/30">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-3 w-16 rounded-full ml-auto" />
                    <Skeleton className="h-3 w-14 rounded-full" />
                    <Skeleton className="h-3 w-12 rounded-full hidden sm:block" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-3 w-48 rounded-full opacity-60" />
        </div>
      </div>
      {/* Segunda mensagem curta */}
      <div className="flex gap-3 opacity-70" aria-hidden="true">
        <Skeleton className="size-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-2 max-w-[75%]">
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-4/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAnalisando({
  className,
  texto = "Analisando sua carteira...",
}: {
  className?: string;
  texto?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 px-2 pt-2 motion-safe:animate-pulse motion-reduce:animate-none",
        className,
      )}
      aria-busy="true"
      aria-label={texto}
      role="status"
    >
      <div
        className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <span className="size-3 rounded-full bg-primary/60 motion-safe:animate-ping motion-reduce:animate-none" />
      </div>
      <div className="flex-1 min-w-0 space-y-3 max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
          <span className="flex gap-1" aria-hidden="true">
            <span className="size-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
            <span className="size-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
            <span className="size-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce motion-reduce:animate-none" />
          </span>
          <span className="text-xs font-medium text-primary/80 tracking-wide">{texto}</span>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2.5 shadow-sm" aria-hidden="true">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Skeleton className="size-3 rounded-full" />
            <Skeleton className="h-3 w-56 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-11/12 rounded-full" />
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg hidden sm:block" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/70" aria-hidden="true">
          Consultando cotações, fundamentos e agenda econômica…
        </p>
      </div>
    </div>
  );
}

export function SkeletonBolhaStreaming() {
  return (
    <div
      className="flex gap-3 px-2 pt-1 motion-safe:animate-pulse motion-reduce:animate-none"
      aria-busy="true"
      aria-label="Carregando resposta"
      role="status"
    >
      <span className="sr-only">Carregando resposta…</span>
      <Skeleton className="size-8 rounded-full shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-2" aria-hidden="true">
        <Skeleton className="h-3 w-3/4 rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-5/6 rounded-full" />
      </div>
    </div>
  );
}
