import { useAtivosAoVivo, useCotacoesTempoReal, chaveTicker } from "@/lib/cotacoes-tempo-real";
import { tempoRelativo } from "@/components/status-cotacoes";
import { brl, valorAtual } from "@/lib/portfolio";
import { corCategoria } from "@/lib/cores-ativos";
import { TrendingDown, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCard } from "./dashboard-card";
import { useState, useEffect, useMemo } from "react";
import { OverlayDetalhesCategoria } from "./overlay-detalhes-categoria";
import { useAlertasHistorico } from "@/lib/alertas-historico";

/**
 * Componente que exibe o resumo de lucro/prejuízo por categoria de ativos.
 * Renderizado logo abaixo das abas de navegação no dashboard.
 */
export function ResumoCategorias() {
  const { data: ativos = [] } = useAtivosAoVivo();
  const { atualizadoEm, status } = useCotacoesTempoReal();
  const { alertas } = useAlertasHistorico();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [destacarTickers, setDestacarTickers] = useState<string[]>([]);

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

  // Limpar destaques ao fechar o overlay
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

  // Agrupar ativos por categoria e calcular totais
  const categoriasUnicas = useMemo(
    () => Array.from(new Set(ativos.map((a) => a.categoria))),
    [ativos]
  );

  const resumoPorCategoria = useMemo(() => {
    return categoriasUnicas.map((cat) => {
      const ativosDaCat = ativos.filter((a) => a.categoria === cat);
      const totalInvestido = ativosDaCat.reduce((sum, a) => sum + (Number(a.quantidade) * Number(a.precoMedio)), 0);
      const totalAtual = ativosDaCat.reduce((sum, a) => sum + valorAtual(a), 0);
      const lucro = totalAtual - totalInvestido;
      const lucroPct = totalInvestido > 0 ? (lucro / totalInvestido) * 100 : 0;
      
      // Encontrar alertas recentes (últimas 24h) para ativos desta categoria
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

  if (ativos.length === 0) return null;

  return (
    <div className="space-y-3 mb-8">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
          Performance por Categoria
        </h2>
        <div 
          className="flex items-center gap-1.5 text-[0.65rem] font-bold text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          title="Sincronização automática ativa"
        >
          <Clock className="size-3" />
          {status === "ao-vivo" && Date.now() - (atualizadoEm || 0) < 5000 ? (
            <span className="text-success animate-pulse">atualizado agora</span>
          ) : (
            tempoRelativo(atualizadoEm)
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 px-1">
        {resumoPorCategoria.map((cat) => (
          <DashboardCard 
            key={cat.nome}
            className="group relative"
            onClick={() => {
              // Ao abrir manualmente, também destacamos os alertas recentes
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
            {/* Indicador de cor da categoria */}
            <div 
              className="absolute top-0 left-0 h-full w-1 opacity-60 transition-all duration-300 group-hover:w-1.5 group-hover:opacity-100" 
              style={{ backgroundColor: cat.cor }}
            />
            
            <div className="flex flex-col gap-1.5 h-full text-center">
              <div className="flex items-center justify-center relative w-full px-4">
                <span className="text-muted-foreground truncate text-[0.65rem] font-bold uppercase tracking-[0.15em] opacity-70 group-hover:opacity-100 transition-opacity">
                  {cat.nome}
                </span>
                {cat.alertas > 0 && (
                  <div 
                    className="absolute right-0 flex size-4 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 animate-pulse shrink-0"
                    title={`${cat.alertas} alerta(s) de variação relevante nas últimas 24h`}
                  >
                    <AlertTriangle className="size-2.5" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-center justify-center -space-y-0.5">
                <div className={cn(
                  "text-[1.1rem] font-black tabular-nums tracking-tighter leading-none",
                  cat.lucro >= 0 ? "text-success" : "text-destructive"
                )}>
                  {brl(cat.lucro, 2)}
                </div>
                
                <div className={cn(
                  "flex items-center justify-center gap-1 text-[0.7rem] font-bold tracking-tight",
                  cat.lucro >= 0 ? "text-success/90" : "text-destructive/90"
                )}>
                  {cat.lucro >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  <span className="tabular-nums">{cat.lucroPct >= 0 ? "+" : ""}{cat.lucroPct.toFixed(2).replace(".", ",")}%</span>
                </div>
              </div>
            </div>
            
            {/* Brilho sutil no hover */}
            <div 
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
              style={{ 
                background: `radial-gradient(circle at top right, ${cat.cor}, transparent 70%)` 
              }}
            />
          </DashboardCard>
        ))}
      </div>

      <OverlayDetalhesCategoria 
        categoria={categoriaSelecionada}
        onClose={handleCloseOverlay}
        tickersDestacados={destacarTickers}
      />
    </div>
  );
}