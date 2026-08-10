import { useEffect, useRef, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_TICKERS = [
  { ticker: "PETR4", valor: "R$ 38,42", var: "+2,4%" },
  { ticker: "ITUB4", valor: "R$ 33,18", var: "+1,1%" },
  { ticker: "MXRF11", valor: "R$ 10,25", var: "-0,8%" },
  { ticker: "IVVB11", valor: "R$ 289,90", var: "+3,2%" },
];

/**
 * Mini-dashboard estilizado para prova visual do tema.
 * Não é o componente real — é um "poster" de vendas.
 */
function MiniDashboard({ tema }: { tema: "claro" | "escuro" }) {
  const isDark = tema === "escuro";
  return (
    <div
      className={cn(
        "relative h-full w-full min-w-[280px] p-5",
        isDark
          ? "bg-[oklch(0.16_0.024_252)] text-[oklch(0.96_0.008_220)]"
          : "bg-[oklch(0.985_0.003_220)] text-[oklch(0.19_0.014_250)]",
      )}
    >
      {/* Cabeçalho fake */}
      <div className="flex items-center justify-between gap-3">
        <div className="h-6 w-24 rounded-md bg-current opacity-12" />
        <div className={cn("size-8 rounded-full", isDark ? "bg-primary/20" : "bg-primary/15")} />
      </div>

      {/* Métricas */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {["Patrimônio", "Dividendos", "Rentab."].map((label, i) => (
          <div
            key={label}
            className={cn(
              "rounded-xl border p-3",
              isDark ? "border-white/10 bg-white/5" : "border-border/60 bg-card",
            )}
          >
            <p className="text-[0.55rem] font-semibold uppercase tracking-wider opacity-60">
              {label}
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-bold tabular-nums",
                i === 0 && (isDark ? "text-primary" : "text-primary"),
              )}
            >
              {i === 0 ? "R$ 128k" : i === 1 ? "R$ 1.240" : "+18,7%"}
            </p>
          </div>
        ))}
      </div>

      {/* Tabela fake */}
      <div
        className={cn(
          "mt-4 overflow-hidden rounded-2xl border",
          isDark ? "border-white/10 bg-white/3" : "border-border/60 bg-card",
        )}
      >
        <div
          className={cn(
            "grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-3 border-b px-4 py-2.5 text-[0.55rem] font-semibold tracking-wider uppercase",
            isDark ? "border-white/10 text-white/50" : "border-border/60 text-muted-foreground",
          )}
        >
          <span className="truncate">Ativo</span>
          <span className="truncate text-right">Preço</span>
          <span className="truncate text-right">Var</span>
        </div>
        <ul className={cn("divide-y", isDark ? "divide-white/10" : "divide-border/60")}>
          {MOCK_TICKERS.map((t) => (
            <li
              key={t.ticker}
              className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-3 px-4 py-2.5 text-xs font-medium"
            >
              <span className="truncate font-semibold tracking-tight">{t.ticker}</span>
              <span className="truncate text-right tabular-nums opacity-80">{t.valor}</span>
              <span
                className={cn(
                  "truncate text-right font-bold tabular-nums",
                  t.var.startsWith("+") ? "text-success" : "text-destructive",
                )}
              >
                {t.var}
              </span>
            </li>
          ))}
        </ul>
      </div>


      {/* Badges de status */}
      <div className="mt-4 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] font-bold",
            isDark ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary",
          )}
        >
          <Check className="size-3" /> Tempo real
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] font-bold",
            isDark ? "bg-white/10 text-white/70" : "bg-muted text-muted-foreground",
          )}
        >
          {isDark ? <Moon className="size-3" /> : <Sun className="size-3" />}
          {isDark ? "Modo escuro" : "Modo claro"}
        </span>
      </div>
    </div>
  );
}

/**
 * Seção da landing: dois temas lado a lado com slider de comparação.
 */
export function PreviewTemas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState(50); // 0..100
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    if (!arrastando) return;
    const mover = (e: MouseEvent | TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const x = ((clientX - rect.left) / rect.width) * 100;
      setPosicao(Math.min(100, Math.max(0, x)));
    };
    const soltar = () => setArrastando(false);
    window.addEventListener("mousemove", mover);
    window.addEventListener("touchmove", mover);
    window.addEventListener("mouseup", soltar);
    window.addEventListener("touchend", soltar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("mouseup", soltar);
      window.removeEventListener("touchend", soltar);
    };
  }, [arrastando]);

  return (
    <section
      id="themes-preview"
      className="border-border/60 bg-card mt-16 overflow-hidden rounded-3xl border p-8 sm:mt-24 sm:p-10"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-primary text-[0.62rem] font-bold tracking-[0.2em] uppercase">
            Dois modos em um
          </p>
          <h2 className="font-hero mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Claro para o dia, escuro para a noite
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed text-pretty">
            O painel inteiro se adapta ao seu ritmo: tema claro para o pregão e escuro para revisar
            a carteira antes de dormir — sem perder contraste nem legibilidade.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[0.65rem] font-semibold">
            <Sun className="size-3.5" /> Claro
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[0.65rem] font-semibold">
            <Moon className="size-3.5" /> Escuro
          </span>
        </div>
      </div>

      {/* Comparador */}
      <div
        ref={containerRef}
        className="border-border/60 relative mt-8 aspect-[16/10] touch-none overflow-hidden rounded-2xl border select-none sm:aspect-[21/9]"
      >
        {/* Base = escuro */}
        <div className="absolute inset-0">
          <MiniDashboard tema="escuro" />
        </div>
        {/* Top = claro, recortado */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - posicao}% 0 0)` }}
        >
          <MiniDashboard tema="claro" />
        </div>

        {/* Handle arrastável */}
        <button
          type="button"
          aria-label="Arraste para comparar os temas"
          className={cn(
            "absolute top-0 bottom-0 z-10 w-1 cursor-ew-resize bg-border",
            "focus-visible:outline-2 focus-visible:outline-primary",
          )}
          style={{ left: `${posicao}%` }}
          onMouseDown={() => setArrastando(true)}
          onTouchStart={() => setArrastando(true)}
        >
          <span className="bg-primary text-primary-foreground absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[var(--shadow-lift)]">
            ⇄
          </span>
        </button>

        {/* Labels visuais */}
        <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.6rem] font-bold text-white backdrop-blur-sm">
          Claro
        </span>
        <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.6rem] font-bold text-white backdrop-blur-sm">
          Escuro
        </span>
      </div>

      <p className="text-muted-foreground mt-4 text-center text-[0.7rem] font-medium tracking-wide uppercase">
        Arraste a barra para comparar
      </p>
    </section>
  );
}
