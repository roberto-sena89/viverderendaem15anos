import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { brl } from "@/lib/portfolio";

export type LinhaEvolucao = { mes: string; aplicado: number; ganho: number };

function percentual(ganho: number, aplicado: number) {
  const v = aplicado > 0 ? (ganho / aplicado) * 100 : 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`;
}

export function DetalheEvolucaoMensal({
  aberto,
  onOpenChange,
  dados,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  dados: LinhaEvolucao[];
}) {
  const ultimo = dados[dados.length - 1];
  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhamento mês a mês</DialogTitle>
          <DialogDescription>
            Valor aplicado e ganho de capital acumulados em cada mês do período selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr className="text-left">
                <th scope="col" className="px-3 py-2 font-medium">Mês</th>
                <th scope="col" className="serie-investido rotulo-serie px-3 py-2 text-right">Total investido</th>
                <th scope="col" className="serie-ganho rotulo-serie px-3 py-2 text-right">Ganho de capital</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Variação</th>
                <th scope="col" className="serie-patrimonio rotulo-serie px-3 py-2 text-right">Patrimônio</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((l) => (
                <tr key={l.mes} className="border-t border-border/60">
                  <td className="px-3 py-2">{l.mes}</td>
                  <td className="serie-investido px-3 py-2 text-right font-medium tabular-nums">
                    {brl(l.aplicado, 2)}
                  </td>
                  <td className="serie-ganho px-3 py-2 text-right font-medium tabular-nums">
                    {brl(l.ganho, 2)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{percentual(l.ganho, l.aplicado)}</td>
                  <td className="serie-patrimonio px-3 py-2 text-right font-bold tabular-nums">
                    {brl(l.aplicado + l.ganho, 2)}
                  </td>
                </tr>
              ))}
              {dados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhum dado no período selecionado.
                  </td>
                </tr>
              ) : null}
            </tbody>
            {ultimo ? (
              <tfoot className="sticky bottom-0 bg-muted/80 backdrop-blur">
                <tr className="border-t border-border font-medium">
                  <td className="px-3 py-2">Total atual</td>
                  <td className="px-3 py-2 text-right tabular-nums">{brl(ultimo.aplicado, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{brl(ultimo.ganho, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {percentual(ultimo.ganho, ultimo.aplicado)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {brl(ultimo.aplicado + ultimo.ganho, 2)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
