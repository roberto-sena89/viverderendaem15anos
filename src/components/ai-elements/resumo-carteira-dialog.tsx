import { useState } from "react";
import { Landmark, Loader2, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAportes, useAtivos } from "@/lib/data";
import { brl, pct, resumoCarteira, retornoAnualizado } from "@/lib/portfolio";

/** Botão + diálogo que percorre a carteira e mostra custo total e retorno anual. */
export function ResumoCarteiraDialog() {
  const ativosQuery = useAtivos();
  const aportesQuery = useAportes();
  const [aberto, setAberto] = useState(false);

  const carregando = ativosQuery.isLoading || aportesQuery.isLoading;
  const ativos = ativosQuery.data ?? [];
  const aportes = aportesQuery.data ?? [];
  const resumo = resumoCarteira(ativos);
  const retorno = retornoAnualizado(aportes, resumo.totalAtual);
  const lucroPositivo = resumo.lucroTotal >= 0;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 rounded-full px-3"
          aria-label="Percorrer a carteira e mostrar custo total e retorno anual"
          title="Custo total e retorno anual da sua carteira"
        >
          <Wallet className="size-4 shrink-0 sm:mr-1.5" />
          <span className="hidden truncate sm:inline">Carteira</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="text-primary size-5" /> Sua carteira
          </DialogTitle>
          <DialogDescription>
            Resumo calculado a partir de todos os ativos e aportes cadastrados.
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="text-primary size-5 animate-spin" aria-label="Calculando..." />
          </div>
        ) : ativos.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
            Nenhum ativo na carteira ainda. Cadastre seus aportes na aba Carteira para ver o resumo
            aqui.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1 rounded-xl border border-border/60 bg-card/50 p-3.5">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <PiggyBank className="size-3.5" /> Custo total
              </p>
              <p className="text-lg font-semibold">{brl(resumo.totalInvestido)}</p>
              <p className="text-muted-foreground text-[11px]">
                {ativos.length} {ativos.length === 1 ? "ativo" : "ativos"} percorridos
              </p>
            </div>

            <div className="space-y-1 rounded-xl border border-border/60 bg-card/50 p-3.5">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <TrendingUp className="size-3.5" /> Retorno anual
              </p>
              <p className="text-lg font-semibold">
                {retorno === null ? "—" : `${pct(retorno, 2)} a.a.`}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {retorno === null
                  ? "sem histórico de aportes para anualizar"
                  : "TIR dos aportes + saldo atual"}
              </p>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-2.5">
              <div className="space-y-1 rounded-xl border border-border/60 bg-card/50 p-3.5">
                <p className="text-muted-foreground text-xs">Valor atual</p>
                <p className="text-lg font-semibold">{brl(resumo.totalAtual)}</p>
              </div>
              <div className="space-y-1 rounded-xl border border-border/60 bg-card/50 p-3.5">
                <p className="text-muted-foreground text-xs">Lucro/prejuízo</p>
                <p
                  className={`text-lg font-semibold ${lucroPositivo ? "text-positive" : "text-negative"}`}
                >
                  {brl(resumo.lucroTotal)}
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    ({pct(resumo.rentabilidade, 1)})
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
