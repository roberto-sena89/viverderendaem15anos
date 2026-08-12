import { useAtivosAoVivo } from "@/lib/cotacoes-tempo-real";
import { brl, valorAtual } from "@/lib/portfolio";
import { corCategoria } from "@/lib/cores-ativos";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Componente que exibe o resumo de lucro/prejuízo por categoria de ativos.
 * Renderizado logo abaixo das abas de navegação no dashboard.
 */
export function ResumoCategorias() {
  const { data: ativos = [] } = useAtivosAoVivo();

  if (ativos.length === 0) return null;

  // Agrupar ativos por categoria e calcular totais
  const categoriasUnicas = Array.from(new Set(ativos.map((a) => a.categoria)));
  
  const resumoPorCategoria = categoriasUnicas.map((cat) => {
    const ativosDaCat = ativos.filter((a) => a.categoria === cat);
    const totalInvestido = ativosDaCat.reduce((sum, a) => sum + (Number(a.quantidade) * Number(a.precoMedio)), 0);
    const totalAtual = ativosDaCat.reduce((sum, a) => sum + valorAtual(a), 0);
    const lucro = totalAtual - totalInvestido;
    const lucroPct = totalInvestido > 0 ? (lucro / totalInvestido) * 100 : 0;
    
    return {
      nome: cat,
      lucro,
      lucroPct,
      cor: corCategoria(cat)
    };
  }).sort((a, b) => b.lucro - a.lucro);

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 px-1">
      {resumoPorCategoria.map((cat) => (
        <div 
          key={cat.nome}
          className="bg-card/40 border-border/40 hover:bg-card/60 relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg backdrop-blur-md group"
        >
          {/* Indicador de cor da categoria */}
          <div 
            className="absolute top-0 left-0 h-full w-1.5 opacity-80 transition-opacity group-hover:opacity-100" 
            style={{ backgroundColor: cat.cor }}
          />
          
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground truncate text-[0.7rem] font-bold uppercase tracking-[0.15em] opacity-80 group-hover:opacity-100">
              {cat.nome}
            </span>
            
            <div className="flex flex-col items-baseline gap-1">
              <span className={cn(
                "text-[1.1rem] font-black tabular-nums tracking-tight leading-none",
                cat.lucro >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {brl(cat.lucro, 2)}
              </span>
              
              <div className={cn(
                "flex items-center gap-1.5 text-[0.75rem] font-bold",
                cat.lucro >= 0 ? "text-emerald-500/90" : "text-rose-500/90"
              )}>
                {cat.lucro >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                <span className="tabular-nums">{cat.lucroPct >= 0 ? "+" : ""}{cat.lucroPct.toFixed(2).replace(".", ",")}%</span>
              </div>
            </div>
          </div>
          
          {/* Sutil gradiente de fundo no hover */}
          <div 
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-5"
            style={{ backgroundColor: cat.cor }}
          />
        </div>
      ))}
    </div>
  );
}
