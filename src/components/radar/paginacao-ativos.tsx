import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const OPCOES_POR_PAGINA = [25, 50, 100, 200] as const;

/** Gera a sequência de páginas com reticências (ex.: 1 … 4 5 6 … 20). */
function janelaPaginas(atual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas = new Set<number>([1, total, atual, atual - 1, atual + 1]);
  if (atual <= 3) [2, 3, 4].forEach((p) => paginas.add(p));
  if (atual >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => paginas.add(p));
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const saida: (number | "…")[] = [];
  let anterior = 0;
  for (const p of ordenadas) {
    if (anterior && p - anterior > 1) saida.push("…");
    saida.push(p);
    anterior = p;
  }
  return saida;
}

/** Barra de paginação responsiva para listas e tabelas de ativos. */
export function PaginacaoAtivos({
  pagina,
  totalPaginas,
  totalItens,
  inicio,
  fim,
  porPagina,
  aoMudarPagina,
  aoMudarPorPagina,
}: {
  pagina: number;
  totalPaginas: number;
  totalItens: number;
  inicio: number;
  fim: number;
  porPagina: number;
  aoMudarPagina: (p: number) => void;
  aoMudarPorPagina: (n: number) => void;
}) {
  if (totalItens === 0) return null;

  return (
    <nav
      aria-label="Paginação de ativos"
      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs text-muted-foreground">
        Exibindo{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {inicio.toLocaleString("pt-BR")}–{fim.toLocaleString("pt-BR")}
        </span>{" "}
        de{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {totalItens.toLocaleString("pt-BR")}
        </span>{" "}
        ativos
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        <Select value={String(porPagina)} onValueChange={(v) => aoMudarPorPagina(Number(v))}>
          <SelectTrigger className="h-8 w-[110px] text-xs" aria-label="Ativos por página">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPCOES_POR_PAGINA.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                {n} por página
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={pagina <= 1}
            onClick={() => aoMudarPagina(1)}
            aria-label="Primeira página"
          >
            <ChevronsLeft className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={pagina <= 1}
            onClick={() => aoMudarPagina(pagina - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>

          <ul className="hidden items-center gap-1 sm:flex">
            {janelaPaginas(pagina, totalPaginas).map((p, i) =>
              p === "…" ? (
                <li key={`gap-${i}`} className="px-1 text-xs text-muted-foreground" aria-hidden>
                  …
                </li>
              ) : (
                <li key={p}>
                  <Button
                    type="button"
                    variant={p === pagina ? "default" : "ghost"}
                    size="icon"
                    className="size-8 text-xs tabular-nums"
                    aria-current={p === pagina ? "page" : undefined}
                    aria-label={`Página ${p}`}
                    onClick={() => aoMudarPagina(p)}
                  >
                    {p}
                  </Button>
                </li>
              ),
            )}
          </ul>

          <span className="px-1 text-xs tabular-nums text-muted-foreground sm:hidden">
            {pagina} / {totalPaginas}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={pagina >= totalPaginas}
            onClick={() => aoMudarPagina(pagina + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={pagina >= totalPaginas}
            onClick={() => aoMudarPagina(totalPaginas)}
            aria-label="Última página"
          >
            <ChevronsRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </nav>
  );
}
