import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { corVar, fmtPct } from "@/components/cripto/formatos-cripto";
import type { LinhaCripto } from "@/lib/cripto-base";

type Campo = "variacao1h" | "variacao24h" | "variacao7d" | "variacao30d" | "variacao6m" | "variacao12m";

export type DirecaoVar = Record<string, "alta" | "baixa">;

/**
 * Detecta em qual direção cada variação se moveu entre duas sincronizações,
 * para piscar a seta em tempo real (dura ~1,6s, mesma janela do flash de preço).
 */
export function useDirecaoVariacoes(linhas: LinhaCripto[], campos: readonly Campo[]): DirecaoVar {
  const [direcao, setDirecao] = useState<DirecaoVar>({});
  const anteriores = useRef<Record<string, number>>({});

  useEffect(() => {
    const novos: DirecaoVar = {};
    for (const l of linhas) {
      for (const campo of campos) {
        const v = l[campo];
        if (v === null || !Number.isFinite(v)) continue;
        const chave = `${l.id}:${campo}`;
        const anterior = anteriores.current[chave];
        if (anterior !== undefined && anterior !== v) novos[chave] = v > anterior ? "alta" : "baixa";
        anteriores.current[chave] = v;
      }
    }
    if (!Object.keys(novos).length) return;
    setDirecao((d) => ({ ...d, ...novos }));
    const id = window.setTimeout(() => {
      setDirecao((d) => {
        const copia = { ...d };
        for (const k of Object.keys(novos)) delete copia[k];
        return copia;
      });
    }, 1600);
    return () => window.clearTimeout(id);
  }, [linhas, campos]);

  return direcao;
}

/** Percentual com seta de direção; pisca quando o valor muda ao vivo. */
export function CelulaVariacao({
  valor,
  stable = false,
  movimento,
  className,
}: {
  valor: number | null;
  stable?: boolean;
  movimento?: "alta" | "baixa";
  className?: string;
}) {
  const neutro = valor === null || !Number.isFinite(valor) || (stable && Math.abs(valor) < 1);
  const Icone = neutro ? Minus : (valor as number) > 0 ? ArrowUp : ArrowDown;

  return (
    <span
      className={`inline-flex items-center justify-end gap-1 tabular-nums ${corVar(valor, stable)} ${
        movimento === "alta" ? "flash-alta" : movimento === "baixa" ? "flash-baixa" : ""
      } ${className ?? ""}`}
    >
      <Icone className="size-3 shrink-0" aria-hidden />
      {fmtPct(valor)}
    </span>
  );
}
