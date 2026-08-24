/**
 * Assinatura Web Push (server-side) — alertas que chegam mesmo com o app fechado.
 *
 * Diferente do push nativo do navegador (src/lib/alertas-historico.ts), que só
 * exibe notificações enquanto a página está aberta, aqui a assinatura é salva
 * no Supabase e o servidor envia a notificação via web-push (VAPID) — por
 * exemplo quando um ativo da carteira passa de um limite.
 *
 * Requisitos:
 *   - VITE_VAPID_PUBLIC_KEY no build (chave pública VAPID; a privada fica só
 *     no servidor como VAPID_PRIVATE_KEY).
 *   - Usuário autenticado (a assinatura é vinculada ao auth.uid()).
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { permissaoPush, pedirPermissaoPush } from "@/lib/alertas-historico";

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";

/** Converte a chave VAPID (base64url) no Uint8Array exigido pelo PushManager. */
function urlBase64ParaUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Ajustado = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const dados = atob(base64Ajustado);
  const bytes = new Uint8Array(dados.length);
  for (let i = 0; i < dados.length; i++) bytes[i] = dados.charCodeAt(i);
  return bytes;
}

export function pushAssinaturaSuportada(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    VAPID_PUBLIC_KEY.length > 0 &&
    permissaoPush() !== "indisponivel"
  );
}

export type EstadoPushAssinatura =
  | { status: "nao-suportado" }
  | { status: "nao-autenticado" }
  | { status: "sem-permissao" }
  | { status: "nao-assinado" }
  | { status: "assinando" }
  | { status: "assinado" }
  | { status: "erro"; mensagem: string };

async function lerAssinaturaExistente(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registro = await navigator.serviceWorker.ready;
  return registro.pushManager.getSubscription();
}

function assinaturaParaJson(assinatura: PushSubscription) {
  return assinatura.toJSON();
}

/**
 * Cria (ou reutiliza) a assinatura push do dispositivo e a salva no servidor,
 * vinculada ao usuário autenticado.
 */
export async function inscreverPush(): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  try {
    if (!pushAssinaturaSuportada())
      return { ok: false, mensagem: "Este navegador não suporta notificações push." };

    const { data: sessao } = await supabase.auth.getSession();
    const token = sessao.session?.access_token;
    if (!token) return { ok: false, mensagem: "Faça login para receber alertas push." };

    const permissao = await pedirPermissaoPush();
    if (permissao !== "granted")
      return { ok: false, mensagem: "Permissão de notificações bloqueada no navegador." };

    const registro = await navigator.serviceWorker.ready;
    const assinaturaExistente = await registro.pushManager.getSubscription();
    let assinatura = assinaturaExistente;

    if (!assinatura) {
      assinatura = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ParaUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const resposta = await fetch("/api/push/inscrever", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assinatura: assinaturaParaJson(assinatura) }),
    });
    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => "");
      return {
        ok: false,
        mensagem: `Não foi possível salvar a assinatura.${texto ? ` ${texto}` : ""}`,
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      mensagem: error instanceof Error ? error.message : "Falha ao ativar notificações push.",
    };
  }
}

/** Remove a assinatura do dispositivo e do servidor. */
export async function cancelarPush(): Promise<void> {
  try {
    const { data: sessao } = await supabase.auth.getSession();
    const token = sessao.session?.access_token;
    const assinatura = await lerAssinaturaExistente();

    if (assinatura) {
      const endpoint = assinatura.endpoint;
      await assinatura.unsubscribe().catch(() => {});
      if (token && endpoint) {
        fetch("/api/push/desinscrever", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
    }
  } catch {
    /* silencioso — cancelamento é best-effort */
  }
}

/** Hook de estado da assinatura push para toggles na UI. */
export function usePushAssinatura() {
  const [estado, setEstado] = useState<EstadoPushAssinatura>({ status: "nao-assinado" });

  const atualizarEstado = useCallback(async () => {
    if (!pushAssinaturaSuportada()) {
      setEstado({ status: "nao-suportado" });
      return;
    }
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      setEstado({ status: "nao-autenticado" });
      return;
    }
    if (permissaoPush() !== "granted") {
      setEstado({ status: "sem-permissao" });
      return;
    }
    const assinatura = await lerAssinaturaExistente();
    setEstado(assinatura ? { status: "assinado" } : { status: "nao-assinado" });
  }, []);

  useEffect(() => {
    atualizarEstado();
  }, [atualizarEstado]);

  const ativar = useCallback(async () => {
    setEstado({ status: "assinando" });
    const resultado = await inscreverPush();
    if (resultado.ok) {
      setEstado({ status: "assinado" });
    } else {
      setEstado({ status: "erro", mensagem: resultado.mensagem });
    }
    return resultado.ok;
  }, []);

  const desativar = useCallback(async () => {
    await cancelarPush();
    setEstado({ status: "nao-assinado" });
  }, []);

  return { estado, ativar, desativar, atualizarEstado };
}
