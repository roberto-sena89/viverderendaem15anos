/**
 * Watchlist e preferências de mercado do usuário.
 *
 * A fonte de verdade é a tabela `public.preferencias_mercado` (uma linha por
 * usuário, protegida por RLS), de modo que favoritos e o filtro "Meus
 * Favoritos" acompanham o perfil entre navegadores, dispositivos e sessões.
 *
 * O `localStorage` continua sendo usado apenas como cache local: pinta a tela
 * instantaneamente no primeiro render e mantém a preferência utilizável se a
 * rede falhar. Assim que o servidor responde, o cache é reconciliado.
 *
 * Alterações também chegam por Realtime, sincronizando abas e aparelhos
 * abertos ao mesmo tempo.
 */

import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const CHAVE_CACHE = "mercado:preferencias";
/** Chave da versão anterior, migrada uma única vez para o perfil. */
const CHAVE_LEGADA = "mercado:favoritos";

export type PreferenciasMercado = {
  favoritos: string[];
  filtroFavoritos: boolean;
};

type Estado = PreferenciasMercado & {
  /** true depois que o servidor respondeu ao menos uma vez. */
  sincronizado: boolean;
};

const INICIAL: Estado = { favoritos: [], filtroFavoritos: false, sincronizado: false };

let estado: Estado = INICIAL;
const ouvintes = new Set<(e: Estado) => void>();

function emitir(proximo: Estado) {
  estado = proximo;
  for (const o of ouvintes) o(estado);
}

/* ------------------------------------------------------------------ *
 * Cache local
 * ------------------------------------------------------------------ */

function lerCache(): PreferenciasMercado | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(CHAVE_CACHE);
    if (bruto) {
      const dado = JSON.parse(bruto) as Partial<PreferenciasMercado>;
      return {
        favoritos: Array.isArray(dado.favoritos) ? dado.favoritos.map(String) : [],
        filtroFavoritos: dado.filtroFavoritos === true,
      };
    }
    // Migração da watchlist antiga, salva só no navegador.
    const legado = window.localStorage.getItem(CHAVE_LEGADA);
    if (legado) {
      const lista = JSON.parse(legado) as unknown;
      if (Array.isArray(lista)) return { favoritos: lista.map(String), filtroFavoritos: false };
    }
  } catch {
    /* armazenamento indisponível */
  }
  return null;
}

function gravarCache(p: PreferenciasMercado) {
  try {
    window.localStorage.setItem(CHAVE_CACHE, JSON.stringify(p));
    window.localStorage.removeItem(CHAVE_LEGADA);
  } catch {
    /* armazenamento indisponível */
  }
}

/* ------------------------------------------------------------------ *
 * Persistência no perfil
 * ------------------------------------------------------------------ */

let usuarioId: string | null = null;
let carregando: Promise<void> | null = null;
let canal: RealtimeChannel | null = null;
let gravacaoPendente: number | null = null;

async function idDoUsuario(): Promise<string | null> {
  if (usuarioId) return usuarioId;
  const { data } = await supabase.auth.getUser();
  usuarioId = data.user?.id ?? null;
  return usuarioId;
}

/** Envia o estado atual para o perfil, agrupando cliques em rajada. */
function agendarGravacao() {
  if (typeof window === "undefined") return;
  if (gravacaoPendente) window.clearTimeout(gravacaoPendente);
  gravacaoPendente = window.setTimeout(async () => {
    gravacaoPendente = null;
    const id = await idDoUsuario();
    if (!id) return;
    await supabase.from("preferencias_mercado").upsert(
      {
        user_id: id,
        favoritos: estado.favoritos,
        filtro_favoritos: estado.filtroFavoritos,
      },
      { onConflict: "user_id" },
    );
  }, 400);
}

/** Carrega as preferências do perfil e reconcilia com o cache local. */
function carregar(): Promise<void> {
  if (carregando) return carregando;

  carregando = (async () => {
    const cache = lerCache();
    if (cache) emitir({ ...cache, sincronizado: false });

    const id = await idDoUsuario();
    if (!id) return;

    const { data, error } = await supabase
      .from("preferencias_mercado")
      .select("favoritos, filtro_favoritos")
      .eq("user_id", id)
      .maybeSingle();

    if (error) return; // mantém o cache local até a próxima tentativa

    if (!data) {
      // Primeiro acesso: promove a watchlist que estava só no navegador.
      const inicial: PreferenciasMercado = cache ?? { favoritos: [], filtroFavoritos: false };
      emitir({ ...inicial, sincronizado: true });
      gravarCache(inicial);
      if (inicial.favoritos.length || inicial.filtroFavoritos) agendarGravacao();
    } else {
      const doPerfil: PreferenciasMercado = {
        favoritos: (data.favoritos ?? []).map(String),
        filtroFavoritos: data.filtro_favoritos === true,
      };
      emitir({ ...doPerfil, sincronizado: true });
      gravarCache(doPerfil);
    }

    assinarTempoReal(id);
  })();

  return carregando;
}

/** Espelha mudanças feitas em outra aba ou dispositivo. */
function assinarTempoReal(id: string) {
  if (canal) return;
  canal = supabase
    .channel("preferencias-mercado")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "preferencias_mercado",
        filter: `user_id=eq.${id}`,
      },
      (mensagem) => {
        const novo = mensagem.new as
          | { favoritos?: string[] | null; filtro_favoritos?: boolean | null }
          | undefined;
        if (!novo) return;
        const p: PreferenciasMercado = {
          favoritos: (novo.favoritos ?? []).map(String),
          filtroFavoritos: novo.filtro_favoritos === true,
        };
        if (
          p.filtroFavoritos === estado.filtroFavoritos &&
          p.favoritos.join(",") === estado.favoritos.join(",")
        ) {
          return;
        }
        emitir({ ...p, sincronizado: true });
        gravarCache(p);
      },
    )
    .subscribe();
}

/** Zera o estado quando a sessão muda (logout ou troca de usuário). */
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((evento) => {
    if (evento !== "SIGNED_IN" && evento !== "SIGNED_OUT" && evento !== "USER_UPDATED") return;
    usuarioId = null;
    carregando = null;
    if (canal) {
      supabase.removeChannel(canal);
      canal = null;
    }
    if (evento === "SIGNED_OUT") {
      try {
        window.localStorage.removeItem(CHAVE_CACHE);
      } catch {
        /* armazenamento indisponível */
      }
      emitir(INICIAL);
      return;
    }
    emitir({ ...estado, sincronizado: false });
    void carregar();
  });
}

function aplicar(p: PreferenciasMercado) {
  emitir({ ...p, sincronizado: estado.sincronizado });
  gravarCache(p);
  agendarGravacao();
}

/* ------------------------------------------------------------------ *
 * Hooks
 * ------------------------------------------------------------------ */

function usePreferencias(): Estado {
  const [local, setLocal] = useState<Estado>(estado);

  useEffect(() => {
    setLocal(estado);
    ouvintes.add(setLocal);
    void carregar();
    return () => {
      ouvintes.delete(setLocal);
    };
  }, []);

  return local;
}

/** Watchlist pessoal, persistida no perfil e sincronizada entre dispositivos. */
export function useFavoritos() {
  const { favoritos, sincronizado } = usePreferencias();

  const alternar = useCallback((ticker: string) => {
    const atual = estado.favoritos;
    aplicar({
      favoritos: atual.includes(ticker) ? atual.filter((t) => t !== ticker) : [...atual, ticker],
      filtroFavoritos: estado.filtroFavoritos,
    });
  }, []);

  const ehFavorito = useCallback((ticker: string) => favoritos.includes(ticker), [favoritos]);

  return { favoritos, alternar, ehFavorito, sincronizado };
}

/** Estado do filtro "Meus Favoritos", também salvo no perfil. */
export function useFiltroFavoritos(): [boolean, (valor?: boolean) => void] {
  const { filtroFavoritos } = usePreferencias();

  const definir = useCallback((valor?: boolean) => {
    aplicar({
      favoritos: estado.favoritos,
      filtroFavoritos: valor ?? !estado.filtroFavoritos,
    });
  }, []);

  return [filtroFavoritos, definir];
}
