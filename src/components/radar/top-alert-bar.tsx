import { useState, useEffect } from "react";
import { Bell, X, ArrowRight, TrendingUp, TrendingDown, ChevronRight, ChevronLeft, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { getRadarAlertas } from "@/lib/radar-alertas.functions";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TopAlertBar() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const fetchAlertas = useServerFn(getRadarAlertas);

  useEffect(() => {
    fetchAlertas().then(setAlertas).catch(() => {});
  }, []);

  if (!visivel || alertas.length === 0) return null;

  const alerta = alertas[indiceAtivo];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      className="relative z-50 border-b border-emerald-500/20 bg-emerald-950/40 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 font-mono text-[11px] tracking-tight text-emerald-100">
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <Bell className="size-3 text-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-400 uppercase">[RADAR ALERT]</span>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={alerta.id}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="flex items-center gap-2 truncate"
            >
              <span className="font-bold border border-emerald-500/30 px-1 rounded bg-emerald-500/10 text-emerald-300">
                {alerta.ticker}
              </span>
              <span className="truncate opacity-90">{alerta.titulo}: {alerta.corpo}</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/20 text-[9px] font-bold hover:bg-emerald-500/30 transition-all group shrink-0">
                    DETALHES
                    <ArrowRight className="size-2.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 border-emerald-500/30 bg-emerald-950/95 p-0 backdrop-blur-xl shadow-2xl overflow-hidden">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{alerta.ticker}</h4>
                        <p className="text-[10px] text-emerald-100/60">Análise de Impacto IA</p>
                      </div>
                      <div className="text-right">
                        <div className={`flex items-center gap-1 text-xs font-bold ${alerta.detalhes.variacao >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {alerta.detalhes.variacao >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          {alerta.detalhes.variacao > 0 ? '+' : ''}{alerta.detalhes.variacao.toFixed(2)}%
                        </div>
                        <p className="text-[10px] text-emerald-100/60">Últimas 24h</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] text-emerald-100/50 uppercase tracking-tighter">Ranking</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-rose-400/80 line-through">#{alerta.detalhes.ranking.de}</span>
                          <ArrowRight className="size-2 text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-400">#{alerta.detalhes.ranking.para}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-emerald-100/50 uppercase tracking-tighter">Zona de Preço</span>
                        <div className="text-sm font-bold text-emerald-100">{alerta.detalhes.zona}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-emerald-100/50 uppercase tracking-tighter">DY 12M</span>
                        <div className="text-sm font-bold text-emerald-400">{alerta.detalhes.dy12m.toFixed(2)}%</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-emerald-100/50 uppercase tracking-tighter">Preço Atual</span>
                        <div className="text-sm font-bold text-emerald-100">R$ {alerta.detalhes.preco.toFixed(2).replace('.', ',')}</div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-emerald-100/50 uppercase tracking-tighter">Mini-Gráfico (Tendência)</span>
                        <Info className="size-2.5 text-emerald-400/50" />
                      </div>
                      <div className="h-16 w-full bg-emerald-500/5 rounded p-1 border border-emerald-500/10">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={alerta.detalhes.serie.map((v: number, i: number) => ({ v, i }))}>
                            <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                            <Line 
                              type="monotone" 
                              dataKey="v" 
                              stroke="#10b981" 
                              strokeWidth={2} 
                              dot={false}
                              animationDuration={1500}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 p-2 text-center">
                    <button className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest">
                      Abrir Análise Completa
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4 ml-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-emerald-400/60">
            <span>{indiceAtivo + 1}/{alertas.length}</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setIndiceAtivo((i) => (i > 0 ? i - 1 : alertas.length - 1))}
                className="hover:text-emerald-300 transition-colors p-0.5"
              >
                <ChevronLeft className="size-3" />
              </button>
              <button 
                onClick={() => setIndiceAtivo((i) => (i < alertas.length - 1 ? i + 1 : 0))}
                className="hover:text-emerald-300 transition-colors p-0.5"
              >
                <ChevronRight className="size-3" />
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setVisivel(false)}
            className="rounded-full p-1 hover:bg-emerald-500/20 transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
      
      {/* Glow line effect */}
      <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
    </motion.div>
  );
}
