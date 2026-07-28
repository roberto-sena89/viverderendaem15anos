import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAportes, useCriarAporte, useExcluir } from "@/lib/data";
import { brl, categorias, type Categoria } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/aportes")({
  head: () => ({
    meta: [
      { title: "Aportes · Investidor em 15 Anos" },
      { name: "description", content: "Registre e acompanhe todos os seus aportes por data, corretora, ativo, quantidade e taxas." },
      { property: "og:title", content: "Aportes · Investidor em 15 Anos" },
      { property: "og:description", content: "Histórico completo de aportes da sua carteira de investimentos." },
    ],
  }),
  component: AportesPage,
});

function AportesPage() {
  const [open, setOpen] = useState(false);
  const { data: aportes = [], isLoading } = useAportes();
  const criar = useCriarAporte();
  const excluir = useExcluir("aportes");

  const mesRef = aportes[0]?.data.slice(0, 7) ?? "";
  const totalMes = aportes
    .filter((a) => a.data.startsWith(mesRef))
    .reduce((s, a) => s + a.quantidade * a.preco + a.taxas, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const novo = {
      data: String(form.get("data")),
      corretora: String(form.get("corretora") || ""),
      ticker: String(form.get("ticker")).toUpperCase(),
      categoria: String(form.get("categoria")) as Categoria,
      quantidade: Number(form.get("quantidade")),
      preco: Number(form.get("preco")),
      taxas: Number(form.get("taxas") || 0),
      observacoes: String(form.get("observacoes") || ""),
    };
    if (!novo.data || !novo.ticker || !novo.quantidade || !novo.preco) {
      toast.error("Preencha data, ativo, quantidade e preço.");
      return;
    }
    try {
      await criar.mutateAsync(novo);
      setOpen(false);
      toast.success(`Aporte em ${novo.ticker} registrado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o aporte.");
    }
  }

  return (
    <AppShell title="Aportes" description={`Último mês registrado: ${brl(totalMes)}`}>
      <AbasCarteira />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Novo aporte
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo aporte</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="data">Data</Label>
                <Input id="data" name="data" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="corretora">Corretora</Label>
                <Input id="corretora" name="corretora" placeholder="BTG Pactual" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ticker">Ativo</Label>
                <Input id="ticker" name="ticker" placeholder="BOVA11" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="categoria">Categoria</Label>
                <select
                  id="categoria"
                  name="categoria"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input id="quantidade" name="quantidade" type="number" step="any" min="0" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preco">Preço</Label>
                <Input id="preco" name="preco" type="number" step="any" min="0" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taxas">Taxas</Label>
                <Input id="taxas" name="taxas" type="number" step="any" min="0" defaultValue={0} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea id="observacoes" name="observacoes" rows={2} />
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={criar.isPending}>
                  Salvar aporte
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
              <TableHead className="text-right">Total</TableHead>
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
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir aporte"
                    onClick={() =>
                      excluir.mutate(a.id, {
                        onSuccess: () => toast.success("Aporte excluído."),
                        onError: () => toast.error("Não foi possível excluir."),
                      })
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
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
