import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { exportarCarteira, type FormatoExportacao } from "@/lib/exportacao";
import type { Ativo, Dividendo } from "@/lib/portfolio";

interface Props {
  ativos: Ativo[];
  dividendos?: Dividendo[];
  className?: string;
}

const OPCOES: {
  formato: FormatoExportacao;
  titulo: string;
  descricao: string;
  icone: typeof FileSpreadsheet;
}[] = [
  {
    formato: "xlsx",
    titulo: "Exportar para Excel (.xlsx)",
    descricao:
      "Planilha formatada com abas Carteira e Resumo, filtros e destaque de lucro/prejuízo.",
    icone: FileSpreadsheet,
  },
  {
    formato: "csv",
    titulo: "Exportar para CSV (ChatGPT)",
    descricao: "CSV UTF-8 limpo, com números decimais e datas ISO, pronto para análise por IA.",
    icone: FileText,
  },
  {
    formato: "ambos",
    titulo: "Exportar ambos",
    descricao: "Baixa a planilha Excel e o CSV otimizado para IA de uma só vez.",
    icone: Layers,
  },
];

/** Botão + modal de exportação da carteira (Excel e CSV para IA). */
export function BotaoExportarCarteira({ ativos, dividendos = [], className }: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState<FormatoExportacao | null>(null);

  const exportar = async (formato: FormatoExportacao) => {
    setCarregando(formato);
    try {
      await exportarCarteira(formato, ativos, dividendos);
      toast.success("Arquivo exportado com sucesso.");
      setAberto(false);
    } catch (erro) {
      console.error("Falha ao exportar carteira", erro);
      toast.error("Não foi possível exportar a carteira.");
    } finally {
      setCarregando(null);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !carregando && setAberto(v)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className} disabled={!ativos.length}>
          <Download className="size-4" aria-hidden="true" />
          Exportar Carteira
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar Carteira</DialogTitle>
          <DialogDescription>
            {ativos.length} ativo{ativos.length === 1 ? "" : "s"} serão exportados com os dados
            atuais da carteira.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {OPCOES.map(({ formato, titulo, descricao, icone: Icone }) => {
            const ocupado = carregando !== null;
            return (
              <button
                key={formato}
                type="button"
                onClick={() => exportar(formato)}
                disabled={ocupado}
                className="flex min-h-14 w-full items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {carregando === formato ? (
                  <Loader2
                    className="mt-0.5 size-5 shrink-0 animate-spin text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <Icone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{titulo}</span>
                  <span className="block text-xs text-muted-foreground">{descricao}</span>
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
