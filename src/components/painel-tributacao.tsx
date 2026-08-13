import { useMemo } from "react";
import { FileCheck2, Landmark, Scale } from "lucide-react";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apurarIR } from "@/lib/tributacao";
import { brl } from "@/lib/portfolio";
import type { Aporte } from "@/lib/portfolio";

const mesRotulo = (chave: string) => {
  const [ano, mes] = chave.split("-").map(Number);
  const nomes = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${nomes[mes - 1] ?? mes}/${ano}`;
};

const dataCurta = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

export function PainelTributacao({ aportes }: { aportes: Aporte[] }) {
  const { linhas, totalIR, totalVendas, totalGanho } = useMemo(() => apurarIR(aportes), [aportes]);
  const apuradas = linhas.filter((l) => l.vendasBrutas > 0);
  const darf = apuradas.filter((l) => l.precisaDarf);
  const totalDarf = darf.reduce((s, l) => s + l.ir, 0);

  return (
    <Panel
      title="IR / DARF sobre vendas (swing trade)"
      hint="Apuração simplificada, não substitui a declaração"
    >
      {apuradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <Scale className="size-10 text-muted-foreground" />
          <p className="font-display text-base font-semibold">Nenhuma venda lançada</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Vendas com quantidade negativa nesta página alimentam a apuração de ganho de capital.
            Ações ficam isentas até R$ 20 mil de vendas no mês; criptos até R$ 35 mil; FIIs têm
            alíquota de 20%.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Resumo
              rotulo="IR devido nos DARFs"
              valor={brl(totalDarf, 2)}
              dica={`${darf.length} DARF${darf.length === 1 ? "" : "s"} a pagar`}
            />
            <Resumo rotulo="Total de IR apurado" valor={brl(totalIR, 2)} />
            <Resumo rotulo="Vendas no período" valor={brl(totalVendas, 2)} />
            <Resumo
              rotulo={totalGanho >= 0 ? "Ganho líquido de vendas" : "Prejuízo acumulado em vendas"}
              valor={brl(totalGanho, 2)}
              positivo={totalGanho >= 0}
            />
          </div>

          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <FileCheck2 className="mt-px size-4! shrink-0" />
            <span>
              A apuração é mensal: compensa prejuízos anteriores dentro da mesma regra e aplica a
              isenção por volume de vendas (Ações ≤ R$ 20 mil e criptos ≤ R$ 35 mil no mês).
              Prejuízo acumula para abater ganhos futuros.
            </span>
          </p>

          <div className="mt-4 overflow-x-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Mês</TableHead>
                  <TableHead className="min-w-[10rem]">Regra</TableHead>
                  <TableHead className="w-24 text-right">Vendas</TableHead>
                  <TableHead className="w-24 text-right">Ganho</TableHead>
                  <TableHead className="w-20 text-center">Isenção</TableHead>
                  <TableHead className="w-24 text-right">Prej. comp.</TableHead>
                  <TableHead className="w-24 text-right">Base IR</TableHead>
                  <TableHead className="w-28 text-right">IR (R$)</TableHead>
                  <TableHead className="w-20 text-center">DARF</TableHead>
                  <TableHead className="w-24 text-right">Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apuradas.map((l) => (
                  <TableRow key={`${l.mes}-${l.regra}`}>
                    <TableCell className="text-xs font-semibold">{mesRotulo(l.mes)}</TableCell>
                    <TableCell className="truncate text-xs">{l.rotulo}</TableCell>
                    <TableCell className="num text-right text-xs">
                      {brl(l.vendasBrutas, 2)}
                    </TableCell>
                    <TableCell
                      className={`num text-right text-xs ${l.ganhoBruto >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {brl(l.ganhoBruto, 2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {l.isencaoAplicada ? (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                          Sim
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="num text-right text-xs text-muted-foreground">
                      {l.prejuizoCompensado > 0 ? `-${brl(l.prejuizoCompensado, 2)}` : "—"}
                    </TableCell>
                    <TableCell className="num text-right text-xs">
                      {brl(l.ganhoTributavel, 2)}
                    </TableCell>
                    <TableCell
                      className={`num text-right text-sm font-semibold ${l.ir > 0 ? "text-destructive" : ""}`}
                    >
                      {brl(l.ir, 2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {l.precisaDarf ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                          <Landmark className="size-3" />
                          {l.codigoDarf}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {l.precisaDarf ? dataCurta(l.vencimento) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FileCheck2 className="size-4" />
            {darf.length > 0 ? (
              <>
                Pague os DARFs até o vencimento (último dia útil do mês seguinte). Consulte o seu
                contador.
              </>
            ) : (
              <>
                Sem DARFs a pagar no período — isenção por volume de vendas ou ausência de ganho
                tributável.
              </>
            )}
          </p>
        </>
      )}
    </Panel>
  );
}

function Resumo({
  rotulo,
  valor,
  positivo = true,
  dica,
}: {
  rotulo: string;
  valor: string;
  positivo?: boolean;
  dica?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </p>
      <p
        className={`mt-1 font-display text-xl font-bold ${positivo ? "text-foreground" : "text-destructive"}`}
      >
        {valor}
      </p>
      {dica ? <p className="mt-0.5 text-xs text-muted-foreground">{dica}</p> : null}
    </div>
  );
}
