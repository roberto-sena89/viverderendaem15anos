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
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 px-1">
      {resumoPorCategoria.map((cat) => (
        <div 
          key={cat.nome}
          className="bg-card/40 border-border/40 hover:bg-card/60 relative overflow-hidden rounded-xl border p-3 transition-all backdrop-blur-sm"
        >
          {/* Indicador de cor da categoria */}
          <div 
            className="absolute top-0 left-0 h-full w-1 opacity-60" 
            style={{ backgroundColor: cat.cor }}
          />
          
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground truncate text-[0.6rem] font-bold uppercase tracking-widest">
              {cat.nome}
            </span>
            
            <div className="flex flex-col items-baseline gap-0.5">
              <span className={cn(
                "text-[0.85rem] font-bold tabular-nums tracking-tight",
                cat.lucro >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {brl(cat.lucro, 2)}
              </span>
              
              <div className={cn(
                "flex items-center gap-1 text-[0.65rem] font-semibold",
                cat.lucro >= 0 ? "text-emerald-500/80" : "text-rose-500/80"
              )}>
                {cat.lucro >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                <span>{cat.lucroPct >= 0 ? "+" : ""}{cat.lucroPct.toFixed(2).replace(".", ",")}%</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
