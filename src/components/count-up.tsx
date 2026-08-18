import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "motion/react";

interface CountUpProps {
  /** Valor final da contagem */
  to: number;
  /** Duração em segundos (padrão: 1.6) */
  duration?: number;
  /** Sufixo exibido após o número (ex.: "+", " anos") */
  suffix?: string;
  /** Formata o número com separador de milhar pt-BR */
  formatBR?: boolean;
  className?: string;
}

/**
 * Animação de contagem (count-up) disparada quando o elemento entra na viewport.
 * Usa a biblioteca `motion` já disponível no projeto.
 */
export function CountUp({
  to,
  duration = 1.6,
  suffix = "",
  formatBR = false,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1], // easing "premium" — arranque rápido, desaceleração suave
      onUpdate: (v) => setValor(v),
    });
    return () => controls.stop();
  }, [inView, to, duration]);

  const exibido = formatBR
    ? Math.round(valor).toLocaleString("pt-BR")
    : Math.round(valor).toString();

  return (
    <span ref={ref} className={className}>
      {exibido}
      {suffix}
    </span>
  );
}

/** Dados brutos para renderizar um número animado a partir de string (ex.: "12+", "10 anos"). */
export function NumeroAnimado({ texto, className }: { texto: string; className?: string }) {
  const match = texto.match(/^(\d[\d.]*)(.*)$/);
  if (!match) {
    return <span className={className}>{texto}</span>;
  }
  const numero = Number(match[1].replace(/\./g, ""));
  const sufixo = match[2];
  return <CountUp to={numero} suffix={sufixo} className={className} />;
}
