import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { corCategoria, rotuloCategoria } from "@/lib/indices-base";
import type { LinhaIndice } from "@/lib/indices-base";
import { corVariacao, fmtValor, fmtVariacao } from "@/components/indices/card-indice";
import { cn } from "@/lib/utils";

/** Detalhes de um índice: gráfico expandido, indicadores e metodologia. */
export function ModalIndice({
  linha,
  aberto,
  aoFechar,
}: {
  linha: LinhaIndice | null;
  aberto: boolean;
  aoFechar: () => void;
}) {
  if (!linha) return null;
  const positivo = (linha.variacao12m ?? linha.variacaoDiaPercent ?? 0) >= 0;

  return (
    <Dialog open={aberto} onOpenChange={(v) => (v ? undefined : aoFechar())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg">{linha.codigo}</span>
            <span className="text-sm font-normal text-muted-foreground">{linha.nome}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase",
                corCategoria(linha.categoria),
              )}
            >
              {rotuloCategoria(linha.categoria)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-display text-3xl tabular-nums">{fmtValor(linha)}</p>
              <p className="text-xs text-muted-foreground">
                {linha.unidade === "%" ? "Taxa vigente" : "Pontos"} · fonte {linha.fonte}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-lg font-semibold tabular-nums", corVariacao(linha.variacao12m))}>
                {fmtVariacao(linha.variacao12m, linha.tipo === "taxa" ? " p.p." : "%")}
              </p>
              <p className="text-xs text-muted-foreground">Variação em 12 meses</p>
            </div>
          </div>

          <div className="panel p-4">
            <p className="panel-title mb-2">
              {linha.tipo === "taxa" ? "Histórico recente" : "Últimos 30 pregões"}
            </p>
            <Sparkline serie={linha.spark} positivo={positivo} largura={640} altura={140} className="w-full" />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {linha.extras.length ? (
              linha.extras.map((e) => (
                <div key={e.rotulo} className="panel p-3">
                  <p className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">{e.rotulo}</p>
                  <p className="mt-1 font-display text-sm tabular-nums">{e.valor}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem indicadores adicionais disponíveis.</p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{linha.descricao}</p>

          {linha.tipo === "taxa" ? (
            <p className="text-xs text-muted-foreground">
              Indicador divulgado oficialmente {linha.codigo === "IPCA" ? "pelo IBGE (mensal)" : "pelo Banco Central"} —
              não possui variação intradiária. Última divulgação: {linha.divulgadoEm ?? "—"}.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
