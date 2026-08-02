import { brl } from "@/lib/portfolio";

type Item = { dataKey?: string | number; name?: string; value?: number };

const EXPLICACOES: Record<string, string> = {
  aplicado: "Soma dos aportes: o dinheiro que você efetivamente colocou.",
  ganho: "Valorização dos ativos acima do valor aplicado no período.",
};

/**
 * Tooltip do gráfico de evolução: mostra período, valores de cada série,
 * uma explicação curta e o total acumulado da barra.
 */
export function TooltipEvolucao({
  active,
  payload,
  label,
  rotuloPeriodo = "Período",
}: {
  active?: boolean;
  payload?: Item[];
  label?: string;
  rotuloPeriodo?: string;
}) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((acc, p) => acc + (p.value ?? 0), 0);

  return (
    <div className="min-w-[15rem] rounded-xl border border-border bg-popover/95 p-3 text-[12px] text-popover-foreground shadow-lg backdrop-blur">
      <p className="mb-2 font-semibold">
        {rotuloPeriodo}: <span className="text-muted-foreground">{label}</span>
      </p>

      <ul className="space-y-2">
        {payload.map((p) => {
          const chave = String(p.dataKey ?? "");
          return (
            <li key={chave} className={chave === "ganho" ? "serie-ganho" : "serie-aplicado"}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="ponto-legenda" aria-hidden />
                  {p.name}
                </span>
                <span className="font-semibold tabular-nums">{brl(p.value ?? 0, 2)}</span>
              </div>
              {EXPLICACOES[chave] ? (
                <p className="mt-0.5 pl-4 text-[11px] leading-snug text-muted-foreground">
                  {EXPLICACOES[chave]}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2 font-semibold">
        <span>Patrimônio no período</span>
        <span className="tabular-nums">{brl(total, 2)}</span>
      </div>
    </div>
  );
}
