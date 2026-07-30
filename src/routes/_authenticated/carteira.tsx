import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { CarteiraGrupos } from "@/components/carteira-grupos";
import { CarteiraRecomendada } from "@/components/carteira-recomendada";
import { DialogMoverCategoria } from "@/components/dialog-mover-categoria";
import { ResumoKpis } from "@/components/resumo-kpis";
import { Button } from "@/components/ui/button";
import { InputNumeroBR } from "@/components/input-numero-br";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAtivos, useExcluir, useSalvarAtivo } from "@/lib/data";
import { brl, categorias, resumoCarteira, rotuloCategoria, type Ativo, type Categoria } from "@/lib/portfolio";

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
  const [movendo, setMovendo] = useState<Ativo | null>(null);
  const [open, setOpen] = useState(false);

  const { data: carteira = [], isLoading } = useAtivos();
  const salvar = useSalvarAtivo();
  const excluir = useExcluir("ativos");
  const { totalAtual } = resumoCarteira(carteira);
  const ativos = carteira.filter((a) => filtro === "Todos" || a.categoria === filtro);
  const contagem = carteira.reduce(
    (m, a) => m.set(a.categoria, (m.get(a.categoria) ?? 0) + 1),
    new Map<string, number>(),
  );

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
      <div className="flex items-center gap-2 border-b pb-2">
        <div className="scrollbar-none -mb-px flex flex-1 items-center gap-1 overflow-x-auto">
          {filtros
            .filter((f) => f === "Todos" || contagem.get(f))
            .map((f) => {
              const ativo = filtro === f;
              const qtd = f === "Todos" ? carteira.length : (contagem.get(f) ?? 0);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFiltro(f)}
                  aria-pressed={ativo}
                  className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors sm:min-h-9 ${
                    ativo
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {f}
                  <span className={`tabular-nums ${ativo ? "opacity-80" : "opacity-60"}`}>{qtd}</span>
                </button>
              );
            })}
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 gap-1.5 text-xs font-semibold" onClick={() => abrir(null)}>
          <Plus className="size-4" /> Novo ativo
        </Button>
      </div>

      {isLoading ? (
        <div className="surface-card p-12 text-center text-sm text-muted-foreground">Carregando carteira…</div>
      ) : (
        <CarteiraGrupos
          ativos={ativos}
          onEditar={abrir}
          onMover={setMovendo}
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
                    {rotuloCategoria[c] ?? c}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Alterar a categoria realoca o ativo para o grupo correspondente da carteira.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <InputNumeroBR key={`qtd-${editando?.id ?? "novo"}`} id="quantidade" name="quantidade" defaultValue={editando?.quantidade ?? 0} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="precoMedio">Preço médio (R$)</Label>
              <InputNumeroBR key={`pm-${editando?.id ?? "novo"}`} id="precoMedio" name="precoMedio" prefixo="R$" defaultValue={editando?.precoMedio ?? 0} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="precoAtual">Preço atual (R$)</Label>
              <InputNumeroBR key={`pa-${editando?.id ?? "novo"}`} id="precoAtual" name="precoAtual" prefixo="R$" defaultValue={editando?.precoAtual ?? 0} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dy">Dividend yield (%)</Label>
              <InputNumeroBR key={`dy-${editando?.id ?? "novo"}`} id="dy" name="dy" defaultValue={editando?.dy ?? 0} />
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
