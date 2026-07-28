import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAtivos, useExcluir, useSalvarAtivo } from "@/lib/data";
import { brl, categorias, pct, resumoCarteira, valorAtual, valorInvestido, type Ativo, type Categoria } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira · Investidor em 15 Anos" },
      { name: "description", content: "Tabela completa da carteira com preço médio, lucro, rentabilidade, dividend yield e participação." },
      { property: "og:title", content: "Carteira · Investidor em 15 Anos" },
      { property: "og:description", content: "Todos os seus ativos consolidados por categoria em uma única tabela." },
    ],
  }),
  component: CarteiraPage,
});

const filtros = ["Todos", ...categorias] as const;

function CarteiraPage() {
  const [filtro, setFiltro] = useState<string>("Todos");
  const [editando, setEditando] = useState<Ativo | null>(null);
  const [open, setOpen] = useState(false);

  const { data: carteira = [], isLoading } = useAtivos();
  const salvar = useSalvarAtivo();
  const excluir = useExcluir("ativos");
  const { totalAtual } = resumoCarteira(carteira);
  const ativos = carteira.filter((a) => filtro === "Todos" || a.categoria === filtro);

  function abrir(ativo: Ativo | null) {
    setEditando(ativo);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await salvar.mutateAsync({
        id: editando?.id,
        ticker: String(form.get("ticker")),
        nome: String(form.get("nome")),
        categoria: String(form.get("categoria")) as Categoria,
        quantidade: Number(form.get("quantidade")),
        precoMedio: Number(form.get("precoMedio")),
        precoAtual: Number(form.get("precoAtual")),
        dy: Number(form.get("dy") || 0),
      });
      setOpen(false);
      toast.success(editando ? "Ativo atualizado." : "Ativo cadastrado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o ativo.");
    }
  }

  return (
    <AppShell title="Carteira" description={`${carteira.length} ativos · ${brl(totalAtual)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {filtros.map((f) => (
            <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>
              {f}
            </Button>
          ))}
        </div>
        <Button onClick={() => abrir(null)}>
          <Plus className="size-4" /> Novo ativo
        </Button>
      </div>

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Preço médio</TableHead>
              <TableHead className="text-right">Preço atual</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
              <TableHead className="text-right">Rent.</TableHead>
              <TableHead className="text-right">DY</TableHead>
              <TableHead className="text-right">Part.</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ativos.map((a) => {
              const investido = valorInvestido(a);
              const lucro = valorAtual(a) - investido;
              const rent = investido > 0 ? (lucro / investido) * 100 : 0;
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TickerMark ticker={a.ticker} />
                      <span className="font-display font-bold">{a.ticker}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-52 truncate text-muted-foreground">{a.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.categoria}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{a.quantidade.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{brl(a.precoMedio, 2)}</TableCell>
                  <TableCell className="text-right font-semibold">{brl(a.precoAtual, 2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{brl(lucro)}</TableCell>
                  <TableCell className="text-right">
                    <DeltaChip value={rent} />
                  </TableCell>
                  <TableCell className="text-right">{pct(a.dy)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-gradient-brand"
                          style={{ width: `${Math.min(100, totalAtual > 0 ? (valorAtual(a) / totalAtual) * 100 : 0)}%` }}
                        />
                      </span>
                      {pct(totalAtual > 0 ? (valorAtual(a) / totalAtual) * 100 : 0)}
                    </div>
                  </TableCell>

                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => abrir(a)} aria-label={`Editar ${a.ticker}`}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Excluir ${a.ticker}`}
                      onClick={() =>
                        excluir.mutate(a.id, {
                          onSuccess: () => toast.success(`${a.ticker} removido.`),
                          onError: () => toast.error("Não foi possível excluir."),
                        })
                      }
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!isLoading && ativos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum ativo nesta categoria ainda.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? `Editar ${editando.ticker}` : "Novo ativo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input id="ticker" name="ticker" defaultValue={editando?.ticker} placeholder="BOVA11" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" defaultValue={editando?.nome} placeholder="iShares Ibovespa" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <select
                id="categoria"
                name="categoria"
                defaultValue={editando?.categoria}
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
              <Input id="quantidade" name="quantidade" type="number" step="any" min="0" defaultValue={editando?.quantidade ?? 0} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="precoMedio">Preço médio</Label>
              <Input id="precoMedio" name="precoMedio" type="number" step="any" min="0" defaultValue={editando?.precoMedio ?? 0} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="precoAtual">Preço atual</Label>
              <Input id="precoAtual" name="precoAtual" type="number" step="any" min="0" defaultValue={editando?.precoAtual ?? 0} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dy">Dividend yield (%)</Label>
              <Input id="dy" name="dy" type="number" step="any" min="0" defaultValue={editando?.dy ?? 0} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={salvar.isPending}>
                Salvar ativo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
