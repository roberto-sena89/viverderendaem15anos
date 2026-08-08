import { CalendarClock } from "lucide-react";
import { useAportes } from "@/lib/data";

const LIMITE_DIAS = 15;

function diasDesde(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/**
 * Avisa quando o último aporte registrado está antigo, sugerindo reimportar
 * o extrato da B3 ou da corretora.
 */
export function AvisoSincronizacao({ compacto = false }: { compacto?: boolean }) {
  const { data: aportes } = useAportes();
  if (!aportes) return null;

  const ultimo = aportes[0]?.data;
  const dias = ultimo ? diasDesde(ultimo) : null;
  if (dias !== null && dias < LIMITE_DIAS) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:text-amber-300">
      <div className="flex gap-3">
        <CalendarClock className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {dias === null
              ? "Sua carteira ainda não tem aportes importados"
              : `Seu último aporte foi há ${dias} dias`}
          </p>
          {!compacto ? (
            <p className="text-xs opacity-90">
              Para manter os dados atualizados: entre em investidor.b3.com.br (ou no home broker da
              Ágora), exporte o Extrato de Negociação/Movimentação em Excel ou CSV e envie o arquivo
              na aba “Importar carteira”. As cotações são atualizadas automaticamente todos os dias.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
