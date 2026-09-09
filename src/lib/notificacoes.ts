/**
 * Caixa de notificações do app (tabela `notificacoes`).
 *
 * Entrega dentro do aplicativo — funciona mesmo quando o navegador não
 * autorizou notificações nativas. Atualiza em tempo real via Realtime.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NotificacaoApp {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  url: string | null;
  ticker: string | null;
  lida: boolean;
  criada_em: string;
}

/** Cliente sem tipagem gerada para a tabela nova. */
function tabela() {
  return (supabase as unknown as { from: (t: string) => any }).from("notificacoes");
}

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<NotificacaoApp[]>([]);

  const carregar = useCallback(async () => {
    try {
      const { data } = await tabela()
        .select("id, tipo, titulo, corpo, url, ticker, lida, criada_em")
        .order("criada_em", { ascending: false })
        .limit(50);
      if (data) setNotificacoes(data as NotificacaoApp[]);
    } catch {
      /* tabela indisponível */
    }
  }, []);

  useEffect(() => {
    void carregar();
    const canal = supabase
      .channel("notificacoes-app")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes" },
        () => void carregar(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [carregar]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const marcarTodasLidas = useCallback(async () => {
    const pendentes = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (pendentes.length === 0) return;
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })));
    try {
      await tabela().update({ lida: true }).in("id", pendentes);
    } catch {
      /* ignora */
    }
  }, [notificacoes]);

  const limpar = useCallback(async () => {
    const ids = notificacoes.map((n) => n.id);
    if (ids.length === 0) return;
    setNotificacoes([]);
    try {
      await tabela().delete().in("id", ids);
    } catch {
      /* ignora */
    }
  }, [notificacoes]);

  return { notificacoes, naoLidas, marcarTodasLidas, limpar, recarregar: carregar };
}
