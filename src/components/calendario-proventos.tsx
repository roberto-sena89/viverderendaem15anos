import { useMemo } from "react";
import { CalendarDays, Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAtivos, useDividendos } from "@/lib/data";
import { projetarProventos, rotuloMes } from "@/lib/proventos-futuros";
import { brl } from "@/lib/portfolio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Calendário de proventos futuros dos próximos 12 meses (projeção). */
export function CalendarioProventos() {
  const { data: ativos = [] } = useAtivos();
  const { data: dividendos = [] } = useDividendos();

  const calendario = useMemo(() => projetarProventos(ativos, dividendos), [ativos, dividendos]);

  const dadosGrafico = calendario.meses.map((m) => ({
    mes: rotuloMes(m.mes),
    total: m.total,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Proventos nos próximos 12 meses</CardDescription>
            <CardTitle className="text-2xl">{brl(calendario.totalAnual)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Média mensal estimada</CardDescription>
            <CardTitle className="text-2xl">{brl(calendario.totalMensalMedio)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ativos com histórico</CardDescription>
            <CardTitle className="text-2xl">{calendario.porAtivo.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-primary" />
            Projeção mês a mês
          </CardTitle>
          <CardDescription>
            Estimativa baseada na média dos proventos recebidos nos últimos 12 meses × posição
            atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dadosGrafico.every((d) => d.total === 0) ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Sem histórico de proventos para projetar. Registre dividendos para ver a projeção.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => brl(Number(v)).replace(",00", "")}
                    width={70}
                  />
                  <Tooltip formatter={(v) => brl(Number(v))} labelFormatter={(l) => `Mês: ${l}`} />
                  <Bar
                    dataKey="total"
                    fill="var(--color-chart-1)"
                    radius={[4, 4, 0, 0]}
                    name="Proventos"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {calendario.porAtivo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por ativo (média mensal)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {calendario.porAtivo.slice(0, 12).map((a) => (
              <div
                key={a.ticker}
                className="flex items-center justify-between border-b border-border/40 py-1.5 text-sm last:border-0"
              >
                <span className="font-medium">{a.ticker}</span>
                <span className="text-muted-foreground">{a.categoria}</span>
                <span className="tabular-nums">{brl(a.mediaMensal)}/mês</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {calendario.ativosSemHistorico.length > 0 && (
        <Alert>
          <Info className="size-4" />
          <AlertTitle>Sem histórico de proventos</AlertTitle>
          <AlertDescription>
            {calendario.ativosSemHistorico.join(", ")} — posições que não pagaram nos últimos 12
            meses; não incluídas na projeção.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
