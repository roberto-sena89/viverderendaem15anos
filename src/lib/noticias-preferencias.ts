/**
 * Preferências locais da aba de Notícias de Mercado: categorias e fontes
 * favoritas, notícias salvas, leituras (para "mais lidas do dia") e o toggle
 * de alertas da carteira. Tudo fica no dispositivo, via localStorage.
 */

import { useCallback, useSyncExternalStore } from "react";

export interface NoticiaSalva {
  id: string;
  titulo: string;
  url: string;
  fonte: string;
  categoria: string;
  publicadoEm: string;
}

export interface PrefsNoticias {
  /** Vazio = todas as categorias. */
  categorias: string[];
  /** Vazio = todas as fontes. */
  fontes: string[];
  notificarCarteira: boolean;
  resumoOculto: boolean;
  salvas: NoticiaSalva[];
  /** Cliques por notícia no dia corrente (base do bloco "Mais lidas"). */
  leituras: Record<string, number>;
  diaLeituras: string;
  /** Ids de notícias que já geraram alerta, para não repetir. */
  alertadas: string[];
}

const CHAVE = "noticias:prefs";

const PADRAO: PrefsNoticias = {
  categorias: [],
  fontes: [],
  notificarCarteira: false,
  resumoOculto: false,
  salvas: [],
  leituras: {},
  diaLeituras: "",
  alertadas: [],
};

let memoria: PrefsNoticias | null = null;
const ouvintes = new Set<() => void>();

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function ler(): PrefsNoticias {
  if (typeof window === "undefined") return PADRAO;
  if (memoria) return memoria;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const lido = bruto ? { ...PADRAO, ...(JSON.parse(bruto) as Partial<PrefsNoticias>) } : PADRAO;
    // Zera o contador de leituras a cada novo dia.
    memoria = lido.diaLeituras === hoje() ? lido : { ...lido, leituras: {}, diaLeituras: hoje() };
  } catch {
    memoria = PADRAO;
  }
  return memoria;
}

function gravar(prefs: PrefsNoticias) {
  memoria = prefs;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(prefs));
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

export function usePrefsNoticias() {
  const prefs = useSyncExternalStore(inscrever, ler, () => PADRAO);

  const definir = useCallback((patch: Partial<PrefsNoticias>) => {
    gravar({ ...ler(), ...patch });
  }, []);

  const alternarSalva = useCallback((n: NoticiaSalva) => {
    const atual = ler();
    const existe = atual.salvas.some((s) => s.id === n.id);
    gravar({
      ...atual,
      salvas: existe ? atual.salvas.filter((s) => s.id !== n.id) : [n, ...atual.salvas].slice(0, 80),
    });
  }, []);

  const registrarLeitura = useCallback((id: string) => {
    const atual = ler();
    gravar({
      ...atual,
      diaLeituras: hoje(),
      leituras: { ...atual.leituras, [id]: (atual.leituras[id] ?? 0) + 1 },
    });
  }, []);

  const marcarAlertadas = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const atual = ler();
    gravar({ ...atual, alertadas: [...new Set([...ids, ...atual.alertadas])].slice(0, 200) });
  }, []);

  const alternarLista = useCallback((campo: "categorias" | "fontes", valor: string) => {
    const atual = ler();
    const lista = atual[campo];
    gravar({
      ...atual,
      [campo]: lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor],
    });
  }, []);

  return { prefs, definir, alternarSalva, registrarLeitura, marcarAlertadas, alternarLista };
}
