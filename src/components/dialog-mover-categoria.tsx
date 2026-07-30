import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSalvarAtivo } from "@/lib/data";
import { categorias, classeDoAtivo, rotuloCategoria, type Ativo, type Categoria } from "@/lib/portfolio";

/**
 * Permite realocar um ativo para outra categoria — o que o move automaticamente
 * para o grupo/classe correspondente na carteira, no dashboard e na análise.
 */
export function DialogMoverCategoria({
  ativo,
  onOpenChange,
}: {
  ativo: Ativo | null;
  onOpenChange: (aberto: boolean) => void;
}) {
  const salvar = useSalvarAtivo();
  const [categoria, setCategoria] = useState<Categoria | "">("");

  useEffect(() => {
    if (ativo) setCategoria(ativo.categoria);
  }, [ativo]);

  const previa = ativo && categoria ? classeDoAtivo({ ...ativo, categoria: categoria as Categoria }) : "";

  async function mover() {
    if (!ativo || !categoria) return;
    try {
      await salvar.mutateAsync({
        id: ativo.id,
        ticker: ativo.ticker,
        nome: ativo.nome,
        categoria: categoria as Categoria,
        quantidade: ativo.quantidade,
        precoMedio: ativo.precoMedio,
        precoAtual: ativo.precoAtual,
        dy: ativo.dy,
      });
      toast.success(`${ativo.ticker} movido para ${rotuloCategoria[categoria] ?? categoria}.`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mover o ativo.");
    }
  }

  return (
    <Dialog open={!!ativo} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-4" /> Mover {ativo?.ticker}
          </DialogTitle>
          <DialogDescription>
            Escolha a nova categoria. O ativo é realocado automaticamente para o grupo correspondente na
            carteira, no resumo e na análise de rebalanceamento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="mover-categoria">Categoria do ativo</Label>
          <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria)}>
            <SelectTrigger id="mover-categoria">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {rotuloCategoria[c] ?? c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {previa ? (
            <p className="text-xs text-muted-foreground">
              Novo grupo na carteira: <span className="font-semibold text-foreground">{previa}</span>
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={mover} disabled={salvar.isPending || !categoria || categoria === ativo?.categoria}>
            Mover ativo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
