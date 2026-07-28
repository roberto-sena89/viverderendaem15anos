import { createFileRoute } from "@tanstack/react-router";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAtivos } from "@/lib/data";
import { alocacaoIdeal, brl, classeDoAtivo, pct, resumoCarteira, valorAtual } from "@/lib/portfolio";


export const Route = createFileRoute("/_authenticated/rebalanceamento")({
  head: () => ({
    meta: [
      { title: "Rebalanceamento · Investidor em 15 Anos" },
      { name: "description", content: "Compare a alocação atual com a estratégia ideal e veja quanto aportar em cada classe de ativo." },
      { property: "og:title", content: "Rebalanceamento · Investidor em 15 Anos" },
      { property: "og:description", content: "Semáforo de alocação e valores exatos para rebalancear sua carteira." },
    ],
  }),
  component: Rebalanceamento,
});

function Rebalanceamento() {
  const { data: carteira = [] } = useAtivos();
  const { totalAtual } = resumoCarteira(carteira);

  const atual: Record<string, number> = {};
  for (const chave of Object.keys(alocacaoIdeal)) atual[chave] = 0;
  for (const a of carteira) atual[classeDoAtivo(a)] += valorAtual(a);

  const linhas = Object.entries(alocacaoIdeal).map(([classe, idealPct]) => {
    const valor = atual[classe] ?? 0;
    const atualPct = totalAtual > 0 ? (valor / totalAtual) * 100 : 0;
    const idealValor = (totalAtual * idealPct) / 100;

    const diff = atualPct - idealPct;
    const status = Math.abs(diff) <= 2 ? "verde" : Math.abs(diff) <= 5 ? "amarelo" : "vermelho";
    return { classe, idealPct, atualPct, valor, idealValor, diff, status };
  });

  return (
    <AppShell title="Rebalanceamento" description="Estratégia por classes de ativos">
      <AbasCarteira />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {linhas.map((l) => (
          <div key={l.classe} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <p className="font-medium">{l.classe}</p>
              <Badge
                className={
                  l.status === "verde"
                    ? "bg-success text-success-foreground"
                    : l.status === "amarelo"
                      ? "bg-warning text-warning-foreground"
                      : "bg-destructive text-destructive-foreground"
                }
              >
                {l.status === "verde" ? "Equilibrado" : l.status === "amarelo" ? "Atenção" : "Desbalanceado"}
              </Badge>
            </div>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Atual</span>
                <span className="font-medium text-foreground">
                  {pct(l.atualPct)} · {brl(l.valor)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ideal</span>
                <span className="font-medium text-foreground">
                  {pct(l.idealPct)} · {brl(l.idealValor)}
                </span>
              </div>
            </div>
            <Progress value={Math.min(100, (l.atualPct / l.idealPct) * 100)} className="mt-3 h-2" />
            <p className={`mt-3 text-sm font-medium ${l.diff < 0 ? "text-success" : "text-destructive"}`}>
              {l.diff < 0 ? `Aportar ${brl(l.idealValor - l.valor)}` : `Reduzir ${brl(l.valor - l.idealValor)}`}
            </p>
          </div>
        ))}
      </div>

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Classe</TableHead>
              <TableHead className="text-right">Alocação atual</TableHead>
              <TableHead className="text-right">Alocação ideal</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead className="text-right">Valor para rebalancear</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.classe}>
                <TableCell className="font-medium">{l.classe}</TableCell>
                <TableCell className="text-right">{pct(l.atualPct)}</TableCell>
                <TableCell className="text-right">{pct(l.idealPct)}</TableCell>
                <TableCell className={`text-right ${l.diff < 0 ? "text-success" : "text-destructive"}`}>{pct(l.diff)}</TableCell>
                <TableCell className="text-right">{brl(Math.abs(l.idealValor - l.valor))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
