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
import { useSubAlocacaoAlvo } from "@/lib/subalocacao-alvo";
import { CLASSE_POS_FIXADO } from "@/lib/portfolio";

const SUBS_RENDA_FIXA = ["Tesouro SELIC", "Tesouro IPCA+", "Tesouro Prefixado", "CDB"] as const;

/** Permite ajustar o percentual ideal de cada classe de ativo. */
export function DialogAlocacaoAlvo() {
  const { alvo, salvar, restaurar } = useAlocacaoAlvo();
  const { subAlvo, salvarSub, restaurarSub } = useSubAlocacaoAlvo();
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [subValores, setSubValores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (aberto) {
      setValores(Object.fromEntries(Object.entries(alvo).map(([c, v]) => [c, String(v).replace(".", ",")])));
      setSubValores(
        Object.fromEntries(SUBS_RENDA_FIXA.map((s) => [s, String(subAlvo[s] ?? 0).replace(".", ",")])),
      );
    }
  }, [aberto, alvo, subAlvo]);

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

  const subNumeros = Object.fromEntries(
    SUBS_RENDA_FIXA.map((s) => {
      const v = subValores[s] ?? "";
      return [s, v.trim() === "" ? 0 : Math.max(0, paraNumero(v) || 0)];
    }),
  ) as Record<string, number>;
  const alvoRendaFixa = numeros[CLASSE_POS_FIXADO] ?? 0;
  const somaSubs = Object.values(subNumeros).reduce((s, v) => s + v, 0);
  const subsInvalidos = new Set(
    SUBS_RENDA_FIXA.filter((s) => {
      const v = subValores[s] ?? "";
      return v.trim() === "" || !Number.isFinite(paraNumero(v)) || subNumeros[s] < 0;
    }) as string[],
  );
  const subInvalido = subsInvalidos.size > 0 || somaSubs > alvoRendaFixa + 0.001;

  const valido = somaOk && camposInvalidos.size === 0 && !subInvalido;

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
        <Button size="sm" className="h-9 gap-2 px-4 text-xs font-semibold">
          <SlidersHorizontal className="size-4!" />
          Editar alocação ideal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Alocação ideal por classe</DialogTitle>
          <DialogDescription>Defina o percentual-alvo de cada classe. A soma precisa ser 100%.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {Object.keys(alvo).map((classe) => (
            <div
              key={classe}
              className="rounded-md border border-border/60 bg-muted/20 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`alvo-${classe}`} className="text-xs leading-tight font-medium whitespace-pre-line">
                  {classe}
                </Label>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Input
                    id={`alvo-${classe}`}
                    inputMode="decimal"
                    aria-invalid={camposInvalidos.has(classe)}
                    value={valores[classe] ?? ""}
                    onKeyDown={aoTeclar(classe)}
                    onChange={(e) => setValores((v) => ({ ...v, [classe]: sanitizar(e.target.value) }))}
                    className="h-9 w-20 text-right text-sm tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              {classe === CLASSE_POS_FIXADO && (
                <div className="mt-2 space-y-2 border-t border-border/60 pt-2 pl-3">
                  {SUBS_RENDA_FIXA.map((sub) => {
                    const id = `alvo-sub-${sub.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                    return (
                      <div key={sub} className="flex items-center justify-between gap-3">
                        <Label htmlFor={id} className="text-xs leading-tight font-normal text-muted-foreground">
                          ↳ {sub} <span className="text-[10px]">(sub-classe)</span>
                        </Label>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Input
                            id={id}
                            inputMode="decimal"
                            aria-invalid={subsInvalidos.has(sub)}
                            value={subValores[sub] ?? ""}
                            onChange={(e) =>
                              setSubValores((v) => ({ ...v, [sub]: sanitizar(e.target.value) }))
                            }
                            className="h-9 w-20 text-right text-sm tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    );
                  })}
                  <p className={`mt-1 text-[11px] ${subInvalido ? "text-destructive" : "text-muted-foreground"}`}>
                    Soma das sub-classes: {somaSubs.toFixed(1).replace(".", ",")}% (máx.{" "}
                    {alvoRendaFixa.toFixed(1).replace(".", ",")}% da Renda Fixa).
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>


        <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground uppercase tracking-wide">Total alocado</span>
            <span className={`tabular-nums ${valido ? "text-success" : "text-destructive"}`}>
              {total.toFixed(1).replace(".", ",")}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full transition-all ${valido ? "bg-success" : "bg-destructive"}`}
              style={{ width: `${Math.min(100, total)}%` }}
            />
          </div>
          {!somaOk && (
            <p className="text-xs text-destructive">
              {restante > 0 ? "Faltam" : "Excedem"} {Math.abs(restante).toFixed(1).replace(".", ",")} pontos para
              fechar 100%.
            </p>
          )}
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
              restaurarSub();
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
              salvarSub(subNumeros);
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
