import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/data";

const TABELAS = ["ativos", "aportes", "dividendos"] as const;

/**
 * Mantém as métricas da carteira sincronizadas em tempo real: escuta as
 * mudanças no banco (websocket) e revalida as queries. Um polling curto
 * (20s) serve de rede de segurança caso o websocket caia.
 */
export function useCarteiraRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    let ativo = true;

    const revalidar = () => {
      if (!ativo) return;
      void Promise.all(
        [qk.ativos, qk.aportes, qk.dividendos].map((queryKey) =>
          qc.invalidateQueries({ queryKey, refetchType: "all" }),
        ),
      );
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!ativo || !userId) return;

      const ch = supabase.channel(`carteira-${userId}`);
      for (const table of TABELAS) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
          revalidar,
        );
      }
      ch.subscribe();
      channel = ch;
    });

    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") revalidar();
    }, 20_000);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);
}
