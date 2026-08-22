import { PluggyConnect } from "react-pluggy-connect";
import { Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGerarConnectTokenMeuPluggy } from "@/lib/pluggy";

/**
 * Botão que gera um Connect Token no servidor e abre o widget Pluggy Connect
 * (fluxo de consentimento Open Finance). O usuário escolhe a instituição
 * (ex.: Ágora Investimentos / Bradesco), autentica e autoriza o compartilhamento
 * dos dados. Ao concluir, `onConectado` é chamado com o id do item criado.
 */
export function BotaoConectarPluggy({
  onConectado,
  rotulo = "Conectar instituição",
}: {
  onConectado?: (itemId: string) => void;
  rotulo?: string;
}) {
  const gerarToken = useGerarConnectTokenMeuPluggy();
  const token = gerarToken.data;

  const abrir = () => {
    if (gerarToken.data) return;
    gerarToken.mutate();
  };

  const handleSucesso = (data: { item: { id: string } }) => {
    onConectado?.(data.item.id);
  };

  const handleErro = (erro: { message: string }) => {
    // eslint-disable-next-line no-console
    console.error("Falha na conexão Pluggy:", erro.message);
  };

  return (
    <>
      {token ? (
        <PluggyConnect
          connectToken={token}
          includeSandbox
          language="pt-BR"
          onSuccess={handleSucesso}
          onError={handleErro}
        />
      ) : (
        <Button type="button" onClick={abrir} disabled={gerarToken.isPending} className="gap-2">
          <Plug className="size-4" />
          {gerarToken.isPending ? "Preparando conexão..." : rotulo}
        </Button>
      )}
    </>
  );
}
