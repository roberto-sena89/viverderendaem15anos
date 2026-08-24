import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Copy, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAtivos, useAportes, useDividendos, useMetas } from "@/lib/data";
import {
  gerarRelatorioSemanal,
  lerPatrimonioAnterior,
  salvarPatrimonioSemana,
} from "@/lib/relatorio-semanal";
import { brl } from "@/lib/portfolio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Relatório Semanal do Investidor — resumo gerado dos dados reais. */
export function RelatorioSemanal() {
  const { data: ativos = [] } = useAtivos();
  const { data: aportes = [] } = useAportes();
  const { data: dividendos = [] } = useDividendos();
  const { data: metas = [] } = useMetas();
  const [patrimonioAnterior, setPatrimonioAnterior] = useState<number | null>(null);
  const [geradoEm, setGeradoEm] = useState<string | null>(null);

  useEffect(() => {
    setPatrimonioAnterior(lerPatrimonioAnterior());
  }, []);

  const relatorio = useMemo(
    () =>
      gerarRelatorioSemanal({
        ativos,
        aportes,
        dividendos,
        metas,
        patrimonioAnterior,
      }),
    [ativos, aportes, dividendos, metas, patrimonioAnterior],
  );

  const regenerar = () => {
    salvarPatrimonioSemana(relatorio.patrimonioAtual);
    setGeradoEm(new Date().toISOString());
    toast.success("Relatório regenerado com os dados mais recentes.");
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(relatorio.resumoTexto);
      toast.success("Resumo copiado — cole no WhatsApp ou redes!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4 text-primary" />
          Resumo Semanal
          <Badge variant="outline" className="text-[10px]">
            {relatorio.semana}
          </Badge>
        </CardTitle>
        <CardDescription>
          Gerado automaticamente a partir da sua carteira. Compare semana a semana.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Patrimônio</p>
            <p className="text-sm font-semibold tabular-nums">{brl(relatorio.patrimonioAtual)}</p>
            {relatorio.variacaoSemana != null && (
              <p
                className={`text-[11px] tabular-nums ${
                  relatorio.variacaoSemana >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {relatorio.variacaoSemana >= 0 ? "+" : ""}
                {relatorio.variacaoSemana.toFixed(1)}% na semana
              </p>
            )}
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Aportes na semana</p>
            <p className="text-sm font-semibold tabular-nums">{brl(relatorio.aportesSemana)}</p>
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Proventos na semana</p>
            <p className="text-sm font-semibold tabular-nums">{brl(relatorio.dividendosSemana)}</p>
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Renda/mês estimada</p>
            <p className="text-sm font-semibold tabular-nums">{brl(relatorio.proximosProventos)}</p>
          </div>
        </div>

        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
          {relatorio.resumoTexto}
        </pre>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={copiar}>
            <Copy className="mr-1.5 size-3.5" /> Copiar resumo
          </Button>
          <Button size="sm" variant="ghost" onClick={regenerar}>
            <RefreshCw className="mr-1.5 size-3.5" /> Atualizar
          </Button>
          {geradoEm && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarRange className="size-3" /> Atualizado às{" "}
              {new Date(geradoEm).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
