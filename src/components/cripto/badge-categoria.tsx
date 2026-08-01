import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  COR_CATEGORIA,
  EXPLICACAO_CATEGORIA,
  ROTULO_CATEGORIA,
  type CategoriaCripto,
} from "@/lib/cripto-base";

/** Badge de categoria com tooltip explicativo (jargão cripto). */
export function BadgeCategoria({
  categoria,
  rede,
  compacta,
}: {
  categoria: CategoriaCripto;
  rede?: string | null;
  compacta?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[0.62rem] leading-none font-medium ${COR_CATEGORIA[categoria]}`}
          >
            {compacta ? ROTULO_CATEGORIA[categoria].split(" ")[0] : ROTULO_CATEGORIA[categoria]}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-xs">
          {EXPLICACAO_CATEGORIA[categoria]}
        </TooltipContent>
      </Tooltip>
      {rede ? (
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[0.62rem] leading-none text-muted-foreground">
          {rede}
        </span>
      ) : null}
    </span>
  );
}
