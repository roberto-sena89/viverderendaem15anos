import * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Texto que só exibe tooltip quando realmente está truncado.
 * Suporta mouse (hover/foco) e toque (tap abre e fecha).
 */
export function TextoTruncado({
  children,
  className,
  as: Tag = "span",
  texto,
  lado = "top",
  passivo = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "p" | "div" | "dt" | "dd";
  /** Conteúdo do tooltip; por padrão usa o texto renderizado. */
  texto?: string;
  lado?: "top" | "bottom" | "left" | "right";
  /** Não adiciona foco/clique próprio (para uso dentro de botões). */
  passivo?: boolean;
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [truncado, setTruncado] = React.useState(false);
  const [aberto, setAberto] = React.useState(false);

  const medir = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setTruncado(el.scrollWidth - el.clientWidth > 1 || el.scrollHeight - el.clientHeight > 1);
  }, []);

  React.useEffect(() => {
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [medir, children]);

  const conteudo = texto ?? (typeof children === "string" ? children : undefined);

  const elemento = (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(className, truncado && !passivo && "cursor-help")}
      tabIndex={truncado && !passivo ? 0 : undefined}
      onClick={truncado && !passivo ? () => setAberto((v) => !v) : undefined}
    >
      {children}
    </Tag>
  );

  if (!truncado || !conteudo) return elemento;

  return (
    <Tooltip open={aberto} onOpenChange={setAberto}>
      <TooltipTrigger asChild>{elemento}</TooltipTrigger>
      <TooltipContent side={lado} className="max-w-[min(20rem,80vw)] text-pretty">
        {conteudo}
      </TooltipContent>
    </Tooltip>
  );
}
