import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { CarteiraRecomendada } from "@/components/carteira-recomendada";
import { DeltaChip, TickerMark } from "@/components/panel";
import { ResumoKpis } from "@/components/resumo-kpis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAtivos, useExcluir, useSalvarAtivo } from "@/lib/data";
import { corCategoria } from "@/lib/cores-ativos";
import { brl, categorias, pct, resumoCarteira, valorAtual, valorInvestido, type Ativo, type Categoria } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira · Investidor em 15 Anos" },
      { name: "description", content: "Tabela completa da carteira com preço médio, lucro, rentabilidade, dividend yield e participação." },
      { property: "og:title", content: "Carteira · Investidor em 15 Anos" },
      { property: "og:description", content: "Todos os seus ativos consolidados por categoria em uma única tabela." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/carteira" }],
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
      <AbasCarteira />
      <ResumoKpis mostrarLancamento />
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

      {isLoading ? (
        <div className="surface-card p-12 text-center text-sm text-muted-foreground">Carregando carteira…</div>
      ) : (
        <CarteiraGrupos
          ativos={ativos}
          onEditar={abrir}
          onExcluir={(a) =>
            excluir.mutate(a.id, {
              onSuccess: () => toast.success(`${a.ticker} removido.`),
              onError: () => toast.error("Não foi possível excluir."),
            })
          }
        />
      )}


      <CarteiraRecomendada />

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
