import { useCallback, useSyncExternalStore } from "react";

const CHAVE = "subalocacao-alvo";
const EVENTO = "subalocacao-alvo:mudou";

export type SubAlocacaoAlvo = Record<string, number>;

/** Sub-classes dentro de uma classe principal (percentuais sobre a carteira total). */
export const subalocacaoIdeal: SubAlocacaoAlvo = {
  "Tesouro SELIC": 0,
  "Tesouro IPCA+": 0,
};

const listeners = new Set<() => void>();

function ler(): SubAlocacaoAlvo {
  if (typeof window === "undefined") return subalocacaoIdeal;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return subalocacaoIdeal;
    const salvo = JSON.parse(bruto) as SubAlocacaoAlvo;
    const mesclado: SubAlocacaoAlvo = { ...subalocacaoIdeal };
    for (const sub of Object.keys(subalocacaoIdeal)) {
      const v = Number(salvo[sub]);
      if (Number.isFinite(v) && v >= 0) mesclado[sub] = v;
    }
    return mesclado;
  } catch {
    return subalocacaoIdeal;
  }
}

let cache: SubAlocacaoAlvo | null = null;

function snapshot() {
  if (!cache) cache = ler();
  return cache;
}

function notificar() {
  cache = ler();
  for (const l of listeners) l();
}

function aoMudarStorage(e: StorageEvent) {
  if (e.key === null || e.key === CHAVE) notificar();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (typeof window !== "undefined") {
    window.addEventListener(EVENTO, notificar);
    window.addEventListener("storage", aoMudarStorage);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined" && listeners.size === 0) {
      window.removeEventListener(EVENTO, notificar);
      window.removeEventListener("storage", aoMudarStorage);
    }
  };
}

/** Percentuais-alvo das sub-classes, persistidos no navegador. */
export function useSubAlocacaoAlvo() {
  const subAlvo = useSyncExternalStore(subscribe, snapshot, () => subalocacaoIdeal);

  const salvarSub = useCallback((novo: SubAlocacaoAlvo) => {
    window.localStorage.setItem(CHAVE, JSON.stringify(novo));
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  const restaurarSub = useCallback(() => {
    window.localStorage.removeItem(CHAVE);
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return { subAlvo, salvarSub, restaurarSub };
}
