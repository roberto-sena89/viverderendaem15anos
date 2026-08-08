import { useMemo } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, HeartPulse, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstadoVazio } from "@/components/estado-vazio";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { corClasse } from "@/lib/cores-ativos";
import { brl, classeDoAtivo, CLASSE_POS_FIXADO, pct, valorAtual } from "@/lib/portfolio";
import type { Ativo } from "@/lib/portfolio";

interface Analise {
  score: number;
  selo: string;
  totalAtual: number;
  numeroAtivos: number;
  numeroClasses: number;
  dy: number;
  top1: { ticker: string; pct: number } | null;
  top3Pct: number;
  top5Pct: number;
  concentracaoClasse: number;
  classes: { classe: string; valor: number; pct: number; alvo: number; desvio: number }[];
  fortes: string[];
  fracos: string[];
}

/** Mesma metodologia da auditoria do Técnico IA, calculada no cliente. */
function analisar(ativos: Ativo[], alvo: Record<string, number>): Analise {
  const totalAtual = ativos.reduce((s, a) => s + valorAtual(a), 0);
  const dividendos = ativos.reduce((s, a) => s + (valorAtual(a) * a.dy) / 100, 0);
  const dy = totalAtual > 0 ? (dividendos / totalAtual) * 100 : 0;

  const porClasse = new Map<string, number>();
  for (const a of ativos) {
    const classe = classeDoAtivo(a);
    porClasse.set(classe, (porClasse.get(classe) ?? 0) + valorAtual(a));
  }
  const classes = [...porClasse.entries()]
    .map(([classe, valor]) => ({
      classe,
      valor,
      pct: totalAtual > 0 ? (valor / totalAtual) * 100 : 0,
      alvo: alvo[classe] ?? 0,
      desvio: (totalAtual > 0 ? (valor / totalAtual) * 100 : 0) - (alvo[classe] ?? 0),
    }))
    .sort((x, y) => y.valor - x.valor);

  const ordenados = [...ativos].sort((x, y) => valorAtual(y) - valorAtual(x));
  const top1 = ordenados[0];
  const top1Pct = top1 && totalAtual > 0 ? (valorAtual(top1) / totalAtual) * 100 : 0;
  const top3Pct =
    totalAtual > 0
      ? (ordenados.slice(0, 3).reduce((s, a) => s + valorAtual(a), 0) / totalAtual) * 100
      : 0;
  const top5Pct =
    totalAtual > 0
      ? (ordenados.slice(0, 5).reduce((s, a) => s + valorAtual(a), 0) / totalAtual) * 100
      : 0;
  const concentracaoClasse = classes.length ? Math.max(...classes.map((c) => c.pct)) : 0;

  const temRendaFixa = classes.some((c) => c.classe === CLASSE_POS_FIXADO);
  const temEquities = classes.some((c) =>
    ["Ações", "ETFs - Brasil", "ETFs - Global", "BDRs", "Stocks"].includes(c.classe),
  );
  const temFiis = classes.some((c) => c.classe === "FIIs");

  const fortes: string[] = [];
  const fracos: string[] = [];

  if (top1Pct > 50)
    fracos.push(`Concentração alta em ${top1.ticker} (${top1Pct.toFixed(0)}% do patrimônio).`);
  else if (top1Pct > 30)
    fracos.push(`${top1.ticker} concentra ${top1Pct.toFixed(0)}% da carteira.`);
  else if (ativos.length > 0) fortes.push(`Nenhum ativo passa de 30% da carteira.`);
  if (ativos.length < 5)
    fracos.push(`Poucos ativos (${ativos.length}): risco individual ainda alto.`);
  else if (ativos.length >= 10)
    fortes.push(`${ativos.length} ativos: boa capilaridade de posições.`);
  if (!temRendaFixa && ativos.length > 0)
    fracos.push("Sem renda fixa: falta colchão de segurança.");
  if (!temEquities && ativos.length > 0)
    fracos.push("Sem ações/ETFs: pouco potencial de crescimento.");
  if (!temFiis && ativos.length > 0) fracos.push("Sem FIIs: faltam geradores de renda recorrente.");
  if (temEquities && temRendaFixa)
    fortes.push("Mix equilibrado entre renda fixa e renda variável.");
  if (dy >= 6) fortes.push(`DY elevado (${dy.toFixed(1)}%): boa renda passiva.`);
  else if (dy > 0 && dy < 2 && ativos.length > 0)
    fracos.push(`DY baixo (${dy.toFixed(1)}%): renda passiva tímida.`);

  const score = Math.max(
    0,
    Math.min(
      100,
      (ativos.length >= 10 ? 25 : ativos.length >= 5 ? 18 : ativos.length >= 3 ? 12 : 4) +
        (top1Pct <= 15 ? 25 : top1Pct <= 30 ? 18 : top1Pct <= 50 ? 8 : 2) +
        (temRendaFixa ? 15 : 0) +
        (temEquities ? 15 : 0) +
        (temFiis ? 10 : 0) +
        (dy >= 4 ? 10 : dy >= 2 ? 5 : 0),
    ),
  );

  return {
    score,
    selo: score >= 75 ? "Saúde sólida" : score >= 50 ? "Em construção" : "Riscos a corrigir",
    totalAtual,
    numeroAtivos: ativos.length,
    numeroClasses: classes.length,
    dy,
    top1: top1 ? { ticker: top1.ticker, pct: top1Pct } : null,
    top3Pct,
    top5Pct,
    concentracaoClasse,
    classes,
    fortes,
    fracos,
  };
}

function AnelScore({ score }: { score: number }) {
  const raio = 44;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - score / 100);
  const cor =
    score >= 75
      ? "var(--color-success)"
      : score >= 50
        ? "var(--color-warning)"
        : "var(--color-destructive)";
  return (
    <div
      className="relative size-32 shrink-0"
      role="img"
      aria-label={`Score de saúde da carteira: ${score} de 100`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={raio} fill="none" stroke="var(--color-muted)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num font-display text-3xl font-bold" style={{ color: cor }}>
          {score}
        </span>
        <span className="text-[0.7rem] text-muted-foreground">de 100</span>
      </div>
    </div>
  );
}

/** Card de saúde da carteira exibido no resumo. */
export function SaudeCarteira({ carteira }: { carteira: Ativo[] }) {
  const { alvo } = useAlocacaoAlvo();
  const analise = useMemo(() => analisar(carteira, alvo), [carteira, alvo]);

  if (carteira.length === 0) {
    return (
      <Panel
        title="Saúde da carteira"
        hint="Score calculado a partir da diversificação e concentração reais."
      >
        <EstadoVazio
          icone={HeartPulse}
          titulo="Cadastre ativos para ver o score"
          descricao="O diagnóstico de diversificação, concentração e risco aparece automaticamente aqui."
        />
      </Panel>
    );
  }

  const desvioMaior = Math.max(...analise.classes.map((c) => Math.abs(c.desvio)));

  return (
    <Panel
      title="Saúde da carteira"
      hint="Score de diversificação e risco, na mesma metodologia do Técnico IA."
      action={
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="size-3" />
          {analise.selo}
        </Badge>
      }
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-3">
          <AnelScore score={analise.score} />
          <p className="text-xs text-muted-foreground">
            {analise.numeroAtivos} ativos · {analise.numeroClasses} classes
          </p>
        </div>

        <div className="grid w-full flex-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 text-xs">
            <p className="text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Concentração
            </p>
            <div className="space-y-1.5">
              <BarraProgresso
                rotulo={analise.top1 ? `Maior posição (${analise.top1.ticker})` : "Maior posição"}
                valor={analise.top1?.pct ?? 0}
                cor="var(--color-chart-14)"
              />
              <BarraProgresso
                rotulo="Top 3 ativos"
                valor={analise.top3Pct}
                cor="var(--color-chart-11)"
              />
              <BarraProgresso
                rotulo="Top 5 ativos"
                valor={analise.top5Pct}
                cor="var(--color-chart-12)"
              />
              <BarraProgresso
                rotulo="Classe dominante"
                valor={analise.concentracaoClasse}
                cor="var(--color-chart-16)"
              />
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Indicadores
            </p>
            <div className="grid grid-cols-2 gap-2">
              <IndicadorValor rotulo="Patrimônio" valor={brl(analise.totalAtual, 2)} />
              <IndicadorValor rotulo="DY estimado" valor={pct(analise.dy, 2)} />
              <IndicadorValor rotulo="Maior desvio do alvo" valor={pct(desvioMaior, 1)} />
              <IndicadorValor rotulo="Concentração top1" valor={pct(analise.top1?.pct ?? 0, 1)} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {analise.fracos.length > 0 ? (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <AlertTriangle className="size-3.5" /> Pontos de atenção
            </p>
            <ul className="space-y-1">
              {analise.fracos.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {analise.fortes.length > 0 ? (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckCircle2 className="size-3.5" /> Pontos fortes
            </p>
            <ul className="space-y-1">
              {analise.fortes.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-success" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {analise.classes.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
            Alocação por classe vs. alvo
          </p>
          <div className="space-y-2">
            {analise.classes.map((c) => (
              <div key={c.classe} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: corClasse(c.classe) }}
                    />
                    <span className="truncate">{c.classe}</span>
                  </span>
                  <span className="num shrink-0">
                    {pct(c.pct, 1)}
                    <span className={c.desvio >= 0 ? "text-success" : "text-destructive"}>
                      {" "}
                      ({c.desvio >= 0 ? "+" : ""}
                      {pct(c.desvio, 1)} vs alvo)
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, c.pct)}%`,
                      backgroundColor: corClasse(c.classe),
                    }}
                  />
                  <div
                    className="mt-0.5 h-px bg-foreground/40"
                    style={{ width: `${Math.min(100, c.alvo)}%` }}
                    title={`Alvo: ${pct(c.alvo, 0)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 border-t border-border pt-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/chat">
            Auditoria completa no Técnico IA
            <ArrowRight className="ml-2 size-3.5" />
          </Link>
        </Button>
      </div>
    </Panel>
  );
}

function BarraProgresso({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-muted-foreground">{rotulo}</span>
        <span className="num font-medium text-foreground">{pct(valor, 1)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, valor)}%`, backgroundColor: cor }}
        />
      </div>
    </div>
  );
}

function IndicadorValor({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <p className="truncate text-[0.7rem] text-muted-foreground">{rotulo}</p>
      <p className="num truncate text-[0.875rem] font-semibold text-foreground">{valor}</p>
    </div>
  );
}
