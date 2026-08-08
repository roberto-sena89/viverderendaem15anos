import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DollarSign, Eraser } from "lucide-react";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { DialogAlocacaoAlvo } from "@/components/dialog-alocacao-alvo";
import { DialogAporteMensal } from "@/components/dialog-aporte-mensal";
import { RebalanceamentoSugerido } from "@/components/rebalanceamento-sugerido";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAtivosAoVivo } from "@/lib/cotacoes-tempo-real";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { corClasse } from "@/lib/cores-ativos";
import { formatarNumeroBR, numeroBR } from "@/lib/formato-numero";
import { brl, classeDoAtivo, pct, resumoCarteira, valorAtual } from "@/lib/portfolio";
import { urlAbsoluta } from "@/lib/seo";

const ATALHOS_APORTE = [500, 1000, 2000, 5000];
const MAX_APORTE = 10_000_000;

export const Route = createFileRoute("/_authenticated/rebalanceamento")({
  head: () => ({
    meta: [
      { title: "Rebalanceamento · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Compare a alocação atual com a estratégia ideal e veja quanto aportar em cada classe de ativo.",
      },
      { property: "og:title", content: "Rebalanceamento · Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Semáforo de alocação e valores exatos para rebalancear sua carteira.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: urlAbsoluta("/rebalanceamento") }],
  }),
  component: Rebalanceamento,
});

function Rebalanceamento() {
  const { data: carteira = [] } = useAtivosAoVivo();
  const { totalAtual } = resumoCarteira(carteira);
  const { alvo: alocacaoIdeal } = useAlocacaoAlvo();
  const [textoAporte, setTextoAporte] = useState("");

  const aporte = Math.min(Math.max(numeroBR(textoAporte), 0), MAX_APORTE);
  const futuro = totalAtual + aporte;

  // Soma o valor atual por classe. Classes presentes na carteira mas ausentes
  // da alocação-alvo também entram na tabela (alvo 0%), para que a análise
  // reflita exatamente a aba "Carteira" a cada aporte/edição.
  const atual: Record<string, number> = {};
  for (const chave of Object.keys(alocacaoIdeal)) atual[chave] = 0;
  for (const a of carteira) {
    const classe = classeDoAtivo(a);
    atual[classe] = (atual[classe] ?? 0) + valorAtual(a);
  }

  const linhas = Object.keys(atual).map((classe) => {
    const idealPct = alocacaoIdeal[classe] ?? 0;
    const valor = atual[classe] ?? 0;
    const atualPct = totalAtual > 0 ? (valor / totalAtual) * 100 : 0;
    const idealValor = (futuro * idealPct) / 100;

    const diff = atualPct - idealPct;
    // Desvio relativo ao alvo da classe: 15% acima/abaixo do ideal = desbalanceado
    const desvioRelativo = idealPct > 0 ? Math.abs(diff / idealPct) * 100 : 0;
    const semPosicao = valor <= 0 && idealPct <= 0;
    const status = semPosicao ? "cinza" : desvioRelativo >= 15 ? "vermelho" : "verde";
    return { classe, idealPct, atualPct, valor, idealValor, diff, status };
  });

  return (
    <AppShell title="Rebalanceamento" description="Estratégia por classes de ativos">
      <AbasCarteira />

      <div className="grid gap-2 [&>button]:w-full sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:[&>button]:w-auto">
        <DialogAporteMensal carteira={carteira} />
        <DialogAlocacaoAlvo />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
        <DollarSign className="size-4! shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            aria-label="Aporte para incluir no plano"
            inputMode="decimal"
            placeholder="Aporte do mês (R$)"
            value={textoAporte}
            onChange={(e) => setTextoAporte(e.target.value)}
            className="h-9 w-40 text-right text-sm font-semibold tabular-nums"
          />
          <span className="text-xs text-muted-foreground" data-testid="resumo-futuro">
            {aporte > 0 ? (
              <>
                Carteira{" "}
                <strong className="num font-semibold text-foreground">{brl(totalAtual, 2)}</strong>{" "}
                → <strong className="num font-semibold text-foreground">{brl(futuro, 2)}</strong>{" "}
                com o aporte de{" "}
                <strong className="num font-semibold text-primary">{brl(aporte, 2)}</strong>
              </>
            ) : (
              <>Sem aporte informado — valores pelo patrimônio atual</>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ATALHOS_APORTE.map((v) => (
            <Button
              key={v}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs tabular-nums"
              onClick={() => setTextoAporte(formatarNumeroBR(Math.min(aporte + v, MAX_APORTE)))}
            >
              {brl(v)}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 border border-border px-2.5 text-xs"
            disabled={aporte === 0}
            onClick={() => setTextoAporte("")}
          >
            <Eraser className="size-3.5" />
            Zerar
          </Button>
        </div>
      </div>

      <RebalanceamentoSugerido carteira={carteira} aporte={aporte} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {linhas.map((l) => (
          <div
            key={l.classe}
            className="surface-card min-w-0 p-5"
            style={{ borderLeft: `4px solid ${corClasse(l.classe)}` }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2 font-medium break-words whitespace-pre-line">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: corClasse(l.classe) }}
                />
                {l.classe}
              </p>
              <Badge
                className={
                  l.status === "cinza"
                    ? "bg-muted text-muted-foreground font-semibold tracking-wide"
                    : l.status === "verde"
                      ? "bg-success text-success-foreground font-semibold tracking-wide"
                      : "bg-destructive text-destructive-foreground font-semibold tracking-wide"
                }
              >
                {l.status === "cinza"
                  ? "SEM APORTE"
                  : l.status === "verde"
                    ? "IDEAL"
                    : "DESBALANCEADO"}
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
            <Progress
              aria-label={`Progresso da alocação de ${l.classe}`}
              value={l.idealPct > 0 ? Math.min(100, (l.atualPct / l.idealPct) * 100) : 0}
              className="mt-3 h-2"
            />
          </div>
        ))}
      </div>

      {/* Mobile: cartões alinhados à largura da tela */}
      <div className="grid gap-3 md:hidden">
        {linhas.map((l) => (
          <div key={l.classe} className="surface-card p-4">
            <div className="flex min-w-0 items-start gap-2">
              <span
                className="mt-1.5 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: corClasse(l.classe) }}
              />
              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{l.classe}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div className="min-w-0">
                <p className="text-muted-foreground">Alocação atual (R$)</p>
                <p className="font-semibold tabular-nums">{brl(l.valor)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Alocação atual (%)</p>
                <p className="font-semibold tabular-nums">{pct(l.atualPct)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Alocação ideal (%)</p>
                <p className="font-semibold tabular-nums">{pct(l.idealPct)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Diferença (%)</p>
                <p
                  className={`font-semibold tabular-nums ${
                    l.diff > 0
                      ? "text-success"
                      : l.diff < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {l.diff > 0 ? `+${pct(l.diff)}` : pct(l.diff)}
                </p>
              </div>
              <div className="col-span-2 min-w-0 border-t border-border pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Valor para rebalancear</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      l.valor > l.idealValor
                        ? "text-success"
                        : l.valor < l.idealValor
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {brl(Math.abs(l.idealValor - l.valor))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="surface-card hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">
                {"CLASSE\n "}
              </TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">
                {"ALOCAÇÃO ATUAL\n(R$)"}
              </TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">
                {"ALOCAÇÃO ATUAL\n(%)"}
              </TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">
                {"ALOCAÇÃO IDEAL\n(%)"}
              </TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">
                {"DIFERENÇA\n(%)"}
              </TableHead>
              <TableHead className="text-center align-middle whitespace-pre-line h-14">
                {"VALOR PARA\nREBALANCEAR"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.classe}>
                <TableCell className="font-medium whitespace-pre-line text-center">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: corClasse(l.classe) }}
                    />
                    {l.classe}
                  </span>
                </TableCell>
                <TableCell className="text-center">{brl(l.valor)}</TableCell>
                <TableCell className="text-center">{pct(l.atualPct)}</TableCell>
                <TableCell className="text-center">{pct(l.idealPct)}</TableCell>
                <TableCell
                  className={`text-center font-semibold ${
                    l.diff > 0
                      ? "text-success"
                      : l.diff < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {l.diff > 0 ? `+${pct(l.diff)}` : pct(l.diff)}
                </TableCell>
                <TableCell
                  className={`text-center font-semibold ${
                    l.valor > l.idealValor
                      ? "text-success"
                      : l.valor < l.idealValor
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {brl(Math.abs(l.idealValor - l.valor))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
