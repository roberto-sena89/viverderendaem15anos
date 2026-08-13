import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estado vazio padrão da plataforma.
 * Usa exclusivamente os tokens fluidos (p-cartao, pilha-bloco) e as utilidades
 * tipográficas (t-card-title, t-body-sm) para manter hierarquia e margens
 * consistentes em qualquer breakpoint.
 */
export function EstadoVazio({
  icone: Icone = Inbox,
  titulo,
  descricao,
  acao,
  compacto = false,
  className,
}: {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  compacto?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-bloco rounded-xl border border-dashed border-border/70 p-cartao text-center",
        compacto ? "py-6" : "py-10 sm:py-12",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-full bg-muted/50 text-muted-foreground"
      >
        <Icone className="size-5" />
      </span>

      <div className="pilha-bloco max-w-prose">
        <p className="t-card-title texto-seguro text-foreground">{titulo}</p>
        {descricao ? (
          <p className="t-body-sm texto-seguro text-muted-foreground">{descricao}</p>
        ) : null}
      </div>

      {acao ? <div className="flex flex-wrap items-center justify-center gap-2">{acao}</div> : null}
    </div>
  );
}
