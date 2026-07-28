import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { brl, metas, pct, totalAtual } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas · Investidor em 15 Anos" },
      { name: "description", content: "Da reserva de emergência aos 3 milhões: acompanhe o progresso de cada meta patrimonial." },
      { property: "og:title", content: "Metas · Investidor em 15 Anos" },
      { property: "og:description", content: "Timeline de objetivos patrimoniais com barras de progresso e prazo estimado." },
    ],
  }),
  component: MetasPage,
});

const CRESCIMENTO = 1.14;

function MetasPage() {
  const anoAtual = new Date().getFullYear();

  return (
    <AppShell title="Metas" description={`Patrimônio atual: ${brl(totalAtual)}`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metas.map((m) => {
          const progresso = Math.min(100, (totalAtual / m.alvo) * 100);
          const concluida = progresso >= 100;
          const anos = concluida ? 0 : Math.log(m.alvo / totalAtual) / Math.log(CRESCIMENTO);
          return (
            <div key={m.nome} className="surface-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium">{m.nome}</p>
                {concluida ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : (
                  <Circle className="size-5 text-muted-foreground" />
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Alvo de {brl(m.alvo)}</p>
              <Progress value={progresso} className="mt-4 h-2.5" />
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-medium text-primary">{pct(progresso)}</span>
                <span className="text-muted-foreground">
                  {concluida ? "Concluída" : `~${anos.toFixed(1)} anos · ${anoAtual + Math.ceil(anos)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="surface-card p-6">
        <p className="text-sm font-medium">Timeline de objetivos</p>
        <ol className="mt-6 space-y-6 border-l border-border pl-6">
          {metas.map((m) => {
            const progresso = Math.min(100, (totalAtual / m.alvo) * 100);
            const anos = progresso >= 100 ? 0 : Math.log(m.alvo / totalAtual) / Math.log(CRESCIMENTO);
            return (
              <li key={m.nome} className="relative">
                <span
                  className={`absolute top-1 -left-[31px] size-3 rounded-full border-2 border-background ${
                    progresso >= 100 ? "bg-success" : "bg-muted-foreground"
                  }`}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {anoAtual + Math.ceil(anos)} · {m.nome}
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
    </AppShell>
  );
}
