import { brl } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

type Item = {
  dataKey?: string | number;
  name?: string;
  value?: number;
  payload?: Record<string, unknown>;
};

type PontoSerie = {
  id?: string;
  rotulo?: string;
  mes?: string;
  patrimonio?: number;
  aportadoAcum?: number;
  aplicado?: number;
  ganho?: number;
};

/** Patrimônio do ponto: campo direto ou soma das séries empilhadas. */
function patrimonioDe(p: PontoSerie) {
  if (typeof p.patrimonio === "number") return p.patrimonio;
  return Number(p.aplicado ?? 0) + Number(p.ganho ?? 0);
}

function chaveDe(p: PontoSerie) {
  return p.id ?? p.rotulo ?? p.mes ?? "";
}

const EXPLICACOES: Record<string, string> = {
  aplicado: "Soma dos aportes: o dinheiro que você efetivamente colocou.",
  aportadoAcum: "Soma dos aportes: o dinheiro que você efetivamente colocou.",
  ganho: "Valorização dos ativos acima do valor aplicado no período.",
  patrimonio: "Valor de mercado da carteira no período.",
  anterior: "Patrimônio do período equivalente anterior, para comparação.",
};

/** Classe de cor padrão de cada série, usada em cards, tabelas e gráficos. */
const CLASSES_SERIE: Record<string, string> = {
  aplicado: "serie-investido",
  aportadoAcum: "serie-investido",
  ganho: "serie-ganho",
  patrimonio: "serie-patrimonio",
};

function pct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

/**
 * Tooltip do gráfico de evolução: período, valores de cada série com explicação,
 * variação percentual e absoluta contra o mês anterior e o ganho acumulado.
 */
export function TooltipEvolucao({
  active,
  payload,
  label,
  rotuloPeriodo = "Período",
  destaque,
  serie,
}: {
  active?: boolean;
  payload?: Item[];
  label?: string;
  rotuloPeriodo?: string;
  destaque?: string | null;
  serie?: PontoSerie[];
}) {
  if (!active || !payload?.length) return null;

  const linha = (payload[0]?.payload ?? {}) as PontoSerie;
  const patrimonio = patrimonioDe(linha);
  const investido = Number(linha.aportadoAcum ?? linha.aplicado ?? 0);
  const ganho = patrimonio - investido;
  const ganhoPct = investido > 0 ? (ganho / investido) * 100 : null;

  const idx = serie?.findIndex((p) => chaveDe(p) === chaveDe(linha)) ?? -1;
  const anteriorMes = idx > 0 ? serie?.[idx - 1] : undefined;
  const baseAntes = anteriorMes ? patrimonioDe(anteriorMes) : 0;
  const deltaAbs = anteriorMes ? patrimonio - baseAntes : null;
  const deltaPct = anteriorMes && baseAntes > 0 ? ((deltaAbs as number) / baseAntes) * 100 : null;

  return (
    <div className="min-w-[16.5rem] rounded-xl border border-border bg-popover/95 p-3 text-[12px] text-popover-foreground shadow-lg backdrop-blur">
      <p className="mb-2 font-semibold">
        {rotuloPeriodo}: <span className="text-muted-foreground">{label}</span>
      </p>

      <ul className="space-y-2">
        {payload.map((p) => {
          const chave = String(p.dataKey ?? "");
          const apagado = destaque && destaque !== chave;
          return (
            <li
              key={chave}
              className={cn(CLASSES_SERIE[chave] ?? "serie-investido", apagado && "opacity-60")}
            >
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

      <div className="mt-2 space-y-1 border-t border-border pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Ganho de capital</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              ganho >= 0 ? "text-serie-ganho" : "text-destructive",
            )}
          >
            {brl(ganho, 2)}
            {ganhoPct !== null ? <span className="ml-1 text-[11px]">({pct(ganhoPct)})</span> : null}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Vs. período anterior</span>
          {deltaAbs === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span
              className={cn(
                "font-semibold tabular-nums",
                deltaAbs >= 0 ? "text-serie-ganho" : "text-destructive",
              )}
            >
              {deltaAbs >= 0 ? "+" : ""}
              {brl(deltaAbs, 2)}
              {deltaPct !== null ? (
                <span className="ml-1 text-[11px]">({pct(deltaPct)})</span>
              ) : null}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 font-semibold">
          <span>Patrimônio no período</span>
          <span className="tabular-nums">{brl(patrimonio, 2)}</span>
        </div>
      </div>
    </div>
  );
}
