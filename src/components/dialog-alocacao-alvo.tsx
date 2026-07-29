import { useEffect, useState, type KeyboardEvent } from "react";
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

  /** Mantém apenas dígitos e um separador decimal, com no máximo 2 casas. */
  const sanitizar = (bruto: string) => {
    let s = bruto.replace(/[^\d.,]/g, "").replace(/\./g, ",");
    const partes = s.split(",");
    s = partes.length > 1 ? `${partes[0]},${partes.slice(1).join("").slice(0, 2)}` : partes[0];
    return s.slice(0, 6);
  };

  const paraNumero = (v: string) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : Number.NaN;
  };

  const numeros = Object.fromEntries(
    Object.entries(valores).map(([c, v]) => [c, v.trim() === "" ? 0 : Math.max(0, paraNumero(v) || 0)]),
  );

  const invalidos = Object.entries(valores).filter(([, v]) => {
    if (v.trim() === "") return true;
    const n = paraNumero(v);
    return !Number.isFinite(n) || n < 0 || n > 100;
  });
  const camposInvalidos = new Set(invalidos.map(([c]) => c));

  const total = Object.values(numeros).reduce((s, v) => s + v, 0);
  const restante = 100 - total;
  const somaOk = Math.abs(restante) < 0.01;
  const valido = somaOk && camposInvalidos.size === 0;

  /** Setas ajustam 0,01 (Shift = 1,00; PageUp/PageDown = 5,00), respeitando 0–100. */
  const aoTeclar = (classe: string) => (e: KeyboardEvent<HTMLInputElement>) => {
    const passo =
      e.key === "PageUp" || e.key === "PageDown" ? 5 : e.shiftKey ? 1 : 0.01;
    const sinal =
      e.key === "ArrowUp" || e.key === "PageUp" ? 1 : e.key === "ArrowDown" || e.key === "PageDown" ? -1 : 0;
    if (sinal === 0) return;
    e.preventDefault();
    const atual = paraNumero(valores[classe] ?? "") || 0;
    const novo = Math.min(100, Math.max(0, Math.round((atual + sinal * passo) * 100) / 100));
    setValores((v) => ({ ...v, [classe]: novo.toFixed(2).replace(".", ",") }));
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 px-4 text-xs font-semibold">
          <SlidersHorizontal className="size-4!" />
          Editar alocação ideal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alocação ideal por classe</DialogTitle>
          <DialogDescription>Defina o percentual-alvo de cada classe. A soma precisa ser 100%.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {Object.keys(alvo).map((classe) => (
            <div key={classe} className="flex items-center justify-between gap-3">
              <Label htmlFor={`alvo-${classe}`} className="text-sm whitespace-pre-line">
                {classe}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`alvo-${classe}`}
                  inputMode="decimal"
                  aria-invalid={camposInvalidos.has(classe)}
                  value={valores[classe] ?? ""}
                  onKeyDown={aoTeclar(classe)}
                  onChange={(e) => setValores((v) => ({ ...v, [classe]: sanitizar(e.target.value) }))}
                  className="h-9 w-24 text-right text-sm"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <p className={`text-xs font-medium ${valido ? "text-muted-foreground" : "text-destructive"}`}>
            Total: {total.toFixed(1).replace(".", ",")}%
            {somaOk ? "" : ` — ${restante > 0 ? "faltam" : "excedem"} ${Math.abs(restante).toFixed(1).replace(".", ",")} pontos.`}
          </p>
          {camposInvalidos.size > 0 && (
            <p className="text-xs text-destructive">Informe um número entre 0 e 100 em cada classe.</p>
          )}
        </div>


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
