import { useCallback, useSyncExternalStore } from "react";

export type PerfilInvestidor = "conservador" | "moderado" | "agressivo";

export const PERFIS: { valor: PerfilInvestidor; rotulo: string; descricao: string }[] = [
  {
    valor: "conservador",
    rotulo: "Conservador",
    descricao: "Prioriza segurança: renda fixa, menor volatilidade e liquidez.",
  },
  {
    valor: "moderado",
    rotulo: "Moderado",
    descricao: "Equilíbrio entre renda fixa e renda variável para longo prazo.",
  },
  {
    valor: "agressivo",
    rotulo: "Agressivo",
    descricao: "Busca maior retorno e aceita mais volatilidade e riscos.",
  },
];

const CHAVE = "perfil-investidor";
const EVENTO = "perfil-investidor:mudou";

const PADRAO: PerfilInvestidor = "moderado";

const listeners = new Set<() => void>();

function ler(): PerfilInvestidor {
  if (typeof window === "undefined") return PADRAO;
  try {
    const salvo = window.localStorage.getItem(CHAVE) as PerfilInvestidor | null;
    return salvo === "conservador" || salvo === "agressivo" ? salvo : PADRAO;
  } catch {
    return PADRAO;
  }
}

let cache: PerfilInvestidor | null = null;

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

/** Perfil de investidor (conservador/moderado/agressivo), persistido no navegador. */
export function usePerfilInvestidor() {
  const perfil = useSyncExternalStore(subscribe, snapshot, () => PADRAO);

  const salvar = useCallback((novo: PerfilInvestidor) => {
    window.localStorage.setItem(CHAVE, novo);
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return { perfil, salvar };
}
