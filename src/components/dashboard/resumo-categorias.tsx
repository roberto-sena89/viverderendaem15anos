import { useAtivosAoVivo, useCotacoesTempoReal, chaveTicker } from "@/lib/cotacoes-tempo-real";
import { tempoRelativo } from "@/components/status-cotacoes";
import { brl, valorAtual, arredondar, pct } from "@/lib/portfolio";
import { corCategoria } from "@/lib/cores-ativos";
import { Clock, AlertTriangle, Plus, PieChart, ChevronRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { getIconeCategoria } from "@/lib/icones-categorias";
import { cn } from "@/lib/utils";
import { DashboardCard } from "./dashboard-card";
import { useState, useEffect, useMemo, useId } from "react";
import { OverlayDetalhesCategoria } from "./overlay-detalhes-categoria";
import { useAlertasHistorico } from "@/lib/alertas-historico";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DeltaChip } from "@/components/panel";

/**
 * Componente que exibe o resumo de lucro/prejuízo por categoria de ativos.
 * Refatorado para design premium Investidor 10: intuitivo, sofisticado e responsivo.
 */
export function ResumoCategorias() {
  const { data: ativos = [] } = useAtivosAoVivo();
  const { atualizadoEm, status } = useCotacoesTempoReal();
  const { alertas } = useAlertasHistorico();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [destacarTickers, setDestacarTickers] = useState<string[]>([]);
  const baseId = useId();

  // Escutar evento de abertura de categoria (do Sino de Alertas)
  useEffect(() => {
    const handleAbrir = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.categoria) {
        setCategoriaSelecionada(detail.categoria);
        
        // Buscar tickers que causaram alertas nesta categoria nas últimas 24h
        const catAtivos = ativos.filter(a => a.categoria === detail.categoria);
        const umDiaAtras = Date.now() - 24 * 60 * 60 * 1000;
        const tickersDaCat = new Set(catAtivos.map(a => chaveTicker(a.ticker)));
        
        const tickersComAlerta = alertas
          .filter(alerta => alerta.em > umDiaAtras && tickersDaCat.has(chaveTicker(alerta.ticker)))
          .map(alerta => chaveTicker(alerta.ticker));
        
        setDestacarTickers(Array.from(new Set(tickersComAlerta)));
      }
    };

    window.addEventListener("app:abrir-categoria", handleAbrir);
    return () => window.removeEventListener("app:abrir-categoria", handleAbrir);
  }, [ativos, alertas]);

  const handleCloseOverlay = () => {
    setCategoriaSelecionada(null);
    setDestacarTickers([]);
  };

  // Re-renderiza para o tempo relativo
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 10000);
    return () => window.clearInterval(id);
  }, []);

  const categoriasUnicas = useMemo(
    () => Array.from(new Set(ativos.map((a) => a.categoria))),
    [ativos]
  );

  const resumoPorCategoria = useMemo(() => {
    return categoriasUnicas.map((cat) => {
      const ativosDaCat = ativos.filter((a) => a.categoria === cat);
      const totalInvestido = ativosDaCat.reduce((sum, a) => sum + arredondar(Number(a.quantidade) * Number(a.precoMedio)), 0);
      const totalAtual = ativosDaCat.reduce((sum, a) => sum + arredondar(valorAtual(a)), 0);
      const lucro = arredondar(totalAtual - totalInvestido);
      const lucroPct = totalInvestido > 0 ? arredondar((lucro / totalInvestido) * 100) : 0;
      
      const umDiaAtras = Date.now() - 24 * 60 * 60 * 1000;
      const tickersDaCat = new Set(ativosDaCat.map(a => a.ticker.toUpperCase().replace(/\.SA$/i, "")));
      const alertasRecentes = alertas.filter(alerta => 
        alerta.em > umDiaAtras && 
        tickersDaCat.has(alerta.ticker.toUpperCase())
      );
      
      return {
        nome: cat,
        lucro,
        lucroPct,
        cor: corCategoria(cat),
        alertas: alertasRecentes.length
      };
    }).sort((a, b) => b.lucro - a.lucro);
  }, [categoriasUnicas, ativos, alertas]);

  // Auditoria de arredondamento e integridade
  const auditoria = useMemo(() => {
    if (ativos.length === 0) return null;
    
    let totalInvestidoAtivos = 0;
    let totalAtualAtivos = 0;
    
    ativos.forEach(a => {
      totalInvestidoAtivos += arredondar(Number(a.quantidade) * Number(a.precoMedio));
      totalAtualAtivos += arredondar(valorAtual(a));
    });
    
    const totalLucroAtivos = arredondar(totalAtualAtivos - totalInvestidoAtivos);
    
    let totalLucroCategorias = 0;
    resumoPorCategoria.forEach(r => {
      totalLucroCategorias += r.lucro;
    });
    
    const discrepancia = arredondar(totalLucroAtivos - totalLucroCategorias);
    const integra = Math.abs(discrepancia) < 0.01;
    
    return {
      totalLucroAtivos,
      totalLucroCategorias,
      discrepancia,
      integra,
      data: new Date().toISOString()
    };
  }, [ativos, resumoPorCategoria]);

  // Log de auditoria em desenvolvimento
  useEffect(() => {
    if (auditoria && !auditoria.integra) {
      console.warn("[Auditoria] Discrepância de arredondamento detectada:", auditoria);
    }
  }, [auditoria]);

  if (ativos.length === 0) {
    return (
      <div className="mb-10 px-1">
        <DashboardCard className="flex flex-col items-center justify-center py-10 text-center border-dashed border-border/40 bg-transparent hover:bg-white/[0.02]">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <PieChart className="size-6 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">Nenhum ativo cadastrado</h3>
          <p className="text-xs text-muted-foreground max-w-[280px] mb-6">
            Adicione seus primeiros ativos para visualizar o resumo de performance por categoria.
          </p>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-[0.7rem] font-bold uppercase tracking-wider h-8">
            <Link to="/carteira" search={{ openAdd: true }}>
              <Plus className="mr-2 size-3" />
              Começar Agora
            </Link>
          </Button>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-10 mt-6">
      <div className="flex items-center justify-between px-3 h-4">
        <TooltipProvider>
          <div className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
            <span>Performance por Categoria</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info
                  tabIndex={0}
                  aria-label="O que é Performance por Categoria"
                  className="size-2.5 cursor-help rounded-sm text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-[0.7rem] bg-background/95 backdrop-blur-xl border-border/50">
                <p>Lucro acumulado e variação percentual por classe de ativo em relação ao custo médio.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground/50"
          title="Sincronização automática ativa"
        >
          <Clock className="size-2.5" />
          {status === "ao-vivo" && Date.now() - (atualizadoEm || 0) < 5000 ? (
            <span className="text-success font-black animate-pulse">ao vivo</span>
          ) : (
            tempoRelativo(atualizadoEm)
          )}
        </div>

        {auditoria && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  role="img"
                  aria-label={`Auditoria de dados: ${auditoria.integra ? "íntegra, sem discrepâncias" : "discrepância detectada"}`}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.55rem] font-bold uppercase tracking-wider border transition-colors cursor-help focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                    auditoria.integra
                      ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15 hover:text-emerald-700 focus-visible:text-emerald-700"
                      : "bg-amber-500/5 text-amber-600 border-amber-500/20 hover:bg-amber-500/15 hover:text-amber-700 focus-visible:text-amber-700"
                  )}
                >
                  {auditoria.integra ? <ShieldCheck className="size-2.5" /> : <AlertTriangle className="size-2.5" />}
                  <span>Dados Auditados</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-[0.7rem] bg-background/95 backdrop-blur-xl border-border/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <CheckCircle2 className="size-3" /> Camada de Auditoria Ativa
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <p>Soma dos ativos: <span className="text-foreground">{brl(auditoria.totalLucroAtivos)}</span></p>
                  <p>Soma das categorias: <span className="text-foreground">{brl(auditoria.totalLucroCategorias)}</span></p>
                  <p>Discrepância: <span className={auditoria.integra ? "text-emerald-600" : "text-amber-600"}>
                    {brl(auditoria.discrepancia)}
                  </span></p>
                </div>
                <p className="text-[0.6rem] border-t border-border/20 pt-1 mt-1 opacity-60 italic">
                  * Verificação em tempo real de integridade matemática e arredondamento (IEEE 754).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-2 sm:px-0">
        {resumoPorCategoria.map((cat, idx) => {
          const cardId = `${baseId}-card-${idx}`;
          const descId = `${baseId}-desc-${idx}`;
          
          return (
            <TooltipProvider key={cat.nome}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DashboardCard 
                    id={cardId}
                    role="button"
                    tabIndex={0}
                    ariaLabel={`Ver detalhes da categoria ${cat.nome}`}
                    aria-describedby={descId}
                    ariaExpanded={categoriaSelecionada === cat.nome}
                    className={cn(
                      "group relative border-border/40 hover:border-primary/20 transition-all duration-300 min-h-[152px] flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
                      categoriaSelecionada === cat.nome && "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary/40 bg-primary/5"
                    )}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        const catAtivos = ativos.filter(a => a.categoria === cat.nome);
                        const umDiaAtras = Date.now() - 24 * 60 * 60 * 1000;
                        const tickersDaCat = new Set(catAtivos.map(a => chaveTicker(a.ticker)));
                        const tickersComAlerta = alertas
                          .filter(alerta => alerta.em > umDiaAtras && tickersDaCat.has(chaveTicker(alerta.ticker)))
                          .map(alerta => chaveTicker(alerta.ticker));
                        
                        setDestacarTickers(Array.from(new Set(tickersComAlerta)));
                        setCategoriaSelecionada(cat.nome);
                      }
                    }}
                    onClick={() => {
                      const catAtivos = ativos.filter(a => a.categoria === cat.nome);
                      const umDiaAtras = Date.now() - 24 * 60 * 60 * 1000;
                      const tickersDaCat = new Set(catAtivos.map(a => chaveTicker(a.ticker)));
                      const tickersComAlerta = alertas
                        .filter(alerta => alerta.em > umDiaAtras && tickersDaCat.has(chaveTicker(alerta.ticker)))
                        .map(alerta => chaveTicker(alerta.ticker));
                      
                      setDestacarTickers(Array.from(new Set(tickersComAlerta)));
                      setCategoriaSelecionada(cat.nome);
                    }}
                  >
                    {/* Efeito de brilho dinâmico sofisticado */}
                    <div 
                      className="absolute -inset-1 opacity-[0.03] transition-opacity duration-700 group-hover:opacity-[0.08]"
                      style={{ background: `radial-gradient(circle at center, ${cat.cor}, transparent)` }}
                    />
                    
                    <div className="flex flex-col gap-4 w-full relative z-10 px-4">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 shadow-sm">
                            {(() => {
                              const Icon = getIconeCategoria(cat.nome);
                              return <Icon className="size-5" />;
                            })()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground font-black uppercase text-[0.62rem] tracking-[0.15em] group-hover:text-foreground transition-colors truncate max-w-[120px]">
                              {cat.nome}
                            </span>
                            <span className="text-[0.55rem] font-bold text-muted-foreground/40 uppercase tracking-widest">Categoria</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {cat.alertas > 0 && (
                            <div 
                              role="img"
                              aria-label={`${cat.alertas} alerta(s) recente(s) em ${cat.nome}`}
                              className="flex size-5 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 animate-pulse-slow shadow-sm"
                              title={`${cat.alertas} alerta(s)`}
                            >
                              <AlertTriangle className="size-3" />
                            </div>
                          )}
                          <div aria-hidden="true" className="size-6 flex items-center justify-center rounded-full border border-border/40 text-muted-foreground/40 group-hover:border-primary/30 group-hover:text-primary/60 transition-all">
                            <ChevronRight className="size-3" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className={cn(
                            "text-[1.625rem] font-bold tabular-nums tracking-tighter leading-none transition-colors duration-300",
                            cat.lucro >= 0 ? "text-positive" : "text-negative"
                          )}>
                            {brl(cat.lucro, 2)}
                          </p>
                          <DeltaChip value={cat.lucroPct} />
                        </div>
                        
                        <div className="flex items-center justify-between w-full border-t border-border/40 pt-2">
                          <span id={descId} className="text-[0.6rem] font-bold text-muted-foreground/30 uppercase tracking-tighter">
                            Resultado: {cat.lucro >= 0 ? "Lucro" : "Prejuízo"}
                          </span>
                          <span className="text-[0.65rem] font-bold tabular-nums text-muted-foreground/40">
                            {pct(cat.lucroPct, 2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Overlay de profundidade no hover */}
                    <div 
                      className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-500 group-hover:opacity-100"
                      style={{ 
                        background: `radial-gradient(120px circle at center, ${cat.cor}15, transparent)` 
                        }}
                      />
                  </DashboardCard>
                </TooltipTrigger>
                <TooltipContent className="text-[0.7rem] bg-background/95 backdrop-blur-xl border-border/50">
                  <p>Clique para ver detalhes de <strong>{cat.nome}</strong></p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      <OverlayDetalhesCategoria 
        categoria={categoriaSelecionada}
        onClose={handleCloseOverlay}
        tickersDestacados={destacarTickers}
      />
    </div>
  );
}