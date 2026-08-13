/**
 * Utilidades de virtualização e agrupamento para a grade de FIIs.
 *
 * A grade tem centenas de linhas por página. Renderizar todas custa caro e,
 * pior, faria o painel pedir indicadores históricos de todos os fundos de uma
 * vez. Aqui calculamos a janela realmente visível na viewport para que só ela
 * seja renderizada e só ela gere requisições — em um único lote por rodada.
 */

import { useEffect, useRef, useState, type RefObject } from "react";

export type Janela = { inicio: number; fim: number };

/** Janela de linhas visíveis, calculada a partir do scroll da página. */
export function useJanelaVirtual(
  ref: RefObject<HTMLElement | null>,
  total: number,
  alturaLinha: number,
  overscan = 8,
): Janela {
  const [janela, setJanela] = useState<Janela>({ inicio: 0, fim: 40 });

  useEffect(() => {
    let raf = 0;

    const calcular = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const alturaViewport = window.innerHeight || 900;
      const ocultoAcima = Math.max(0, -rect.top);
      const inicio = Math.max(0, Math.floor(ocultoAcima / alturaLinha) - overscan);
      const cabem = Math.ceil(alturaViewport / alturaLinha) + overscan * 2;
      const fim = Math.min(total, inicio + cabem);
      setJanela((atual) =>
        atual.inicio === inicio && atual.fim === fim ? atual : { inicio, fim },
      );
    };

    const agendar = () => {
      if (!raf) raf = window.requestAnimationFrame(calcular);
    };

    calcular();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, [ref, total, alturaLinha, overscan]);

  const inicio = Math.max(0, Math.min(janela.inicio, Math.max(0, total - 1)));
  return { inicio, fim: Math.min(Math.max(janela.fim, inicio), total) };
}

/** true quando a viewport está no breakpoint mobile (cards em vez de tabela). */
export function useEhMobile(largura = 768): boolean {
  const [ehMobile, setEhMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${largura - 1}px)`);
    const aplicar = () => setEhMobile(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, [largura]);
  return ehMobile;
}

/** Atrasa a propagação de um valor, agrupando rajadas de scroll em um lote só. */
export function useValorAtrasado<T>(valor: T, ms: number): T {
  const [atrasado, setAtrasado] = useState(valor);
  const ref = useRef(valor);
  ref.current = valor;
  useEffect(() => {
    const id = window.setTimeout(() => setAtrasado(ref.current), ms);
    return () => window.clearTimeout(id);
  }, [valor, ms]);
  return atrasado;
}
