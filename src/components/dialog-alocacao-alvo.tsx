import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Info, SlidersHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const { alvo, salvar } = useAlocacaoAlvo();
  const { subAlvo, salvarSub } = useSubAlocacaoAlvo();
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [subValores, setSubValores] = useState<Record<string, string>>({});
  /** Snapshot do estado salvo ao abrir, usado para desfazer se o usuário fechar sem salvar. */
  const original = useRef<{ alvo: Record<string, number>; sub: Record<string, number> } | null>(null);
  const confirmado = useRef(false);

  useEffect(() => {
    if (!aberto) return;
    // Hidrata apenas ao abrir: evita sobrescrever a digitação quando outra aba
    // atualiza os alvos enquanto o diálogo está aberto.
    original.current = { alvo: { ...alvo }, sub: { ...subAlvo } };
    confirmado.current = false;
    setValores(Object.fromEntries(Object.entries(alvo).map(([c, v]) => [c, String(v).replace(".", ",")])));
    setSubValores(
      Object.fromEntries(SUBS_RENDA_FIXA.map((s) => [s, String(subAlvo[s] ?? 0).replace(".", ",")])),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);


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

  const subNumeros = Object.fromEntries(
    SUBS_RENDA_FIXA.map((s) => {
      const v = subValores[s] ?? "";
      return [s, v.trim() === "" ? 0 : Math.max(0, paraNumero(v) || 0)];
    }),
  ) as Record<string, number>;
  const somaSubs = Math.round(Object.values(subNumeros).reduce((s, v) => s + v, 0) * 100) / 100;
  /** Renda Fixa é sempre a soma das sub-classes. */
  const textoRendaFixa = somaSubs.toFixed(2).replace(".", ",");

  const numeros = Object.fromEntries(
    Object.entries(valores).map(([c, v]) => [
      c,
      c === CLASSE_POS_FIXADO ? somaSubs : v.trim() === "" ? 0 : Math.max(0, paraNumero(v) || 0),
    ]),
  );

  const invalidos = Object.entries(valores).filter(([c, v]) => {
    if (c === CLASSE_POS_FIXADO) return false;
    if (v.trim() === "") return true;
    const n = paraNumero(v);
    return !Number.isFinite(n) || n < 0 || n > 100;
  });
  const camposInvalidos = new Set(invalidos.map(([c]) => c));

  const total = Object.values(numeros).reduce((s, v) => s + v, 0);
  const restante = 100 - total;
  const somaOk = Math.abs(restante) < 0.01;

  const subsInvalidos = new Set(
    SUBS_RENDA_FIXA.filter((s) => {
      const v = subValores[s] ?? "";
      return v.trim() === "" || !Number.isFinite(paraNumero(v)) || subNumeros[s] < 0;
    }) as string[],
  );
  const subInvalido = subsInvalidos.size > 0 || somaSubs > 100.001;

  /** Tudo zerado também é um estado salvável (usado pelo botão "Zerar tudo"). */
  const tudoZerado = total < 0.01;
  const valido = (somaOk || tudoZerado) && camposInvalidos.size === 0 && !subInvalido;

  /**
   * Pré-visualização ao vivo: enquanto o diálogo está aberto e os campos são
   * válidos, os alvos são propagados (com debounce) para a carteira e o
   * rebalanceamento. Fechar sem salvar restaura o estado anterior.
   */
  const serializado = JSON.stringify({ numeros, subNumeros });
  useEffect(() => {
    if (!aberto || camposInvalidos.size > 0 || subInvalido) return;
    const id = window.setTimeout(() => {
      const { numeros: n, subNumeros: s } = JSON.parse(serializado) as {
        numeros: Record<string, number>;
        subNumeros: Record<string, number>;
      };
      salvar(n);
      salvarSub(s);
    }, 250);
    return () => window.clearTimeout(id);
  }, [aberto, serializado, camposInvalidos.size, subInvalido, salvar, salvarSub]);

  /** Desfaz a pré-visualização quando o usuário fecha sem confirmar. */
  function aoAlternar(estado: boolean) {
    if (!estado && !confirmado.current && original.current) {
      salvar(original.current.alvo);
      salvarSub(original.current.sub);
    }
    setAberto(estado);
  }

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
    <Dialog open={aberto} onOpenChange={aoAlternar}>
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

        <div className="space-y-3">
          {Object.keys(alvo).includes(CLASSE_POS_FIXADO) && (
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
              <TooltipProvider delayDuration={150}>
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor={`alvo-${CLASSE_POS_FIXADO}`}
                    className="flex items-center gap-1.5 text-xs leading-tight font-semibold whitespace-pre-line"
                  >
                    {CLASSE_POS_FIXADO}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Como a Renda Fixa é calculada"
                          className="text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <Info className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64 text-xs">
                        A Renda Fixa é calculada automaticamente como a soma de Tesouro SELIC, Tesouro IPCA+, Tesouro
                        Prefixado e CDB. Por isso o campo fica somente leitura — ajuste as sub-classes abaixo.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id={`alvo-${CLASSE_POS_FIXADO}`}
                          readOnly
                          tabIndex={-1}
                          aria-describedby="alvo-renda-fixa-ajuda"
                          value={textoRendaFixa}
                          className="h-9 w-20 cursor-default bg-muted/60 text-right text-sm font-semibold tabular-nums"
                        />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64 text-xs">
                        Campo somente leitura: soma de Tesouro SELIC, IPCA+, Prefixado e CDB.
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </TooltipProvider>
              <p id="alvo-renda-fixa-ajuda" className="mt-1 text-[11px] text-muted-foreground">
                Calculado automaticamente: soma das sub-classes abaixo.
              </p>

              <div className="mt-2.5 grid gap-x-6 gap-y-2 border-t border-border/60 pt-2.5 sm:grid-cols-2">
                {SUBS_RENDA_FIXA.map((sub) => {
                  const id = `alvo-sub-${sub.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                  return (
                    <div key={sub} className="flex items-center justify-between gap-3">
                      <Label htmlFor={id} className="min-w-0 truncate text-xs font-normal text-muted-foreground">
                        ↳ {sub}
                      </Label>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Input
                          id={id}
                          inputMode="decimal"
                          aria-invalid={subsInvalidos.has(sub)}
                          value={subValores[sub] ?? ""}
                          onChange={(e) => setSubValores((v) => ({ ...v, [sub]: sanitizar(e.target.value) }))}
                          className="h-9 w-20 text-right text-sm tabular-nums"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className={`mt-2 text-[11px] ${subInvalido ? "text-destructive" : "text-muted-foreground"}`}>
                Soma das sub-classes: {somaSubs.toFixed(1).replace(".", ",")}% = total da Renda Fixa.
              </p>
            </div>
          )}

          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(alvo)
              .filter((classe) => classe !== CLASSE_POS_FIXADO)
              .map((classe) => (
                <div
                  key={classe}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <Label htmlFor={`alvo-${classe}`} className="min-w-0 truncate text-xs font-medium">
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
              ))}
          </div>
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
          {!somaOk && !tudoZerado && (
            <p className="text-xs text-destructive">
              {restante > 0 ? "Faltam" : "Excedem"} {Math.abs(restante).toFixed(1).replace(".", ",")} pontos para
              fechar 100%.
            </p>
          )}
          {tudoZerado && (
            <p className="text-xs text-muted-foreground">Tudo zerado — você pode salvar assim mesmo.</p>
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
              setValores((v) => Object.fromEntries(Object.keys(v).map((c) => [c, "0,00"])));
              setSubValores(Object.fromEntries(SUBS_RENDA_FIXA.map((s) => [s, "0,00"])));
              toast.success("Todas as porcentagens foram zeradas.");
            }}
          >
            Zerar tudo
          </Button>
          <Button
            size="sm"
            disabled={!valido}
            onClick={() => {
              salvar(numeros);
              salvarSub(subNumeros);
              confirmado.current = true;
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
