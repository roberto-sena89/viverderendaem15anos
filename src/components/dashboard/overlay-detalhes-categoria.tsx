import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAtivosAoVivo, useCotacoesTempoReal, chaveTicker } from "@/lib/cotacoes-tempo-real";
import { brl, valorAtual, classeDoAtivo, arredondar } from "@/lib/portfolio";
import { corCategoria } from "@/lib/cores-ativos";
import { useAportes } from "@/lib/data";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  PieChart,
  Lightbulb,
  Target,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";

interface OverlayDetalhesCategoriaProps {
  categoria: string | null;
  onClose: () => void;
  tickersDestacados?: string[];
}

export function OverlayDetalhesCategoria({
  categoria,
  onClose,
  tickersDestacados = [],
}: OverlayDetalhesCategoriaProps) {
  const { data: ativos = [] } = useAtivosAoVivo();
  const { data: aportes = [] } = useAportes();
  const { mapa } = useCotacoesTempoReal();
  const { alvo } = useAlocacaoAlvo();

  if (!categoria) return null;

  const ativosDaCat = ativos.filter((a) => a.categoria === categoria);
  const aportesDaCat = aportes
    .filter((ap) => ap.categoria === categoria)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 10);

  const totalInvestido = ativosDaCat.reduce(
    (sum, a) => sum + arredondar(Number(a.quantidade) * Number(a.precoMedio)),
    0,
  );
  const totalAtual = ativosDaCat.reduce((sum, a) => sum + arredondar(valorAtual(a)), 0);
  const lucro = arredondar(totalAtual - totalInvestido);
  const lucroPct = totalInvestido > 0 ? arredondar((lucro / totalInvestido) * 100) : 0;
  const cor = corCategoria(categoria);

  // Insights
  const ativosComVariacao = ativosDaCat
    .map((a) => ({
      ...a,
      cotacao: mapa.get(a.ticker.toUpperCase().replace(/\.SA$/i, "")),
    }))
    .filter((a) => a.cotacao?.variacaoPercent !== undefined && a.cotacao.variacaoPercent !== null)
    .sort((a, b) => Math.abs(b.cotacao!.variacaoPercent!) - Math.abs(a.cotacao!.variacaoPercent!));

  const maiorVariacao = ativosComVariacao[0];

  const ativosComImpacto = ativosDaCat
    .map((a) => {
      const vAtual = valorAtual(a);
      const cotacao = mapa.get(a.ticker.toUpperCase().replace(/\.SA$/i, ""));
      const variacao = cotacao?.variacaoPercent ?? 0;
      const impactoFinanceiro = vAtual * (variacao / 100);
      return { ...a, impactoFinanceiro, variacao };
    })
    .sort((a, b) => Math.abs(b.impactoFinanceiro) - Math.abs(a.impactoFinanceiro));

  const maiorImpacto = ativosComImpacto[0];

  // Rebalanceamento
  const totalCarteira = ativos.reduce((sum, a) => sum + valorAtual(a), 0);
  const classe = ativosDaCat.length > 0 ? classeDoAtivo(ativosDaCat[0]) : null;
  const percentualAtual = totalCarteira > 0 ? (totalAtual / totalCarteira) * 100 : 0;
  const percentualAlvo = classe ? (alvo[classe] ?? 0) : 0;
  const desvio = percentualAtual - percentualAlvo;
  const precisaComprar = desvio < -1; // Mais de 1% abaixo do alvo
  const precisaVender = desvio > 1; // Mais de 1% acima do alvo

  return (
    <Dialog open={!!categoria} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden border-border/40 bg-background/95 backdrop-blur-xl">
        <div
          className="absolute top-0 left-0 h-1.5 w-full opacity-80"
          style={{ backgroundColor: cor }}
        />

        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-xl bg-muted/50"
              style={{ color: cor }}
            >
              <PieChart className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-wider">
                {categoria}
              </DialogTitle>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-70">
                Detalhamento da Categoria
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 border-y border-border/40 bg-muted/20">
          <div className="p-4 flex flex-col gap-1 border-r border-border/40">
            <span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider">
              Total Investido
            </span>
            <span className="text-sm font-black tabular-nums">{brl(totalInvestido)}</span>
          </div>
          <div className="p-4 flex flex-col gap-1 border-r border-border/40">
            <span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider">
              Saldo Atual
            </span>
            <span className="text-sm font-black tabular-nums">{brl(totalAtual)}</span>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider">
              Lucro / Prejuízo
            </span>
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-black tabular-nums",
                lucro >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {lucro >= 0 ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              <span className="flex items-baseline gap-1.5">
                {brl(lucro)}
                <span className="text-[0.65rem] opacity-70 font-bold">
                  ({lucroPct >= 0 ? "+" : ""}
                  {lucroPct.toFixed(2).replace(".", ",")}
                  {"%"})
                </span>
              </span>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-8">
            {/* Insights Automáticos */}
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                <Lightbulb className="size-3.5" /> Insights do Dia
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {maiorVariacao && (
                  <div className="p-3 rounded-lg border border-border/40 bg-primary/5 flex flex-col gap-1.5">
                    <span className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-wider">
                      Maior Volatilidade
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">{maiorVariacao.ticker}</span>
                      <span
                        className={cn(
                          "text-xs font-black tabular-nums",
                          (maiorVariacao.cotacao?.variacaoPercent ?? 0) >= 0
                            ? "text-positive"
                            : "text-negative",
                        )}
                      >
                        {(maiorVariacao.cotacao?.variacaoPercent ?? 0) >= 0 ? "+" : ""}
                        {maiorVariacao.cotacao?.variacaoPercent?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}
                {maiorImpacto && Math.abs(maiorImpacto.impactoFinanceiro) > 0.01 && (
                  <div className="p-3 rounded-lg border border-border/40 bg-primary/5 flex flex-col gap-1.5">
                    <span className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-wider">
                      Maior Impacto no Saldo
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">{maiorImpacto.ticker}</span>
                      <span
                        className={cn(
                          "text-xs font-black tabular-nums",
                          maiorImpacto.impactoFinanceiro >= 0 ? "text-positive" : "text-negative",
                        )}
                      >
                        {maiorImpacto.impactoFinanceiro >= 0 ? "+" : ""}
                        {brl(maiorImpacto.impactoFinanceiro, 2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sugestão de Rebalanceamento */}
              {classe && (precisaComprar || precisaVender) && (
                <div
                  className={cn(
                    "p-3 rounded-lg border flex items-start gap-3",
                    precisaComprar
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-amber-500/20 bg-amber-500/5",
                  )}
                >
                  <Target
                    className={cn(
                      "size-5 shrink-0 mt-0.5",
                      precisaComprar ? "text-positive" : "text-amber-500",
                    )}
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-black uppercase tracking-tight">
                      Sugestão de Rebalanceamento
                    </span>
                    <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                      Esta categoria representa{" "}
                      <span className="font-bold text-foreground">
                        {percentualAtual.toFixed(1)}%
                      </span>{" "}
                      da sua carteira, enquanto seu alvo é{" "}
                      <span className="font-bold text-foreground">
                        {percentualAlvo.toFixed(1)}%
                      </span>
                      .
                      {precisaComprar
                        ? " Considere novos aportes aqui para atingir seu objetivo."
                        : " Você está acima do peso ideal, considere reavaliar novas compras."}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <Separator className="bg-border/40" />

            {/* Como calculamos */}
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                <HelpCircle className="size-3.5" /> Como calculamos
              </h3>
              <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
                <div className="space-y-1">
                  <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider">
                    Fórmula do Lucro
                  </p>
                  <code className="text-[0.7rem] font-mono text-primary bg-primary/5 px-2 py-0.5 rounded block">
                    Lucro = Total Atual - Total Investido (arredondado para 2 casas)
                  </code>
                </div>
                <div className="space-y-1">
                  <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider">
                    Exemplo com seus dados
                  </p>
                  <div className="text-[0.7rem] leading-relaxed text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/20">
                    <p>
                      Total Atual:{" "}
                      <span className="text-foreground font-bold">{brl(totalAtual)}</span>
                    </p>
                    <p>
                      Total Investido:{" "}
                      <span className="text-foreground font-bold">{brl(totalInvestido)}</span>
                    </p>
                    <p className="mt-2 pt-2 border-t border-border/20 italic">
                      Cálculo: {brl(totalAtual)} - {brl(totalInvestido)} ={" "}
                      <span
                        className={cn("font-black", lucro >= 0 ? "text-positive" : "text-negative")}
                      >
                        {brl(lucro)}
                      </span>
                    </p>
                    <p className="text-[0.6rem] mt-1 opacity-70 italic">
                      * Todos os valores são arredondados individualmente antes da soma para
                      garantir precisão.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Composição */}
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                <Wallet className="size-3.5" /> Composição dos Ativos
              </h3>
              <div className="grid gap-2">
                {ativosDaCat.map((ativo) => {
                  const vAtual = valorAtual(ativo);
                  const peso = totalAtual > 0 ? (vAtual / totalAtual) * 100 : 0;
                  const isDestacado = tickersDestacados.includes(chaveTicker(ativo.ticker));
                  return (
                    <div
                      key={ativo.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-all duration-500",
                        isDestacado
                          ? "border-rose-500/50 bg-rose-500/5 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)] ring-1 ring-rose-500/20"
                          : "border-border/40 bg-card/40",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-lg text-[0.7rem] font-black",
                            isDestacado
                              ? "bg-negative/20 text-negative animate-pulse"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {ativo.ticker.slice(0, 4)}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{ativo.ticker}</p>
                          <p className="text-[0.65rem] text-muted-foreground">
                            {ativo.quantidade} unidades
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black tabular-nums">{brl(vAtual)}</p>
                        <p className="text-[0.65rem] font-bold text-muted-foreground">
                          {peso.toFixed(1)}% da cat.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <Separator className="bg-border/40" />

            {/* Movimentações */}
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                <ArrowRightLeft className="size-3.5" /> Últimas Movimentações
              </h3>
              <div className="grid gap-3">
                {aportesDaCat.length > 0 ? (
                  aportesDaCat.map((aporte) => (
                    <div key={aporte.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground tabular-nums">
                          {new Date(aporte.data).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </div>
                        <div className="font-bold">{aporte.ticker}</div>
                        <div
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[0.6rem] font-black uppercase tracking-tighter",
                            Number(aporte.quantidade) >= 0
                              ? "bg-positive/10 text-positive"
                              : "bg-negative/10 text-negative",
                          )}
                        >
                          {Number(aporte.quantidade) >= 0 ? "Compra" : "Venda"}
                        </div>
                      </div>
                      <div className="font-black tabular-nums">
                        {brl(Math.abs(Number(aporte.quantidade) * Number(aporte.preco)))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma movimentação registrada.
                  </p>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
