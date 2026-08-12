import { useMemo, useState, useId } from "react";
import { Coins, PiggyBank, Plus, TrendingUp, Wallet, Info } from "lucide-react";
import { DeltaChip } from "@/components/panel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DialogTransacao } from "@/components/dialog-transacao";
import { DashboardCard } from "./dashboard/dashboard-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { retornoPonderado12m } from "@/lib/analise-carteira";
import { chaveTicker, useAtivosAoVivo, useCotacoesTempoReal } from "@/lib/cotacoes-tempo-real";
import { useDividendos } from "@/lib/data";
import { useDesempenho12m } from "@/lib/desempenho-12m";
import { brl, dividendos12m, pct, resumoCarteira, valorAtual } from "@/lib/portfolio";

function CartaoResumo({
  titulo,
  icone: Icone,
  onClick,
  children,
  tooltip,
}: {
  titulo: string;
  icone: typeof Wallet;
  onClick: () => void;
  children: React.ReactNode;
  tooltip?: string;
}) {
  const tooltipId = useId();
  return (
    <DashboardCard
      onClick={onClick}
      ariaLabel={`Ver detalhes e fórmulas de ${titulo}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground duration-300">
          <Icone className="size-5 shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[0.68rem] font-black tracking-[0.15em] text-muted-foreground uppercase group-hover:text-foreground transition-colors">
              {titulo}
            </p>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-describedby={tooltipId}
                      className="inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                    >
                      <Info className="size-3 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
                      <span className="sr-only">Saiba mais sobre {titulo}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    id={tooltipId}
                    role="tooltip"
                    className="max-w-[200px] text-[0.75rem] leading-relaxed"
                  >
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <span className="sr-only">Ver detalhes</span>
        </div>
        <div className="size-5 rounded-full border border-border/40 flex items-center justify-center text-[0.6rem] text-muted-foreground/40 group-hover:border-primary/40 group-hover:text-primary/60 transition-all">
          ?
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </DashboardCard>
  );
}


interface Linha {
  rotulo: string;
  valor: string;
  formula?: string;
  tom?: "default" | "positive" | "negative";
}

interface Detalhe {
  titulo: string;
  descricao: string;
  linhas: Linha[];
}

function PainelDetalhe({ detalhe, onClose }: { detalhe: Detalhe | null; onClose: () => void }) {
  return (
    <Dialog open={!!detalhe} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {detalhe && (
          <>
            <DialogHeader>
              <DialogTitle>{detalhe.titulo}</DialogTitle>
              <DialogDescription>{detalhe.descricao}</DialogDescription>
            </DialogHeader>
            <div className="divide-y divide-border rounded-md border border-border">
              {detalhe.linhas.map((l) => (
                <div key={l.rotulo} className="p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">{l.rotulo}</p>
                    <p
                      className={`num text-sm font-semibold ${
                        l.tom === "positive"
                          ? "text-success"
                          : l.tom === "negative"
                            ? "text-destructive"
                            : "text-foreground"
                      }`}
                    >
                      {l.valor}
                    </p>
                  </div>
                  {l.formula && (
                    <p className="num mt-1 text-[0.82rem] break-words text-muted-foreground">
                      {l.formula}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Faixa de indicadores da carteira (padrão Investidor 10). */
export function ResumoKpis({ mostrarLancamento = false }: { mostrarLancamento?: boolean }) {
  const { data: ativos = [] } = useAtivosAoVivo();
  const { data: proventos = [] } = useDividendos();
  const { mapa } = useCotacoesTempoReal();
  const [aberto, setAberto] = useState<Detalhe | null>(null);

  const tickers = useMemo(() => ativos.map((a) => a.ticker), [ativos]);
  const { porTicker } = useDesempenho12m(tickers);
  const ponderado12m = useMemo(() => {
    const retornos = new Map<string, number | null>();
    for (const [ticker, nota] of porTicker) retornos.set(ticker, nota.retorno12m);
    return retornoPonderado12m(ativos, retornos);
  }, [ativos, porTicker]);
  const retorno12m = ponderado12m.retornoPct;

  const resumo = resumoCarteira(ativos);
  const recebidos12m = dividendos12m(proventos);
  const totalProventos = proventos.reduce((s, d) => s + d.valor, 0);
  const yieldOnCost = resumo.totalInvestido > 0 ? (recebidos12m / resumo.totalInvestido) * 100 : 0;
  const rentComProventos =
    resumo.totalInvestido > 0
      ? ((resumo.lucroTotal + totalProventos) / resumo.totalInvestido) * 100
      : 0;

  /** Variação do dia da carteira em R$ e %, com o fechamento anterior por ativo. */
  const variacaoHoje = useMemo(() => {
    let delta = 0;
    let valorCoberto = 0;
    for (const a of ativos) {
      const c = mapa.get(chaveTicker(a.ticker));
      if (!c || c.preco === null || c.preco <= 0 || c.variacaoPercent === null) continue;
      const valor = valorAtual(a);
      if (valor <= 0) continue;
      delta += (valor * c.variacaoPercent) / (100 + c.variacaoPercent);
      valorCoberto += valor;
    }
    if (valorCoberto <= 0) return null;
    return { delta, pct: (delta / (valorCoberto - delta)) * 100, cobertura: valorCoberto };
  }, [ativos, mapa]);

  const fmtDelta = (v: number) => `${v >= 0 ? "+" : ""}${brl(v, 2)}`;
  const fmtPctDelta = (v: number) => `${v >= 0 ? "+" : ""}${pct(v, 2)}`;

  const detalhePatrimonio: Detalhe = {
    titulo: "Patrimônio total",
    descricao: "Soma do valor de mercado de todos os ativos da carteira.",
    linhas: [
      {
        rotulo: "Valor de mercado",
        valor: brl(resumo.totalAtual, 2),
        formula: "Σ (quantidade × preço atual) de cada ativo",
      },
      {
        rotulo: "Valor investido",
        valor: brl(resumo.totalInvestido, 2),
        formula: "Σ (quantidade × preço médio) de cada ativo",
      },
      {
        rotulo: "Variação",
        valor: brl(resumo.totalAtual - resumo.totalInvestido, 2),
        formula: "valor de mercado − valor investido",
        tom: resumo.lucroTotal >= 0 ? "positive" : "negative",
      },
      {
        rotulo: "Ativos na carteira",
        valor: String(ativos.length),
        formula: "contagem de posições ativas",
      },
      ...(variacaoHoje
        ? [
            {
              rotulo: "Variação do dia (mercado)",
              valor: `${fmtPctDelta(variacaoHoje.pct)} · ${fmtDelta(variacaoHoje.delta)}`,
              formula: `Σ quantidade × (preço atual − fechamento anterior) de ${variacaoHoje.cobertura.toLocaleString("pt-BR")} em ativos cotados`,
              tom: variacaoHoje.delta >= 0 ? ("positive" as const) : ("negative" as const),
            },
          ]
        : []),
      {
        rotulo: "Maior posição",
        valor: ativos.length
          ? `${[...ativos].sort((a, b) => valorAtual(b) - valorAtual(a))[0].ticker} · ${brl(
              valorAtual([...ativos].sort((a, b) => valorAtual(b) - valorAtual(a))[0]),
              2,
            )}`
          : "—",
        formula: "ativo com maior valor de mercado",
      },
    ],
  };

  const detalheLucro: Detalhe = {
    titulo: "Lucro total",
    descricao: "Ganho de capital não realizado somado aos proventos já recebidos.",
    linhas: [
      {
        rotulo: "Ganho de capital",
        valor: brl(resumo.lucroTotal, 2),
        formula: `${brl(resumo.totalAtual, 2)} − ${brl(resumo.totalInvestido, 2)}`,
        tom: resumo.lucroTotal >= 0 ? "positive" : "negative",
      },
      {
        rotulo: "Proventos acumulados",
        valor: brl(totalProventos, 2),
        formula: "Σ valor de todos os proventos lançados",
      },
      {
        rotulo: "Resultado total",
        valor: brl(resumo.lucroTotal + totalProventos, 2),
        formula: "ganho de capital + proventos acumulados",
        tom: resumo.lucroTotal + totalProventos >= 0 ? "positive" : "negative",
      },
      {
        rotulo: "Retorno sobre o investido",
        valor: pct(rentComProventos, 2),
        formula: "(ganho de capital + proventos) ÷ valor investido × 100",
        tom: rentComProventos >= 0 ? "positive" : "negative",
      },
    ],
  };

  const detalheProventos: Detalhe = {
    titulo: "Proventos recebidos (12M)",
    descricao: "Dividendos, JCP e rendimentos creditados nos últimos 12 meses.",
    linhas: [
      {
        rotulo: "Recebido nos últimos 12 meses",
        valor: brl(recebidos12m, 2),
        formula: "Σ proventos com data dentro dos 12 meses corridos",
      },
      {
        rotulo: "Total histórico",
        valor: brl(totalProventos, 2),
        formula: "Σ de todos os proventos",
      },
      {
        rotulo: "Média mensal (12M)",
        valor: brl(recebidos12m / 12, 2),
        formula: "recebido 12M ÷ 12",
      },
      {
        rotulo: "Yield on cost (12M)",
        valor: pct(yieldOnCost, 2),
        formula: "recebido 12M ÷ valor investido × 100",
      },
      {
        rotulo: "Projeção 12M (DY dos ativos)",
        valor: brl(resumo.dividendosEstimados12m, 2),
        formula: "Σ (valor de mercado do ativo × DY ÷ 100)",
      },
      {
        rotulo: "Lançamentos",
        valor: String(proventos.length),
        formula: "quantidade de proventos registrados",
      },
    ],
  };

  const detalheRentabilidade: Detalhe = {
    titulo: "Rentabilidade",
    descricao: "Variação percentual da carteira sobre o capital investido.",
    linhas: [
      {
        rotulo: "Rentabilidade (capital)",
        valor: pct(resumo.rentabilidade, 2),
        formula: "(valor de mercado − valor investido) ÷ valor investido × 100",
        tom: resumo.rentabilidade >= 0 ? "positive" : "negative",
      },
      ...(retorno12m !== null
        ? [
            {
              rotulo: "Rentabilidade 12 meses",
              valor: pct(retorno12m, 2),
              formula: "média ponderada pelo valor atual do retorno 12M dos ativos",
              tom: retorno12m >= 0 ? ("positive" as const) : ("negative" as const),
            },
          ]
        : []),
      {
        rotulo: "Rentabilidade com proventos",
        valor: pct(rentComProventos, 2),
        formula: "(ganho de capital + proventos) ÷ valor investido × 100",
        tom: rentComProventos >= 0 ? "positive" : "negative",
      },
      {
        rotulo: "DY da carteira",
        valor: pct(resumo.dyCarteira, 2),
        formula: "proventos estimados 12M ÷ valor de mercado × 100",
      },
      {
        rotulo: "Base de cálculo",
        valor: `${brl(resumo.totalInvestido, 2)} investidos`,
        formula: "Σ (quantidade × preço médio) de cada ativo",
      },
    ],
  };

  return (
    <>
      {mostrarLancamento && (
        <div className="flex justify-start">
          <DialogTransacao>
            <Button
              size="default"
              className="font-display gap-2 bg-primary px-5 text-[15px] font-semibold tracking-[0.01em] text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="size-5" />
              Adicionar Lançamento
            </Button>
          </DialogTransacao>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoResumo
          titulo="Patrimônio total"
          icone={Wallet}
          onClick={() => setAberto(detalhePatrimonio)}
          tooltip="A variação percentual ao lado do valor principal representa a rentabilidade total acumulada sobre o capital investido."
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-[1.625rem] font-bold tracking-tighter tabular-nums leading-none text-foreground group-hover:text-primary transition-colors duration-300">
                {brl(resumo.totalAtual, 2)}
              </p>
              <DeltaChip value={resumo.rentabilidade} />
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
              <div className="flex flex-col">
                <span className="text-[0.62rem] font-bold text-muted-foreground/60 uppercase tracking-wider">Investido</span>
                <span className="text-xs font-bold tabular-nums text-foreground/80">{brl(resumo.totalInvestido, 2)}</span>
              </div>
              {variacaoHoje ? (
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span className="text-[0.62rem] font-bold text-muted-foreground/60 uppercase tracking-wider">Hoje</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-2.5 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[180px] text-[0.7rem]">
                          Variação percentual e absoluta dos ativos considerando a última cotação do dia.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className={cn(
                    "text-xs font-bold tabular-nums",
                    variacaoHoje.delta >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {fmtDelta(variacaoHoje.delta)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </CartaoResumo>

        <CartaoResumo
          titulo="Lucro total"
          icone={PiggyBank}
          onClick={() => setAberto(detalheLucro)}
          tooltip="Soma do ganho de capital (valor atual - valor investido) com todos os proventos recebidos."
        >
          <div className="flex flex-col gap-2">
            <p className={cn(
              "text-[1.625rem] font-bold tracking-tighter tabular-nums leading-none group-hover:scale-105 transition-transform duration-300",
              resumo.lucroTotal >= 0 ? "text-success" : "text-destructive"
            )}>
              {brl(resumo.lucroTotal, 2)}
            </p>
            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
              <div className="flex flex-col">
                <span className="text-[0.62rem] font-bold text-muted-foreground/60 uppercase tracking-wider">Capital</span>
                <span className={cn(
                  "text-xs font-bold tabular-nums",
                  resumo.lucroTotal >= 0 ? "text-success/80" : "text-destructive/80"
                )}>{brl(resumo.lucroTotal, 2)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[0.62rem] font-bold text-muted-foreground/60 uppercase tracking-wider">Dividendos</span>
                <span className="text-xs font-bold tabular-nums text-foreground/80">{brl(totalProventos, 2)}</span>
              </div>
            </div>
          </div>
        </CartaoResumo>

        <CartaoResumo
          titulo="Proventos recebidos (12M)"
          icone={Coins}
          onClick={() => setAberto(detalheProventos)}
          tooltip="Total de dividendos e JCP recebidos nos últimos 12 meses corridos."
        >
          <div className="flex flex-col gap-2">
            <p className="text-[1.625rem] font-bold tracking-tighter tabular-nums leading-none text-foreground group-hover:text-primary transition-colors duration-300">
              {brl(recebidos12m, 2)}
            </p>
            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
              <div className="flex flex-col">
                <span className="text-[0.62rem] font-bold text-muted-foreground/60 uppercase tracking-wider">Histórico</span>
                <span className="text-xs font-bold tabular-nums text-foreground/80">{brl(totalProventos, 2)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[0.62rem] font-bold text-muted-foreground/60 uppercase tracking-wider">Média</span>
                <span className="text-xs font-bold tabular-nums text-foreground/80">{brl(recebidos12m / 12, 2)}</span>
              </div>
            </div>
          </div>
        </CartaoResumo>

        <CartaoResumo
          titulo="Rentabilidade"
          icone={TrendingUp}
          onClick={() => setAberto(detalheRentabilidade)}
          tooltip="Variação percentual total e dos últimos 12 meses da carteira."
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className={cn(
                "text-[1.625rem] font-bold tracking-tighter tabular-nums leading-none group-hover:scale-105 transition-transform duration-300",
                resumo.rentabilidade >= 0 ? "text-success" : "text-destructive"
              )}>
                {pct(resumo.rentabilidade, 2)}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[0.62rem] font-bold text-muted-foreground uppercase tracking-widest">Total</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-2.5 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[180px] text-[0.7rem]">
                      Variação acumulada desde o primeiro aporte (preço atual vs preço médio).
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[0.62rem] font-bold text-muted-foreground/60 uppercase tracking-wider">12 Meses</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-2.5 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[180px] text-[0.7rem]">
                        Retorno ponderado dos ativos nos últimos 12 meses.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className={cn(
                  "text-xs font-bold tabular-nums",
                  retorno12m === null ? "text-muted-foreground/50" : retorno12m >= 0 ? "text-success/80" : "text-destructive/80"
                )}>{retorno12m === null ? "—" : pct(retorno12m, 2)}</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <span className="text-[0.62rem] font-bold text-muted-foreground/60 uppercase tracking-wider">Yield</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-2.5 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[180px] text-[0.7rem]">
                        Dividend Yield estimado da carteira para os próximos 12 meses.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-xs font-bold tabular-nums text-foreground/80">{pct(resumo.dyCarteira, 2)}</span>
              </div>
            </div>
          </div>
        </CartaoResumo>

      </div>

      <PainelDetalhe detalhe={aberto} onClose={() => setAberto(null)} />
    </>
  );
}
