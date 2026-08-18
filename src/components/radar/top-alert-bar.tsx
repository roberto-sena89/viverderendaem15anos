import { useState, useEffect } from "react";
import {
  Bell,
  X,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  Info,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { getRadarAlertas, type AlertaRadar } from "@/lib/radar-alertas.functions";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TopAlertBar() {
  const [alertas, setAlertas] = useState<AlertaRadar[]>([]);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const fetchAlertas = useServerFn(getRadarAlertas);

  useEffect(() => {
    fetchAlertas()
      .then(setAlertas)
      .catch(() => {});
  }, []);

  if (!visivel || alertas.length === 0) return null;

  const alerta = alertas[indiceAtivo];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      className="relative z-50 border-b border-emerald-500/20 bg-emerald-950/60 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:py-4 font-mono text-[13px] sm:text-sm tracking-tight text-emerald-100">
        <div className="flex flex-1 items-center gap-4 sm:gap-6 overflow-hidden">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <Bell className="size-4 sm:size-5 text-emerald-400 animate-pulse" />
              <div className="absolute inset-0 size-4 sm:size-5 bg-emerald-400/20 blur-sm rounded-full animate-ping" />
            </div>
            <span className="font-black text-emerald-400 uppercase tracking-tighter sm:tracking-widest flex items-center gap-2">
              <span className="hidden xs:inline text-emerald-500">RADAR</span>
              <span className="text-emerald-300">ALERT</span>
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={alerta.id}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              className="flex items-center gap-3 truncate"
            >
              <div className="flex items-center gap-2 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_10px_-2px_rgba(16,185,129,0.2)]">
                <span className="font-black text-emerald-300 text-sm sm:text-base">
                  {alerta.ticker}
                </span>
              </div>

              <div className="flex-1 truncate py-0.5">
                <span className="font-bold text-emerald-50 opacity-95 text-xs sm:text-sm block sm:inline truncate">
                  {alerta.titulo}:
                </span>
                <span className="text-[10px] sm:text-xs text-emerald-100/70 truncate ml-1 hidden md:inline-block">
                  {alerta.corpo}
                </span>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 text-[10px] sm:text-xs font-black hover:bg-emerald-500/40 hover:border-emerald-400/50 hover:scale-105 active:scale-95 transition-all group shrink-0 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]">
                    <Zap className="size-3 sm:size-3.5 text-emerald-400 fill-emerald-400/20" />
                    <span className="tracking-widest hidden xs:inline">IMPACTO</span>
                    <ArrowRight className="size-3 sm:size-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] sm:w-[400px] border-emerald-500/30 bg-emerald-950/95 p-0 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden border-2">
                  <div className="p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
                      <div>
                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          {alerta.ticker}
                          <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300 animate-pulse">
                            LIVE
                          </span>
                        </h4>
                        <p className="text-[11px] text-emerald-100/60 font-bold tracking-tight">
                          RELATÓRIO DE IMPACTO IA
                        </p>
                      </div>
                      <div className="text-right">
                        <div
                          className={`flex items-center justify-end gap-1.5 text-sm sm:text-base font-black ${alerta.detalhes.variacao >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {alerta.detalhes.variacao >= 0 ? (
                            <TrendingUp className="size-4 sm:size-5" />
                          ) : (
                            <TrendingDown className="size-4 sm:size-5" />
                          )}
                          {alerta.detalhes.variacao > 0 ? "+" : ""}
                          {alerta.detalhes.variacao.toFixed(2).replace(".", ",")}%
                        </div>
                        <p className="text-[11px] text-emerald-100/60 font-bold">VARIAÇÃO 24H</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                        <span className="text-[10px] text-emerald-100/50 uppercase tracking-widest font-black">
                          RANKING RADAR
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-emerald-100/30 line-through">
                            #{alerta.detalhes.ranking.de}
                          </span>
                          <ArrowRight className="size-3 text-emerald-400" />
                          <span className="text-base font-black text-emerald-400 tracking-tighter">
                            #{alerta.detalhes.ranking.para}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 text-right">
                        <span className="text-[10px] text-emerald-100/50 uppercase tracking-widest font-black">
                          ZONA DE PREÇO
                        </span>
                        <div className="text-sm font-black text-emerald-100 tracking-tight">
                          {alerta.detalhes.zona}
                        </div>
                      </div>
                      <div className="space-y-1.5 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                        <span className="text-[10px] text-emerald-100/50 uppercase tracking-widest font-black">
                          DY 12M
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-emerald-400 tracking-tighter">
                            {alerta.detalhes.dy12m.toFixed(2).replace(".", ",")}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 text-right">
                        <span className="text-[10px] text-emerald-100/50 uppercase tracking-widest font-black">
                          PREÇO ATUAL
                        </span>
                        <div className="text-sm sm:text-base font-black text-emerald-100 tracking-tighter">
                          R$ {alerta.detalhes.preco.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] text-emerald-100/50 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                          TENDÊNCIA INTRADIÁRIA
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </span>
                        <Info className="size-3 text-emerald-400/50" />
                      </div>
                      <div className="h-20 sm:h-24 w-full bg-emerald-500/10 rounded-xl p-2 border border-emerald-500/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={alerta.detalhes.serie.map((v: number, i: number) => ({ v, i }))}
                          >
                            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                            <Line
                              type="monotone"
                              dataKey="v"
                              stroke="#10b981"
                              strokeWidth={4}
                              dot={false}
                              animationDuration={2000}
                              strokeLinecap="round"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 p-4 text-center border-t border-emerald-500/20">
                    <button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("app:abrir-radar-ativo", {
                            detail: { ticker: alerta.ticker },
                          }),
                        );
                      }}
                      className="w-full py-2.5 rounded-lg bg-emerald-500 text-xs font-black text-emerald-950 hover:bg-emerald-400 active:scale-[0.98] transition-all uppercase tracking-[0.2em] shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] flex items-center justify-center gap-3"
                    >
                      Visualizar no Radar Completo
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 ml-4 shrink-0">
          <div className="hidden xs:flex items-center gap-3 text-[11px] sm:text-xs text-emerald-400/80 font-black">
            <span className="bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/30">
              {indiceAtivo + 1} / {alertas.length}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setIndiceAtivo((i) => (i > 0 ? i - 1 : alertas.length - 1))}
                className="hover:text-emerald-300 transition-colors p-1 hover:bg-emerald-500/20 rounded-md border border-transparent hover:border-emerald-500/30"
              >
                <ChevronLeft className="size-4 sm:size-5" />
              </button>
              <button
                onClick={() => setIndiceAtivo((i) => (i < alertas.length - 1 ? i + 1 : 0))}
                className="hover:text-emerald-300 transition-colors p-1 hover:bg-emerald-500/20 rounded-md border border-transparent hover:border-emerald-500/30"
              >
                <ChevronRight className="size-4 sm:size-5" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setVisivel(false)}
            className="rounded-full p-1.5 hover:bg-rose-500/20 text-emerald-400 hover:text-rose-400 transition-all active:scale-90"
          >
            <X className="size-4 sm:size-5" />
          </button>
        </div>
      </div>

      {/* Glow line effect */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
    </motion.div>
  );
}
