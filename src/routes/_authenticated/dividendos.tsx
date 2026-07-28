import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  brl,
  carteira,
  dividendos12m,
  dividendosMensais,
  dyCarteira,
  pct,
  valorAtual,
  valorInvestido,
} from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/dividendos")({
  head: () => ({
    meta: [
      { title: "Dividendos · Investidor em 15 Anos" },
      { name: "description", content: "Dividendos mensais e anuais, yield on cost, dividend yield e histórico de proventos." },
      { property: "og:title", content: "Dividendos · Investidor em 15 Anos" },
      { property: "og:description", content: "Acompanhe sua renda passiva mês a mês e o yield on cost da carteira." },
    ],
  }),
  component: DividendosPage,
});

function DividendosPage() {
  const pagadores = carteira.filter((a) => a.dy > 0);
  const investidoPagadores = pagadores.reduce((s, a) => s + valorInvestido(a), 0);
  const yieldOnCost = (dividendos12m / investidoPagadores) * 100;

  return (
    <AppShell title="Dividendos" description="Sua renda passiva em construção">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Dividendos 12m" value={brl(dividendos12m)} />
        <StatCard label="Média mensal" value={brl(dividendos12m / 12)} />
        <StatCard label="Dividend yield" value={pct(dyCarteira)} tone="positive" />
        <StatCard label="Yield on cost" value={pct(yieldOnCost)} tone="positive" />
      </div>

      <div className="surface-card p-6">
        <p className="text-sm font-medium">Calendário de proventos (12 meses)</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dividendosMensais}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(v: number) => brl(v)}
              />
              <Bar dataKey="valor" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">DY</TableHead>
              <TableHead className="text-right">Proventos 12m</TableHead>
              <TableHead className="text-right">Média mensal</TableHead>
              <TableHead className="text-right">Yield on cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagadores.map((a) => {
              const prov = (valorAtual(a) * a.dy) / 100;
              return (
                <TableRow key={a.ticker}>
                  <TableCell className="font-medium">{a.ticker}</TableCell>
                  <TableCell className="text-right">{pct(a.dy)}</TableCell>
                  <TableCell className="text-right">{brl(prov)}</TableCell>
                  <TableCell className="text-right">{brl(prov / 12)}</TableCell>
                  <TableCell className="text-right text-success">{pct((prov / valorInvestido(a)) * 100)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
