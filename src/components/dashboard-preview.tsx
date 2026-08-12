import { TrendingUp, Wallet, Target, PieChart, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardPreviewProps {
  className?: string;
}

/**
 * Preview estático do dashboard para uso em mockups e landing pages.
 * Simula a interface autenticada com dados de exemplo realistas.
 */
export function DashboardPreview({ className }: DashboardPreviewProps) {
  const patrimonio = "R$ 847.350";
  const rendimento = "+12,4%";

  const dadosGrafico = [
    { mes: "Jan", valor: 65 },
    { mes: "Fev", valor: 72 },
    { mes: "Mar", valor: 68 },
    { mes: "Abr", valor: 85 },
    { mes: "Mai", valor: 92 },
    { mes: "Jun", valor: 100 },
  ];

  return (
    <div className={cn("bg-background flex h-full flex-col overflow-hidden text-foreground", className)}>
      {/* Header simulado */}
      <div className="border-border/40 bg-card/50 flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 flex size-7 items-center justify-center rounded-lg">
            <span className="text-primary font-bold text-[0.5rem]">VR15</span>
          </div>
          <span className="font-bold text-[0.65rem] tracking-tight">Painel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted size-2 rounded-full" />
          <div className="bg-muted size-2 rounded-full" />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 space-y-4 overflow-hidden p-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card/80 border-border/40 rounded-xl border p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="size-3" />
              <span className="text-[0.5rem] font-medium uppercase tracking-wider">Patrimônio</span>
            </div>
            <p className="mt-1 font-bold text-sm leading-tight">{patrimonio}</p>
            <div className="mt-1 flex items-center justify-between">
              <div className="flex items-center gap-0.5 text-primary">
                <TrendingUp className="size-3" />
                <span className="text-[0.5rem] font-semibold">{rendimento}</span>
              </div>
              <span className="text-[0.45rem] font-medium text-primary/90 dark:text-primary/90">+R$ 93.420</span>
            </div>
          </div>

          <div className="bg-card/80 border-border/40 rounded-xl border p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="size-3" />
              <span className="text-[0.5rem] font-medium uppercase tracking-wider">Lucro Total</span>
            </div>
            <p className="mt-1 font-bold text-sm leading-tight">R$ 152.480</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[0.5rem] font-semibold text-primary">+18,4%</span>
              <span className="text-[0.45rem] font-medium text-primary/90 dark:text-primary/90">+R$ 23.150</span>
            </div>
          </div>

          <div className="bg-card/80 border-border/40 rounded-xl border p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <PieChart className="size-3" />
              <span className="text-[0.5rem] font-medium uppercase tracking-wider">Dividendos</span>
            </div>
            <p className="mt-1 font-bold text-sm leading-tight">R$ 48.920</p>
            <span className="mt-1 block text-[0.45rem] font-medium text-primary/90 dark:text-primary/90">YoC: 8,4%</span>
          </div>
        </div>

        {/* Gráfico simulado */}
        <div className="bg-card/80 border-border/40 flex-1 rounded-xl border p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Evolução patrimonial
            </span>
            <button className="text-primary flex items-center gap-0.5 text-[0.5rem] font-medium">
              Ver detalhes <ArrowUpRight className="size-2.5" />
            </button>
          </div>

          {/* Mini chart de barras */}
          <div className="flex h-16 items-end justify-between gap-1 px-1">
            {dadosGrafico.map((d, i) => (
              <div key={d.mes} className="group flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all group-hover:bg-primary",
                    i === dadosGrafico.length - 1 ? "bg-primary" : "bg-primary/40",
                  )}
                  style={{ height: `${d.valor}%` }}
                />
                <span className="text-[0.4rem] text-muted-foreground">{d.mes}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de ativos simulada */}
        <div className="bg-card/80 border-border/40 rounded-xl border p-3">
          <div className="space-y-3">
            {[
              { ticker: "PETR4", valor: "R$ 42,50", var: 2.4, varReal: 1.02, lucro: 12540.50, lucroPct: 24.5 },
              { ticker: "HGLG11", valor: "R$ 128,90", var: -0.8, varReal: -1.03, lucro: 4320.15, lucroPct: 8.2 },
              { ticker: "IVVB11", valor: "R$ 315,20", var: 1.2, varReal: 3.78, lucro: -1250.40, lucroPct: -3.8 },
            ].map((ativo) => (
              <div key={ativo.ticker} className="flex items-center justify-between text-[0.55rem]">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-[0.5rem] font-bold shadow-sm transition-transform hover:scale-105",
                    ativo.var >= 0 ? "bg-primary/10 text-primary dark:text-primary" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    {ativo.ticker.substring(0, 2)}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold text-[0.65rem] tracking-tight">{ativo.ticker}</p>
                    <div className="flex items-center gap-1.5 text-[0.45rem]">
                      <span className="text-muted-foreground font-medium">{ativo.valor}</span>
                      <span className={cn(
                        "font-bold px-1 rounded-[2px] bg-opacity-10",
                        ativo.var >= 0 ? "text-primary bg-primary" : "text-rose-500 bg-rose-500"
                      )}>
                        {ativo.var >= 0 ? "↑" : "↓"} {Math.abs(ativo.var)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col gap-0.5">
                  <p className={cn(
                    "font-bold text-[0.65rem] tabular-nums",
                    ativo.lucro >= 0 ? "text-primary" : "text-rose-500"
                  )}>
                    {ativo.lucro >= 0 ? "+" : "-"} R$ {Math.abs(ativo.lucro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[0.45rem] font-bold uppercase tracking-wider text-muted-foreground/90">
                    <span className={cn(
                      ativo.lucroPct >= 0 ? "text-primary/80" : "text-rose-500/80"
                    )}>
                      {ativo.lucroPct >= 0 ? "+" : ""}{ativo.lucroPct}%
                    </span>
                    <span className="ml-1 opacity-60">L/P</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
