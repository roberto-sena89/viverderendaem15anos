import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAtivos, usePlano } from "@/lib/data";
import { compararEstrategias, rankearEstrategias } from "@/lib/comparador-estrategias";
import { brl, planoPadrao, resumoCarteira, type PlanoConfig } from "@/lib/portfolio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Comparador de estratégias — mesmo plano, alocações diferentes. */
export function ComparadorEstrategias() {
  const { data: carteira = [] } = useAtivos();
  const { data: plano } = usePlano();
  const { totalAtual } = resumoCarteira(carteira);
  const [objetivoRenda, setObjetivoRenda] = useState(25_000);
  const [comparar, setComparar] = useState<string[]>(["conservador", "moderado", "agressivo"]);

  const planoCompleto: PlanoConfig & { patrimonioAtual: number } = {
    ...(plano ?? planoPadrao),
    patrimonioAtual: totalAtual,
  };

  const comparacao = useMemo(
    () => compararEstrategias(planoCompleto, objetivoRenda),
    [planoCompleto, objetivoRenda],
  );

  const rankeado = useMemo(() => rankearEstrategias(comparacao.resultados), [comparacao]);

  const dadosGrafico = useMemo(() => {
    const anos = new Set<number>();
    comparacao.resultados.forEach((r) => r.linhas.forEach((l) => anos.add(l.ano)));
    return [...anos]
      .sort((a, b) => a - b)
      .map((ano) => {
        const ponto: Record<string, number | string> = { ano };
        comparacao.resultados.forEach((r) => {
          if (!comparar.includes(r.estrategia.id)) return;
          const linha = r.linhas.find((l) => l.ano === ano);
          if (linha) ponto[r.estrategia.rotulo] = Math.round(linha.patrimonio);
        });
        return ponto;
      });
  }, [comparacao, comparar]);

  const toggle = (id: string) => {
    setComparar((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

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
      </div>

      {/* Seletor de estratégias */}
      <div className="flex flex-wrap gap-2">
        {comparacao.resultados.map((r) => (
          <button
            key={r.estrategia.id}
            type="button"
            onClick={() => toggle(r.estrategia.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              comparar.includes(r.estrategia.id)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/40",
            )}
          >
            {r.estrategia.rotulo}
          </button>
        ))}
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução do patrimônio por estratégia</CardTitle>
          <CardDescription className="text-xs">
            Mesmo plano de aportes — varia apenas a alocação (rentabilidade).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => (v / 1_000_000).toFixed(1) + "M"}
                  width={60}
                />
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Legend />
                {comparacao.resultados
                  .filter((r) => comparar.includes(r.estrategia.id))
                  .map((r) => (
                    <Line
                      key={r.estrategia.id}
                      type="monotone"
                      dataKey={r.estrategia.rotulo}
                      stroke={r.estrategia.cor}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela comparativa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="size-4 text-amber-500" />
            Ranking — quem chega primeiro à independência?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Estratégia</TableHead>
                <TableHead className="text-right">Retorno</TableHead>
                <TableHead className="text-right">Independência</TableHead>
                <TableHead className="text-right">Patrimônio final</TableHead>
                <TableHead className="text-right">Renda passiva/mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankeado.map((r, i) => (
                <TableRow key={r.estrategia.id} className={i === 0 ? "bg-primary/5" : undefined}>
                  <TableCell>
                    {i === 0 ? (
                      <Trophy className="size-4 text-amber-500" />
                    ) : (
                      <span className="text-muted-foreground">{i + 1}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: r.estrategia.cor }}
                      />
                      <span className="font-medium">{r.estrategia.rotulo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.estrategia.rentabilidadeAnual}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.anoIndependencia ? (
                      <Badge variant={i === 0 ? "default" : "outline"} className="text-[10px]">
                        {r.anoIndependencia} ({r.idadeIndependencia} anos)
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Não atinge</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(r.patrimonioRealFinal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(r.rendaPassivaMensal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
