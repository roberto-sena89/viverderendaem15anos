/**
 * Histórico local dos alertas de variação disparados + notificações push
 * nativas do navegador. Tudo fica no dispositivo (localStorage), sem backend.
 */

import { useCallback, useSyncExternalStore } from "react";

export interface AlertaDisparado {
  id: string;
  ticker: string;
  variacaoPercent: number;
  preco: number | null;
  limite: number;
  /** Epoch ms do disparo. */
  em: number;
  lido: boolean;
  /** Canais em que o alerta foi entregue. */
  canais: string[];
  /** Origem do alerta: variação de preço (padrão) ou notícia. */
  tipo?: "preco" | "noticia";
  /** Título da notícia, quando tipo = "noticia". */
  titulo?: string;
  /** Link da notícia, quando tipo = "noticia". */
  url?: string;
}


const CHAVE = "alertas:historico";
const LIMITE_REGISTROS = 100;

let memoria: AlertaDisparado[] | null = null;
const ouvintes = new Set<() => void>();

function ler(): AlertaDisparado[] {
  if (typeof window === "undefined") return [];
  if (memoria) return memoria;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    memoria = bruto ? (JSON.parse(bruto) as AlertaDisparado[]) : [];
  } catch {
    memoria = [];
  }
  return memoria;
}

function gravar(lista: AlertaDisparado[]) {
  memoria = lista.slice(0, LIMITE_REGISTROS);
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(memoria));
  } catch {
    /* armazenamento indisponível */
  }
  for (const o of ouvintes) o();
}

function inscrever(cb: () => void) {
  ouvintes.add(cb);
  const sync = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      memoria = null;
      cb();
    }
  };
  window.addEventListener("storage", sync);
  return () => {
    ouvintes.delete(cb);
    window.removeEventListener("storage", sync);
  };
}

const VAZIO: AlertaDisparado[] = [];

/** Registra um novo alerta no topo do histórico. */
export function registrarAlerta(a: Omit<AlertaDisparado, "id" | "em" | "lido">) {
  const novo: AlertaDisparado = { ...a, id: crypto.randomUUID(), em: Date.now(), lido: false };
  gravar([novo, ...ler()]);
  return novo;
}

/* ---------------------------------------------------------------- *
 * Push nativo do navegador
 * ---------------------------------------------------------------- */

export function pushSuportado(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissaoPush(): NotificationPermission | "indisponivel" {
  return pushSuportado() ? Notification.permission : "indisponivel";
}

export async function pedirPermissaoPush(): Promise<NotificationPermission | "indisponivel"> {
  if (!pushSuportado()) return "indisponivel";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Dispara a notificação nativa. Retorna true se conseguiu exibir. */
export function notificarPush(titulo: string, corpo: string): boolean {
  if (!pushSuportado() || Notification.permission !== "granted") return false;
  try {
    new Notification(titulo, { body: corpo, icon: "/favicon.ico", tag: titulo });
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- *
 * Hook
 * ---------------------------------------------------------------- */

export function useAlertasHistorico() {
  const alertas = useSyncExternalStore(
    inscrever,
    ler,
    () => VAZIO,
  );

  const marcarTodosLidos = useCallback(() => {
    gravar(ler().map((a) => (a.lido ? a : { ...a, lido: true })));
  }, []);

  const limpar = useCallback(() => gravar([]), []);

  return {
    alertas,
    naoLidos: alertas.filter((a) => !a.lido).length,
    marcarTodosLidos,
    limpar,
  };
}
