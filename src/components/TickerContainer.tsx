import { useEffect, useRef, useState, type ReactNode } from "react";

export type TickerContainerProps = {
  /** Segundos que uma cópia completa da lista leva para atravessar a tela. */
  speed?: number;
  pauseOnHover?: boolean;
  children: ReactNode;
};

/**
 * Marquee infinito: a lista é duplicada e a animação desloca -50% da largura
 * total, de modo que o fim encaixa exatamente no começo (sem corte nem salto).
 * A animação usa apenas `transform`, acelerada por GPU.
 */
export function TickerContainer({ speed = 40, pauseOnHover = true, children }: TickerContainerProps) {
  const trilhaRef = useRef<HTMLDivElement>(null);
  const [duracao, setDuracao] = useState(speed);
  const [pausado, setPausado] = useState(false);

  // Duração proporcional à largura real do conteúdo: velocidade constante em
  // px/s independentemente de quantos ativos estão na fita.
  useEffect(() => {
    const el = trilhaRef.current;
    if (!el) return;
    const medir = () => {
      const largura = el.scrollWidth / 2;
      if (largura > 0) setDuracao(Math.max(10, largura / (1200 / speed)));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [speed, children]);

  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden"
      onMouseEnter={pauseOnHover ? () => setPausado(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPausado(false) : undefined}
    >
      <div
        ref={trilhaRef}
        className="ticker-trilha flex w-max items-center"
        style={{
          animationDuration: `${duracao}s`,
          animationPlayState: pausado ? "paused" : "running",
        }}
      >
        {children}
        <span aria-hidden="true" className="flex items-center">
          {children}
        </span>
      </div>
    </div>
  );
}
