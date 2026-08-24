import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Lightbulb, TrendingDown } from "lucide-react";
import { useAportes, useAtivos } from "@/lib/data";
import {
  calcularPrejuizoFiscal,
  sugerirTaxLoss,
  type SugestaoTaxLoss,
} from "@/lib/prejuizo-fiscal";
import { brl } from "@/lib/portfolio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function DetalheSugestao({ s }: { s: SugestaoTaxLoss }) {
  const [aberto, setAberto] = useState(false);
  const compensacao = s.perdaPotencial * 0.15;
  return (
    <div className="rounded-md border border-border/60 px-3 py-2">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <TrendingDown className="size-4 text-destructive" />
          <span className="font-medium">{s.ticker}</span>
          <Badge variant="outline" className="text-[10px]">
            {s.categoria}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {s.quantidade} cotas · {brl(s.precoAtual)} vs {brl(s.precoMedio)}
          </span>
          <span className="tabular-nums text-destructive">{brl(s.perdaPotencial)}</span>
          <span className={cn("tabular-nums", "text-destructive")}>{s.pctPerda.toFixed(1)}%</span>
        </div>
      </button>
      {aberto && (
        <p className="mt-2 border-t border-border/40 pt-2 text-xs text-muted-foreground">
          Vender hoje realizaria{" "}
          <strong className="text-destructive">{brl(s.perdaPotencial)} de prejuízo</strong>. Esse
          valor pode compensar ganhos de capital da mesma categoria (economia potencial de IR:{" "}
          <strong>{brl(compensacao)}</strong>). Apenas simulação — não é recomendação de venda.
        </p>
      )}
    </div>
  );
}

/** Painel de Prejuízo Fiscal & Tax-Loss Harvesting. */
export function PainelPrejuizoFiscal() {
  const { data: aportes = [] } = useAportes();
  const { data: ativos = [] } = useAtivos();

  const painel = useMemo(() => calcularPrejuizoFiscal(aportes), [aportes]);
  const sugestoes = useMemo(() => sugerirTaxLoss(ativos, painel), [ativos, painel]);

  const comPrejuizo = painel.porRegra.filter((r) => r.saldo < 0);
  const maxPrejuizo = Math.max(1, ...comPrejuizo.map((r) => r.prejuizoAcumulado));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            Apuração de prejuízos acumulados
          </CardTitle>
          <CardDescription>
            {painel.prejuizoTotal > 0
              ? `${brl(painel.prejuizoTotal)} de prejuízo disponível para compensar ganhos futuros.`
              : "Nenhum prejuízo acumulado — seu histórico de vendas está no lucro."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {comPrejuizo.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              Sem prejuízos pendentes de compensação.
            </div>
          ) : (
            <div className="space-y-3">
              {comPrejuizo.map((r) => (
                <div key={r.regra}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{r.rotulo}</span>
                    <span className="tabular-nums">
                      <span className="text-destructive">{brl(-r.saldo)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · ganho {brl(r.ganhoAcumulado)}
                      </span>
                    </span>
                  </div>
                  <Progress value={(r.prejuizoAcumulado / maxPrejuizo) * 100} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="size-4 text-primary" />
            Tax-Loss Harvesting — oportunidades
          </CardTitle>
          <CardDescription>
            Ativos abaixo do preço médio. Vender realizaria prejuízo que compensa ganhos de capital
            (mesma categoria, meses seguintes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sugestoes.length === 0 ? (
            <div className="rounded-md bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
              Nenhum ativo abaixo do preço médio no momento.
            </div>
          ) : (
            <div className="space-y-2">
              {sugestoes.map((s) => (
                <DetalheSugestao key={s.ticker} s={s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="size-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>{painel.aviso}</AlertDescription>
      </Alert>
    </div>
  );
}
