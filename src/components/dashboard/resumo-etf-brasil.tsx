import { useAtivosAoVivo } from "@/lib/cotacoes-tempo-real";
import { brl, valorAtual } from "@/lib/portfolio";
import { corCategoria } from "@/lib/cores-ativos";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCard } from "./dashboard-card";

/**
 * Componente que exibe especificamente o lucro/prejuízo da categoria "ETF Brasil".
 * Mantém a mesma estrutura visual do ResumoCategorias.
 */
export function ResumoEtfBrasil() {
  const { data: ativos = [] } = useAtivosAoVivo();

  if (ativos.length === 0) return null;

  // Filtrar apenas ativos da categoria "ETF Brasil"
  const cat = "ETF Brasil";
  const ativosDaCat = ativos.filter((a) => a.categoria === cat);
  
  // Se não houver ativos nesta categoria, podemos opcionalmente não mostrar nada
  // ou mostrar com valores zerados. O pedido diz "quero que esteja nela a informação",
  // sugerindo que deve existir.
  const totalInvestido = ativosDaCat.reduce((sum, a) => sum + (Number(a.quantidade) * Number(a.precoMedio)), 0);
  const totalAtual = ativosDaCat.reduce((sum, a) => sum + valorAtual(a), 0);
  const lucro = totalAtual - totalInvestido;
  const lucroPct = totalInvestido > 0 ? (lucro / totalInvestido) * 100 : 0;
  const cor = corCategoria(cat);

  return (
    <div className="mb-8 px-1">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        <DashboardCard className="group">
          {/* Indicador de cor da categoria */}
          <div 
            className="absolute top-0 left-0 h-full w-1.5 opacity-80 transition-opacity group-hover:opacity-100" 
            style={{ backgroundColor: cor }}
          />
          
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground truncate text-[0.7rem] font-bold uppercase tracking-[0.15em] opacity-80 group-hover:opacity-100">
              {cat}
            </span>
            
            <div className="flex flex-col items-baseline gap-1">
              <span className={cn(
                "text-[1.1rem] font-black tabular-nums tracking-tight leading-none",
                lucro >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {brl(lucro, 2)}
              </span>
              
              <div className={cn(
                "flex items-center gap-1.5 text-[0.75rem] font-bold",
                lucro >= 0 ? "text-emerald-500/90" : "text-rose-500/90"
              )}>
                {lucro >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                <span className="tabular-nums">{lucroPct >= 0 ? "+" : ""}{lucroPct.toFixed(2).replace(".", ",")}%</span>
              </div>
            </div>
          </div>
          
          {/* Sutil gradiente de fundo no hover */}
          <div 
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-5"
            style={{ backgroundColor: cor }}
          />
        </DashboardCard>
      </div>
    </div>
  );
}
