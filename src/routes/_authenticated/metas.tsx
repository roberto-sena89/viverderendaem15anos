import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { InputNumeroBR } from "@/components/input-numero-br";
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
import { Progress } from "@/components/ui/progress";
import { useAtivos, useCriarMeta, useExcluir, useMetas, usePlano } from "@/lib/data";
import { anosAteMeta, brl, metasPadrao, pct, resumoCarteira } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Da reserva de emergência aos 3 milhões: acompanhe o progresso de cada meta patrimonial.",
      },
      { property: "og:title", content: "Metas · Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Timeline de objetivos patrimoniais com barras de progresso e prazo estimado.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/metas" }],
  }),
  component: MetasPage,
});

const CRESCIMENTO = 1.14;

function MetasPage() {
  const [open, setOpen] = useState(false);
  const anoAtual = new Date().getFullYear();

  const { data: carteira = [] } = useAtivos();
  const { data: metas = [], isLoading } = useMetas();
  const { data: plano } = usePlano();
  const criar = useCriarMeta();
  const excluir = useExcluir("metas");
  const { totalAtual } = resumoCarteira(carteira);

  const anosPara = (alvo: number) =>
    plano && totalAtual > 0
      ? anosAteMeta(totalAtual, alvo, plano)
      : totalAtual > 0
        ? Math.max(0, Math.log(alvo / totalAtual) / Math.log(CRESCIMENTO))
        : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nome = String(form.get("nome") || "").trim();
    const alvo = Number(form.get("alvo"));
    if (!nome || !alvo) {
      toast.error("Informe nome e valor alvo.");
      return;
    }
    try {
      await criar.mutateAsync({ nome, alvo, ordem: metas.length });
      setOpen(false);
      toast.success("Meta criada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a meta.");
    }
  }

  async function criarPadrao() {
    try {
      for (const [i, m] of metasPadrao.entries()) {
        await criar.mutateAsync({ nome: m.nome, alvo: m.alvo, ordem: i });
      }
      toast.success("Metas sugeridas criadas.");
    } catch {
      toast.error("Não foi possível criar as metas sugeridas.");
    }
  }

  return (
    <AppShell title="Metas" description={`Patrimônio atual: ${brl(totalAtual)}`}>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova meta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" placeholder="Primeiro milhão" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alvo">Valor alvo (R$)</Label>
                <InputNumeroBR id="alvo" name="alvo" prefixo="R$" required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={criar.isPending}>
                  Salvar meta
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!isLoading && metas.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
          <p className="font-medium">Você ainda não definiu metas</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Crie a sua primeira meta ou comece com a trilha sugerida: reserva de emergência, 100
            mil, 250 mil… até 3 milhões.
          </p>
          <Button variant="secondary" onClick={criarPadrao} disabled={criar.isPending}>
            Usar metas sugeridas
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metas.map((m) => {
          const progresso = m.alvo > 0 ? Math.min(100, (totalAtual / m.alvo) * 100) : 0;
          const concluida = progresso >= 100;
          const anos = concluida ? 0 : anosPara(m.alvo);
          return (
            <div key={m.id} className="surface-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium">{m.nome}</p>
                <div className="flex items-center gap-1">
                  {concluida ? (
                    <CheckCircle2 className="size-5 text-success" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground" />
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir meta"
                    onClick={() =>
                      excluir.mutate(m.id, {
                        onSuccess: () => toast.success("Meta excluída."),
                        onError: () => toast.error("Não foi possível excluir."),
                      })
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Alvo de {brl(m.alvo)}</p>
              <Progress value={progresso} className="mt-4 h-2.5" />
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-medium text-primary">{pct(progresso)}</span>
                <span className="text-muted-foreground">
                  {concluida
                    ? "Concluída"
                    : anos === null
                      ? "Meta fora do horizonte"
                      : `~${anos.toFixed(1)} anos · ${anoAtual + Math.ceil(anos)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {metas.length > 0 ? (
        <div className="surface-card p-6">
          <p className="panel-title">Timeline de objetivos</p>
          <ol className="mt-6 space-y-6 border-l border-border pl-6">
            {metas.map((m) => {
              const progresso = m.alvo > 0 ? Math.min(100, (totalAtual / m.alvo) * 100) : 0;
              const anos = progresso >= 100 ? 0 : anosPara(m.alvo);
              return (
                <li key={m.id} className="relative">
                  <span
                    className={`absolute top-1 -left-[31px] size-3 rounded-full border-2 border-background ${
                      progresso >= 100 ? "bg-success" : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {anos === null ? "Hoje" : `${anoAtual + Math.ceil(anos)}`} · {m.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {brl(m.alvo)} · {pct(progresso)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </AppShell>
  );
}
