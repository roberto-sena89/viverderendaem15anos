import { useMemo } from "react";
import { Award, Crown } from "lucide-react";
import { useAtivos, useAportes, useDividendos, useMetas } from "@/lib/data";
import { calcularScoreInvestidor } from "@/lib/score-investidor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const COR_NIVEL: Record<string, string> = {
  iniciante: "text-muted-foreground",
  aprendiz: "text-sky-500",
  disciplinado: "text-emerald-500",
  estratega: "text-violet-500",
  lenda: "text-amber-500",
};

/** Score do Investidor — gamificação com transparência por pilar. */
export function ScoreInvestidor() {
  const { data: ativos = [] } = useAtivos();
  const { data: aportes = [] } = useAportes();
  const { data: dividendos = [] } = useDividendos();
  const { data: metas = [] } = useMetas();

  const score = useMemo(
    () => calcularScoreInvestidor({ ativos, aportes, dividendos, metas }),
    [ativos, aportes, dividendos, metas],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="size-4 text-amber-500" />
          Score do Investidor
        </CardTitle>
        <CardDescription>
          Nota geral (0–100) calculada dos seus dados reais — cada pilar mostra o que contribuiu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nota + nível */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex size-20 shrink-0 flex-col items-center justify-center rounded-full border-4",
              score.nota >= 90
                ? "border-amber-400/60"
                : score.nota >= 70
                  ? "border-violet-400/50"
                  : score.nota >= 50
                    ? "border-emerald-400/50"
                    : "border-muted",
            )}
          >
            <span className="text-2xl font-bold tabular-nums">{score.nota}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
          <div>
            <p className={cn("text-lg font-semibold", COR_NIVEL[score.nivel.id] ?? "")}>
              {score.nivel.id === "lenda" ? <Crown className="mb-0.5 inline size-4" /> : null}{" "}
              {score.nivel.nome}
            </p>
            {score.proximoNivel && (
              <p className="text-xs text-muted-foreground">
                Faltam {score.proximoNivel.falta} pontos para{" "}
                <strong>{score.proximoNivel.nome}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Pilares */}
        <div className="space-y-3">
          {score.pilares.map((p) => (
            <div key={p.chave}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">
                  {p.rotulo}
                  <span className="ml-1 text-muted-foreground">({p.peso}%)</span>
                </span>
                <span className="tabular-nums">{p.nota}</span>
              </div>
              <Progress value={p.nota} className="h-1.5" />
              <p className="mt-0.5 text-[11px] text-muted-foreground">{p.detalhe}</p>
            </div>
          ))}
        </div>

        {/* Conquistas */}
        {score.conquistas.length > 0 && (
          <div className="border-t border-border/40 pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Conquistas</p>
            <div className="flex flex-wrap gap-1.5">
              {score.conquistas.map((c) => (
                <Badge key={c} variant="secondary" className="text-[11px]">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
