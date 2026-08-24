import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  gerarConnectTokenMeuPluggy,
  listarPosicoesMeuPluggy,
  sincronizarAtivosMeuPluggy,
} from "@/lib/pluggy.functions";
import { qk } from "@/lib/data";

/** Busca as posições de investimentos conectadas no Meu Pluggy. */
export function usePosicoesMeuPluggy() {
  const buscar = useServerFn(listarPosicoesMeuPluggy);
  return useQuery({
    queryKey: ["pluggy", "posicoes"],
    queryFn: async () => {
      const res = await buscar();
      if (!res.ok) throw new Error(res.mensagem ?? "Falha ao consultar o Meu Pluggy.");
      return res.posicoes ?? [];
    },
    retry: false,
  });
}

/**
 * Gera um Connect Token (curto, ~30 min) para embutir o widget Pluggy Connect
 * no fluxo de consentimento Open Finance. Retorna por ref; o componente usa o
 * valor para abrir o widget.
 */
export function useGerarConnectTokenMeuPluggy() {
  const gerar = useServerFn(gerarConnectTokenMeuPluggy);
  return useMutation({
    mutationFn: async () => {
      const res = await gerar();
      if (!res.ok) throw new Error(res.mensagem ?? "Falha ao gerar o Connect Token.");
      return res.accessToken as string;
    },
  });
}

/** Sincroniza as posições do Meu Pluggy na tabela `ativos` e revalida a carteira. */
export function useSincronizarMeuPluggy() {
  const qc = useQueryClient();
  const sincronizar = useServerFn(sincronizarAtivosMeuPluggy);

  return useMutation({
    mutationFn: async () => {
      const res = await sincronizar();
      if (!res.ok) throw new Error(res.mensagem ?? "Falha ao sincronizar com o Meu Pluggy.");
      return res;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.ativos }),
        qc.invalidateQueries({ queryKey: qk.aportes }),
      ]);
    },
  });
}
