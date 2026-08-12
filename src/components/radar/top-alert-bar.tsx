import { useState, useEffect } from "react";
import { Bell, ChevronRight, X, Info, TrendingUp, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { getRadarAlertas } from "@/lib/radar-alertas.functions";

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
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4 ml-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-emerald-400/60">
            <span>{indiceAtivo + 1}/{alertas.length}</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setIndiceAtivo((i) => (i > 0 ? i - 1 : alertas.length - 1))}
                className="hover:text-emerald-300 transition-colors"
              >
                PREV
              </button>
              <span>|</span>
              <button 
                onClick={() => setIndiceAtivo((i) => (i < alertas.length - 1 ? i + 1 : 0))}
                className="hover:text-emerald-300 transition-colors"
              >
                NEXT
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
