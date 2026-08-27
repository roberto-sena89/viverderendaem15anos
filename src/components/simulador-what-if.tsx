import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Flame,
  Pause,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAtivos, usePlano } from "@/lib/data";
import { simularQuebra, type ResultadoQuebra } from "@/lib/what-if";
import { brl, planoPadrao, projetar, resumoCarteira, type PlanoConfig } from "@/lib/portfolio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  pause: Pause,
  flame: Flame,
  calendar: Calendar,
  target: Target,
};

interface CartaoCenarioProps {
  resultado: ResultadoQuebra;

  selecionado: boolean;
  onClick: () => void;
}

function CartaoCenario({ resultado, selecionado, onClick }: CartaoCenarioProps) {
  const Icone = ICONES[resultado.cenario.icone] ?? TrendingUp;
  const cor =
    resultado.deltaAnos != null
      ? resultado.deltaAnos <= 0
        ? "text-primary"
        : "text-destructive"
      : "text-muted-foreground";
  const corBorda = selecionado ? "border-primary" : "border-border/60";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border-2 bg-card px-4 py-3 text-left transition-all hover:border-primary/50",
        corBorda,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icone className={cn("size-4 shrink-0", cor)} />
          <span className="text-sm font-medium">{resultado.cenario.rotulo}</span>
        </div>
        <Badge
          variant={resultado.deltaAnos != null && resultado.deltaAnos <= 0 ? "default" : "outline"}
          className="shrink-0 text-[10px]"
        >
          {resultado.deltaAnos != null
            ? resultado.deltaAnos <= 0
              ? `-${Math.abs(resultado.deltaAnos)} anos`
              : `+${resultado.deltaAnos} anos`
            : "—"}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{resultado.cenario.descricao}</p>
      <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
        {/* <span>Patrimônio: {brl(resultado.patrimonioFinal)}</span> */}
        {resultado.anoIndependencia && <span>Independência: {resultado.anoIndependencia}</span>}
      </div>
    </button>
  );
}

/** Simulador "E se?" — cenários de quebra-hipótese. */
export function SimuladorWhatIf() {
  const { data: carteira = [] } = useAtivos();
  const { data: plano } = usePlano();
  const { totalAtual } = resumoCarteira(carteira);
  const [objetivoRenda, setObjetivoRenda] = useState(25_000);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const planoCompleto: PlanoConfig & { patrimonioAtual: number } = {
    ...(plano ?? planoPadrao),
    patrimonioAtual: totalAtual,
  };

  const { base, cenarios } = useMemo(
    () => simularQuebra(planoCompleto, objetivoRenda),
    [planoCompleto, objetivoRenda],
  );

  const selecionadoResultado = cenarios.find((c) => c.cenario.id === selecionado) ?? cenarios[0];
  const dadosGrafico = useMemo(() => {
    if (!selecionadoResultado) return [];
    // Adiciona o plano base como referência
    const baseLinhas = projetar(planoCompleto);
    return selecionadoResultado.linhas.map((l, i) => ({
      ano: l.ano,
      [selecionadoResultado.cenario.rotulo]: l.patrimonio,
      "Plano atual": baseLinhas[i]?.patrimonio ?? 0,
    }));
  }, [selecionadoResultado, planoCompleto]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Renda mensal desejada:</span>
        <input
          type="number"
          className="h-8 w-28 rounded border border-border/60 bg-background px-2 text-sm"
          value={objetivoRenda}
          onChange={(e) => setObjetivoRenda(Number(e.target.value) || 0)}
          step={1000}
          min={1000}
        />
        <span className="text-xs text-muted-foreground">
          Base:{" "}
          {base.anoIndependencia
            ? `independência em ${base.anoIndependencia}`
            : "não atinge a meta"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {cenarios
          .filter((c) => c.deltaAnos !== null)
          .sort((a, b) => (a.deltaAnos ?? 0) - (b.deltaAnos ?? 0))
          .slice(0, 6)
          .map((r) => (
            <CartaoCenario
              key={r.cenario.id}
              resultado={r}
              selecionado={selecionado === r.cenario.id}
              onClick={() => setSelecionado(r.cenario.id)}
            />
          ))}
      </div>

      {selecionadoResultado && dadosGrafico.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {selecionadoResultado.cenario.rotulo} vs. Plano atual
            </CardTitle>
            <CardDescription className="text-xs">
              {selecionadoResultado.cenario.descricao}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => (v / 1_000_000).toFixed(1) + "M"}
                    width={60}
                  />
                  <Tooltip formatter={(v) => brl(Number(v))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey={selecionadoResultado.cenario.rotulo}
                    stroke="var(--color-chart-1)"
                    fill="var(--color-chart-1)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Plano atual"
                    stroke="var(--color-chart-3)"
                    fill="var(--color-chart-3)"
                    fillOpacity={0.08}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
