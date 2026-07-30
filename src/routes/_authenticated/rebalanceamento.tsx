import { createFileRoute } from "@tanstack/react-router";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { DialogAlocacaoAlvo } from "@/components/dialog-alocacao-alvo";
import { DialogAporteMensal } from "@/components/dialog-aporte-mensal";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAtivos } from "@/lib/data";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { corClasse } from "@/lib/cores-ativos";
import { brl, classeDoAtivo, pct, resumoCarteira, valorAtual } from "@/lib/portfolio";


export const Route = createFileRoute("/_authenticated/rebalanceamento")({
  head: () => ({
    meta: [
      { title: "Análise · Investidor em 15 Anos" },
      { name: "description", content: "Compare a alocação atual com a estratégia ideal e veja quanto aportar em cada classe de ativo." },
      { property: "og:title", content: "Análise · Investidor em 15 Anos" },
      { property: "og:description", content: "Semáforo de alocação e valores exatos para rebalancear sua carteira." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/rebalanceamento" }],
  }),
  component: Rebalanceamento,
});

function Rebalanceamento() {
  const { data: carteira = [] } = useAtivos();
  const { totalAtual } = resumoCarteira(carteira);
  const { alvo: alocacaoIdeal } = useAlocacaoAlvo();

  const atual: Record<string, number> = {};
  for (const chave of Object.keys(alocacaoIdeal)) atual[chave] = 0;
  for (const a of carteira) {
    const classe = classeDoAtivo(a);
    atual[classe] = (atual[classe] ?? 0) + valorAtual(a);
  }


  const linhas = Object.entries(alocacaoIdeal).map(([classe, idealPct]) => {
    const valor = atual[classe] ?? 0;
    const atualPct = totalAtual > 0 ? (valor / totalAtual) * 100 : 0;
    const idealValor = (totalAtual * idealPct) / 100;

    const diff = atualPct - idealPct;
    // Desvio relativo ao alvo da classe: 15% acima/abaixo do ideal = desbalanceado
    const desvioRelativo = idealPct > 0 ? Math.abs(diff / idealPct) * 100 : 0;
    const status = desvioRelativo >= 15 ? "vermelho" : "verde";
    return { classe, idealPct, atualPct, valor, idealValor, diff, status };
  });

  return (
    <AppShell title="Análise" description="Estratégia por classes de ativos">
      <AbasCarteira />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DialogAporteMensal carteira={carteira} />
        <DialogAlocacaoAlvo />
      </div>



      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {linhas.map((l) => (
          <div
            key={l.classe}
            className="surface-card p-5"
            style={{ borderLeft: `4px solid ${corClasse(l.classe)}` }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-medium whitespace-pre-line">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: corClasse(l.classe) }} />
                {l.classe}
              </p>
              <Badge
                className={
                  l.status === "verde"
                    ? "bg-success text-success-foreground font-semibold tracking-wide"
                    : "bg-destructive text-destructive-foreground font-semibold tracking-wide"
                }
              >
                {l.status === "verde" ? "IDEAL" : "DESBALANCEADO"}
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
            <Progress aria-label={`Progresso da alocação de ${l.classe}`} value={l.idealPct > 0 ? Math.min(100, (l.atualPct / l.idealPct) * 100) : 0} className="mt-3 h-2" />
          </div>
        ))}
      </div>

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">{"CLASSE\n "}</TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">{"ALOCAÇÃO ATUAL\n(R$)"}</TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">{"ALOCAÇÃO ATUAL\n(%)"}</TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">{"ALOCAÇÃO IDEAL\n(%)"}</TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">{"DIFERENÇA\n(%)"}</TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">{"VALOR PARA\nREBALANCEAR"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.classe}>
                <TableCell className="font-medium whitespace-pre-line text-center">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: corClasse(l.classe) }} />
                    {l.classe}
                  </span>
                </TableCell>
                <TableCell className="text-center">{brl(l.valor)}</TableCell>
                <TableCell className="text-center">{pct(l.atualPct)}</TableCell>
                <TableCell className="text-center">{pct(l.idealPct)}</TableCell>
                <TableCell
                  className={`text-center font-semibold ${
                    l.diff > 0 ? "text-success" : l.diff < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {l.diff > 0 ? `+${pct(l.diff)}` : pct(l.diff)}
                </TableCell>
                <TableCell className="text-center">{brl(Math.abs(l.idealValor - l.valor))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
