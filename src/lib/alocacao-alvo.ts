import { useCallback, useSyncExternalStore } from "react";
import { alocacaoIdeal } from "@/lib/portfolio";

const CHAVE = "alocacao-alvo";
const EVENTO = "alocacao-alvo:mudou";

export type AlocacaoAlvo = Record<string, number>;

const listeners = new Set<() => void>();

function ler(): AlocacaoAlvo {
  if (typeof window === "undefined") return alocacaoIdeal;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return alocacaoIdeal;
    const salvo = JSON.parse(bruto) as AlocacaoAlvo;
    const mesclado: AlocacaoAlvo = { ...alocacaoIdeal };
    for (const classe of Object.keys(alocacaoIdeal)) {
      const v = Number(salvo[classe]);
      if (Number.isFinite(v) && v >= 0) mesclado[classe] = v;
    }
    return mesclado;
  } catch {
    return alocacaoIdeal;
  }
}

let cache: AlocacaoAlvo | null = null;

function snapshot() {
  if (!cache) cache = ler();
  return cache;
}

function notificar() {
  cache = ler();
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener(EVENTO, notificar);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined" && listeners.size === 0) window.removeEventListener(EVENTO, notificar);
  };
}

/** Percentuais-alvo por classe, editáveis pelo usuário e persistidos no navegador. */
export function useAlocacaoAlvo() {
  const alvo = useSyncExternalStore(subscribe, snapshot, () => alocacaoIdeal);

  const salvar = useCallback((novo: AlocacaoAlvo) => {
    window.localStorage.setItem(CHAVE, JSON.stringify(novo));
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  const restaurar = useCallback(() => {
    window.localStorage.removeItem(CHAVE);
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return { alvo, salvar, restaurar };
}
