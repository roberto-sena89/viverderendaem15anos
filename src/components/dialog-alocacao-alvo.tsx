import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";

/** Permite ajustar o percentual ideal de cada classe de ativo. */
export function DialogAlocacaoAlvo() {
  const { alvo, salvar, restaurar } = useAlocacaoAlvo();
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (aberto) {
      setValores(Object.fromEntries(Object.entries(alvo).map(([c, v]) => [c, String(v).replace(".", ",")])));
    }
  }, [aberto, alvo]);

  const numeros = Object.fromEntries(
    Object.entries(valores).map(([c, v]) => [c, Math.max(0, Number(v.replace(",", ".")) || 0)]),
  );
  const total = Object.values(numeros).reduce((s, v) => s + v, 0);
  const valido = Math.abs(total - 100) < 0.01;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <SlidersHorizontal className="size-8!" />
          Editar alocação ideal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alocação ideal por classe</DialogTitle>
          <DialogDescription>Defina o percentual-alvo de cada classe. A soma precisa ser 100%.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {Object.keys(alvo).map((classe) => (
            <div key={classe} className="flex items-center justify-between gap-3">
              <Label htmlFor={`alvo-${classe}`} className="text-sm">
                {classe}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`alvo-${classe}`}
                  inputMode="decimal"
                  value={valores[classe] ?? ""}
                  onChange={(e) => setValores((v) => ({ ...v, [classe]: e.target.value }))}
                  className="h-9 w-24 text-right text-sm"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>

        <p className={`text-xs ${valido ? "text-muted-foreground" : "text-destructive"}`}>
          Total: {total.toFixed(1).replace(".", ",")}%{valido ? "" : " — ajuste para somar 100%."}
        </p>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              restaurar();
              setAberto(false);
              toast.success("Alocação ideal restaurada ao padrão.");
            }}
          >
            Restaurar padrão
          </Button>
          <Button
            size="sm"
            disabled={!valido}
            onClick={() => {
              salvar(numeros);
              setAberto(false);
              toast.success("Alocação ideal atualizada.");
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
