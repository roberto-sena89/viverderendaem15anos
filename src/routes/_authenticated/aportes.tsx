import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { DialogTransacao } from "@/components/dialog-transacao";
import { GraficoEvolucaoPatrimonio } from "@/components/grafico-evolucao-patrimonio";
import { HistoricoMensalAportes } from "@/components/historico-mensal-aportes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAportes, useExcluirAporte } from "@/lib/data";
import { brl } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/aportes")({
  head: () => ({
    meta: [
      { title: "Patrimônio · Investidor em 15 Anos" },
      { name: "description", content: "Registre e acompanhe todos os seus aportes por data, corretora, ativo, quantidade e taxas." },
      { property: "og:title", content: "Patrimônio · Investidor em 15 Anos" },
      { property: "og:description", content: "Histórico completo de aportes da sua carteira de investimentos." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/aportes" }],
  }),
  component: AportesPage,
});

function AportesPage() {
  const { data: aportes = [], isLoading } = useAportes();
  const excluir = useExcluirAporte();

  const mesRef = aportes[0]?.data.slice(0, 7) ?? "";
  const totalMes = aportes
    .filter((a) => a.data.startsWith(mesRef))
    .reduce((s, a) => s + a.quantidade * a.preco + a.taxas, 0);


  return (
    <AppShell title="Patrimônio" description={`Último mês registrado: ${brl(totalMes)}`}>
      <AbasCarteira />




      <GraficoEvolucaoPatrimonio />

      <HistoricoMensalAportes />

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Corretora</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Taxas</TableHead>
              <TableHead className="text-right">VALOR APLICADO</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {aportes.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{new Date(`${a.data}T12:00`).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-muted-foreground">{a.corretora || "—"}</TableCell>
                <TableCell className="font-medium">{a.ticker}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{a.categoria}</Badge>
                </TableCell>
                <TableCell className="text-right">{a.quantidade.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">{brl(a.preco, 2)}</TableCell>
                <TableCell className="text-right">{brl(a.taxas, 2)}</TableCell>
                <TableCell className="text-right font-medium">{brl(a.quantidade * a.preco + a.taxas)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <DialogTransacao aporte={a}>
                      <Button size="icon" variant="ghost" aria-label={`Editar transação ${a.ticker}`}>
                        <Pencil className="size-8!" />
                      </Button>
                    </DialogTransacao>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Excluir transação ${a.ticker}`}
                      disabled={excluir.isPending}
                      onClick={() => {
                        if (!confirm(`Excluir a transação de ${a.ticker}? A posição do ativo será recalculada.`)) return;
                        excluir.mutate(a.id, {
                          onSuccess: () => toast.success("Transação excluída e totais recalculados."),
                          onError: () => toast.error("Não foi possível excluir."),
                        });
                      }}
                    >
                      <Trash2 className="size-8! text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && aportes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum aporte registrado ainda.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
