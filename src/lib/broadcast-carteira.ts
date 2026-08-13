/**
 * Sincronização entre abas do navegador via BroadcastChannel.
 *
 * Quando uma aba grava/edita/exclui algo da carteira, ela emite um aviso e
 * todas as outras abas abertas revalidam suas queries — sem recarregar a
 * página. Fallback: `storage` event (navegadores sem BroadcastChannel).
 */
const CANAL = "carteira-sync";

type Mensagem = { chaves: string[]; origem: string };

const ORIGEM = Math.random().toString(36).slice(2);

function abrirCanal(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CANAL);
}

/** Avisa as demais abas que a carteira mudou. */
export function emitirCarteiraAlterada(chaves: readonly (readonly string[])[]) {
  if (typeof window === "undefined") return;
  const msg: Mensagem = { chaves: chaves.map((c) => c[0]), origem: ORIGEM };
  const ch = abrirCanal();
  if (ch) {
    ch.postMessage(msg);
    ch.close();
  } else {
    try {
      window.localStorage.setItem(CANAL, JSON.stringify({ ...msg, t: Date.now() }));
    } catch {
      /* storage indisponível */
    }
  }
}

/** Escuta avisos de outras abas. Retorna a função de limpeza. */
export function ouvirCarteiraAlterada(handler: (chaves: string[]) => void) {
  if (typeof window === "undefined") return () => {};

  const ch = abrirCanal();
  const onMessage = (ev: MessageEvent<Mensagem>) => {
    if (!ev.data || ev.data.origem === ORIGEM) return;
    handler(ev.data.chaves ?? []);
  };
  ch?.addEventListener("message", onMessage);

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== CANAL || !ev.newValue) return;
    try {
      const msg = JSON.parse(ev.newValue) as Mensagem;
      if (msg.origem === ORIGEM) return;
      handler(msg.chaves ?? []);
    } catch {
      /* payload inválido */
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    ch?.removeEventListener("message", onMessage);
    ch?.close();
    window.removeEventListener("storage", onStorage);
  };
}
