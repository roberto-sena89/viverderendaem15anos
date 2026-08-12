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
  const meta = "R$ 2.000.000";
  const anosRestantes = "11 anos";

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
              <div className="flex items-center gap-0.5 text-emerald-500">
                <TrendingUp className="size-3" />
                <span className="text-[0.5rem] font-semibold">{rendimento}</span>
              </div>
              <span className="text-[0.45rem] font-medium text-emerald-600/90 dark:text-emerald-400/90">+R$ 93.420</span>
            </div>
          </div>

          <div className="bg-card/80 border-border/40 rounded-xl border p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="size-3" />
              <span className="text-[0.5rem] font-medium uppercase tracking-wider">Lucro Total</span>
            </div>
            <p className="mt-1 font-bold text-sm leading-tight">R$ 152.480</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[0.5rem] font-semibold text-emerald-500">+18,4%</span>
              <span className="text-[0.45rem] font-medium text-emerald-600/90 dark:text-emerald-400/90">+R$ 23.150</span>
            </div>
          </div>

          <div className="bg-card/80 border-border/40 rounded-xl border p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <PieChart className="size-3" />
              <span className="text-[0.5rem] font-medium uppercase tracking-wider">Dividendos</span>
            </div>
            <p className="mt-1 font-bold text-sm leading-tight">R$ 48.920</p>
            <span className="mt-1 block text-[0.45rem] font-medium text-emerald-600/90 dark:text-emerald-400/90">YoC: 8,4%</span>
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
          <div className="space-y-2">
            {[
              { ticker: "PETR4", valor: "R$ 42,50", var: 2.4, varReal: 1.02 },
              { ticker: "HGLG11", valor: "R$ 128,90", var: -0.8, varReal: -1.03 },
              { ticker: "IVVB11", valor: "R$ 315,20", var: 1.2, varReal: 3.78 },
            ].map((ativo) => (
              <div key={ativo.ticker} className="flex items-center justify-between text-[0.55rem]">
                <div className="flex items-center gap-2">
                  <div className="bg-muted flex size-6 items-center justify-center rounded text-[0.4rem] font-bold">
                    {ativo.ticker.substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold">{ativo.ticker}</p>
                    <p className="text-muted-foreground">{ativo.valor}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-bold flex items-center justify-end gap-0.5",
                    ativo.var >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {ativo.var >= 0 ? "+" : ""}{ativo.var}%
                  </p>
                  <p className="text-[0.45rem] font-medium text-muted-foreground/80">
                    {ativo.varReal >= 0 ? "+" : "-"}R$ {Math.abs(ativo.varReal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
