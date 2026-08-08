import { useId } from "react";

/** Mini gráfico de tendência intradiária, sem eixos — apenas a forma da curva. */
export function Sparkline({
  serie,
  positivo,
  largura = 96,
  altura = 28,
  className,
}: {
  serie: number[];
  positivo: boolean;
  largura?: number;
  altura?: number;
  className?: string;
}) {
  const id = useId();
  const pontos = serie.filter((v) => Number.isFinite(v));
  if (pontos.length < 2) {
    return (
      <span className={`inline-block text-xs text-muted-foreground ${className ?? ""}`} aria-hidden>
        —
      </span>
    );
  }

  const min = Math.min(...pontos);
  const max = Math.max(...pontos);
  const faixa = max - min || 1;
  const passo = largura / (pontos.length - 1);
  const y = (v: number) => altura - 2 - ((v - min) / faixa) * (altura - 4);
  const d = pontos
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * passo).toFixed(2)},${y(v).toFixed(2)}`)
    .join(" ");
  const area = `${d} L${largura},${altura} L0,${altura} Z`;
  const cor = positivo ? "var(--color-positive, #16a34a)" : "var(--color-negative, #dc2626)";

  return (
    <svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      className={className}
      role="img"
      aria-label={positivo ? "Tendência de alta" : "Tendência de baixa"}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${id})`} />
      <path
        d={d}
        fill="none"
        stroke={cor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
