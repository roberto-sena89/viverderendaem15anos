/**
 * Sincronização Gestor IA → Radar de Oportunidades.
 *
 * Quando o Gestor IA conclui uma resposta, avisamos o Radar (na mesma aba via
 * CustomEvent e nas demais abas via BroadcastChannel) para revalidar os dados
 * sem recarregar a página.
 */
const CANAL = "gestor-ia-radar";
const EVENTO = "app:gestor-ia-resposta";

const ORIGEM = Math.random().toString(36).slice(2);

export type RespostaGestorIA = { ticker?: string | null; em: number; origem: string };

/** Avisa que o Gestor IA terminou uma resposta. */
export function emitirRespostaGestorIA(ticker?: string | null) {
  if (typeof window === "undefined") return;
  const msg: RespostaGestorIA = { ticker: ticker ?? null, em: Date.now(), origem: ORIGEM };
  window.dispatchEvent(new CustomEvent<RespostaGestorIA>(EVENTO, { detail: msg }));
  if (typeof BroadcastChannel !== "undefined") {
    const ch = new BroadcastChannel(CANAL);
    ch.postMessage(msg);
    ch.close();
  }
}

/** Escuta respostas do Gestor IA (mesma aba e outras abas). Retorna limpeza. */
export function ouvirRespostaGestorIA(handler: (msg: RespostaGestorIA) => void) {
  if (typeof window === "undefined") return () => {};

  const onEvento = (ev: Event) => {
    const detalhe = (ev as CustomEvent<RespostaGestorIA>).detail;
    if (detalhe) handler(detalhe);
  };
  window.addEventListener(EVENTO, onEvento);

  const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CANAL) : null;
  const onMessage = (ev: MessageEvent<RespostaGestorIA>) => {
    if (!ev.data || ev.data.origem === ORIGEM) return;
    handler(ev.data);
  };
  ch?.addEventListener("message", onMessage);

  return () => {
    window.removeEventListener(EVENTO, onEvento);
    ch?.removeEventListener("message", onMessage);
    ch?.close();
  };
}
