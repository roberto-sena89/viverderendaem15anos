import { useEffect, useRef, useState } from "react";
import { verificarConfigBackend, type ConfigBackend } from "@/lib/supabase-config";

export type EstadoBackend =
  | { status: "ok" }
  | { status: "tentando"; tentativa: number; total: number }
  | { status: "erro"; mensagem: string };

const TENTATIVAS = 5;
const ESPERA_BASE_MS = 800;

/**
 * Verifica a configuração do backend e, em caso de falha, tenta novamente
 * automaticamente (backoff exponencial) antes de exibir o erro ao usuário.
 * Evita o aviso de "serviço indisponível" em falhas transitórias (ex.: as
 * variáveis de ambiente ainda não disponíveis no primeiro render).
 */
export function useBackendPronto(): EstadoBackend & { tentarAgora: () => void } {
  const primeira: ConfigBackend = verificarConfigBackend();
  const [estado, setEstado] = useState<EstadoBackend>(
    primeira.ok ? { status: "ok" } : { status: "tentando", tentativa: 1, total: TENTATIVAS },
  );
  const [ciclo, setCiclo] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (estado.status === "ok") return;

    let cancelado = false;
    let tentativa = 0;

    const tentar = () => {
      if (cancelado) return;
      const resultado = verificarConfigBackend();
      if (resultado.ok) {
        setEstado({ status: "ok" });
        return;
      }
      tentativa += 1;
      if (tentativa >= TENTATIVAS) {
        setEstado({ status: "erro", mensagem: resultado.mensagem });
        return;
      }
      setEstado({ status: "tentando", tentativa: tentativa + 1, total: TENTATIVAS });
      timer.current = window.setTimeout(tentar, ESPERA_BASE_MS * 2 ** (tentativa - 1));
    };

    tentar();

    return () => {
      cancelado = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
    // `ciclo` permite reiniciar a sequência de tentativas manualmente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciclo]);

  const tentarAgora = () => {
    setEstado({ status: "tentando", tentativa: 1, total: TENTATIVAS });
    setCiclo((c) => c + 1);
  };

  return { ...estado, tentarAgora };
}
