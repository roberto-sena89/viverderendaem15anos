import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarPosicoesMeuPluggy,
  sincronizarAtivosMeuPluggy,
  type PosicaoPluggy,
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
      return (res.posicoes ?? []) as PosicaoPluggy[];
    },
    retry: false,
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
      await Promise.all(
        [qc.invalidateQueries({ queryKey: qk.ativos }), qc.invalidateQueries({ queryKey: qk.aportes })],
      );
    },
  });
}
