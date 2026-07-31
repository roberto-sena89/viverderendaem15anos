import { useCallback, useEffect, useState } from "react";

const CHAVE = "mercado:favoritos";
const EVENTO = "mercado:favoritos:mudou";

function ler(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const lista = bruto ? (JSON.parse(bruto) as unknown) : [];
    return Array.isArray(lista) ? lista.map(String) : [];
  } catch {
    return [];
  }
}

/** Watchlist pessoal persistida no navegador e sincronizada entre abas. */
export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<string[]>([]);

  useEffect(() => {
    setFavoritos(ler());
    const sincronizar = () => setFavoritos(ler());
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  const alternar = useCallback((ticker: string) => {
    const atual = ler();
    const proximo = atual.includes(ticker)
      ? atual.filter((t) => t !== ticker)
      : [...atual, ticker];
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(proximo));
    } catch {
      /* armazenamento indisponível */
    }
    setFavoritos(proximo);
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  const ehFavorito = useCallback((ticker: string) => favoritos.includes(ticker), [favoritos]);

  return { favoritos, alternar, ehFavorito };
}
