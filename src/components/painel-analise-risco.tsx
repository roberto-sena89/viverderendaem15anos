import { useMemo } from "react";
import { Activity, Globe2, ShieldCheck, Waves } from "lucide-react";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { EstadoVazio } from "@/components/estado-vazio";
import {
  diversificacao,
  exposicaoPorMoeda,
  metricasDeSerieMensal,
  montarBenchmarkGlobal,
  retornoPonderado12m,
} from "@/lib/analise-carteira";
import type { Diversidade, ExposicaoMoeda, MetricasRisco } from "@/lib/analise-carteira";
import { useDesempenho12m } from "@/lib/desempenho-12m";
import { brl, evolucaoPatrimonio, pct, resumoCarteira } from "@/lib/portfolio";
import type { Ativo, Aporte } from "@/lib/portfolio";

interface Props {
  carteira: Ativo[];
  aportes: Aporte[];
}

/**
 * Painel "Análise de carteira": benchmark global, exposição por moeda e
 * métricas de risco, em estilo casa de análise.
 */
export function PainelAnaliseRisco({ carteira, aportes }: Props) {
  const tickers = useMemo(() => carteira.map((a) => a.ticker), [carteira]);
  const { porTicker, benchmark } = useDesempenho12m(tickers);

  const analise = useMemo(() => {
    const retornosMap = new Map<string, number | null>();
    for (const [t, nota] of porTicker) {
      retornosMap.set(t, nota.retorno12m);
    }
    const { retornoPct } = retornoPonderado12m(carteira, retornosMap);
    const retornoGlobal = porTicker.get("IVVB11")?.retorno12m ?? null;
    const bm = montarBenchmarkGlobal(retornoPct, benchmark, retornoGlobal);
    const exposicao = exposicaoPorMoeda(carteira);
    const totalAtual = resumoCarteira(carteira).totalAtual;
    const serie = evolucaoPatrimonio(aportes, totalAtual).map((m) => m.patrimonio);
    const risco = metricasDeSerieMensal(serie);
    const divers = diversificacao(carteira);
    return { bm, exposicao, risco, divers };
  }, [carteira, aportes, porTicker, benchmark]);

  if (carteira.length === 0) {
    return (
      <Panel title="Análise de carteira" hint="Benchmark global, moeda, risco e diversificação.">
        <EstadoVazio
          icone={Activity}
          titulo="Cadastre ativos para a análise"
          descricao="Compare com o Ibovespa e o mundo, veja exposição por moeda e métricas de risco."
        />
      </Panel>
    );
  }

  const { bm, exposicao, risco, divers } = analise;

  return (
    <Panel
      title="Análise de carteira"
      hint="Benchmark global, exposição por moeda e risco (estilo casa de análise)."
      action={
        <Badge variant="secondary" className="gap-1">
          <Waves className="size-3" />
          Diversificação {divers.indice}/100
        </Badge>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <BlocoBenchmark
          retornoCarteira={bm.retornoCarteiraPct}
          retornoIbov={bm.retornoIbovPct}
          retornoGlobal={bm.retornoGlobalPct}
          excedenteIbov={bm.excedenteIbovPct}
          excedenteGlobal={bm.excedenteGlobalPct}
          notaIbov={bm.notaIbov}
          notaGlobal={bm.notaGlobal}
        />
        <BlocoMoeda exposicao={exposicao} />
        <BlocoRisco risco={risco} divers={divers} />
      </div>
    </Panel>
  );
}

function BlocoBenchmark({
  retornoCarteira,
  retornoIbov,
  retornoGlobal,
  excedenteIbov,
  excedenteGlobal,
  notaIbov,
  notaGlobal,
}: {
  retornoCarteira: number | null;
  retornoIbov: number | null;
  retornoGlobal: number | null;
  excedenteIbov: number | null;
  excedenteGlobal: number | null;
  notaIbov: number;
  notaGlobal: number;
}) {
  return (
    <div className="space-y-2 text-xs">
      <p className="t-label flex items-center gap-1.5">
        <Globe2 className="size-3.5" /> Benchmark global (12m)
      </p>
      <div className="space-y-1.5">
        <LinhaBenchmark rotulo="Carteira" valor={retornoCarteira} destaque />
        <LinhaBenchmark rotulo="Ibovespa" valor={retornoIbov} />
        <LinhaBenchmark rotulo="Mundo (IVVB)" valor={retornoGlobal} />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <MiniNota rotulo="vs Ibovespa" nota={notaIbov} excedente={excedenteIbov} />
        <MiniNota rotulo="vs Global" nota={notaGlobal} excedente={excedenteGlobal} />
      </div>
    </div>
  );
}

function LinhaBenchmark({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: number | null;
  destaque?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <span className="min-w-0 truncate text-muted-foreground">{rotulo}</span>
      {valor === null ? (
        <span className="num text-muted-foreground">—</span>
      ) : (
        <span
          className={`num flex items-baseline gap-1 font-medium ${destaque ? "text-sm text-foreground" : ""} ${
            valor >= 0 ? "text-success" : "text-destructive"
          }`}
        >
          {valor >= 0 ? "+" : ""}
          {valor.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%
        </span>
      )}
    </div>
  );
}

function MiniNota({
  rotulo,
  nota,
  excedente,
}: {
  rotulo: string;
  nota: number;
  excedente: number | null;
}) {
  const cor = nota >= 7 ? "text-success" : nota >= 5 ? "text-warning" : "text-destructive";
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <p className="truncate text-[0.7rem] text-muted-foreground">{rotulo}</p>
      <p className={`num text-lg font-bold ${cor}`}>
        {nota.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
      </p>
      {excedente !== null ? (
        <p className={`num text-[0.7rem] ${excedente >= 0 ? "text-success" : "text-destructive"}`}>
          {excedente >= 0 ? "+" : ""}
          {excedente.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.
        </p>
      ) : null}
    </div>
  );
}

function BlocoMoeda({ exposicao }: { exposicao: ExposicaoMoeda[] }) {
  const cor = (moeda: ExposicaoMoeda["moeda"]) =>
    moeda === "BRL"
      ? "var(--color-chart-2)"
      : moeda === "USD"
        ? "var(--color-chart-9)"
        : "var(--color-chart-16)";
  return (
    <div className="space-y-2 text-xs">
      <p className="t-label flex items-center gap-1.5">
        <Globe2 className="size-3.5" /> Exposição por moeda
      </p>
      {exposicao.length === 0 ? (
        <p className="text-muted-foreground">Sem dados.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
            {exposicao.map((e) => (
              <div
                key={e.moeda}
                className="h-full"
                style={{ width: `${e.pct * 100}%`, backgroundColor: cor(e.moeda) }}
                title={`${e.rotulo}: ${brl(e.valor, 2)}`}
              />
            ))}
          </div>
          <ul className="space-y-1">
            {exposicao.map((e) => (
              <li key={e.moeda} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cor(e.moeda) }}
                  />
                  <span className="truncate">{e.rotulo}</span>
                </span>
                <span className="num shrink-0">{pct(e.pct, 1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BlocoRisco({ risco, divers }: { risco: MetricasRisco; divers: Diversidade }) {
  return (
    <div className="space-y-2 text-xs">
      <p className="t-label flex items-center gap-1.5">
        <ShieldCheck className="size-3.5" /> Risco (série mensal)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <MiniValor
          rotulo="Vol. anual"
          valor={risco.volatilidadeAnualPct === null ? "—" : pct(risco.volatilidadeAnualPct, 1)}
        />
        <MiniValor
          rotulo="Drawdown máx."
          valor={risco.drawdownMaximoPct === null ? "—" : `-${pct(risco.drawdownMaximoPct, 1)}`}
        />
        <MiniValor
          rotulo="Sharpe"
          valor={
            risco.sharpe === null
              ? "—"
              : risco.sharpe.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
          }
        />
        <MiniValor
          rotulo="Melhor/Pior mês"
          valor={
            risco.melhorMesPct === null || risco.piorMesPct === null
              ? "—"
              : `+${pct(risco.melhorMesPct, 2)} / ${pct(risco.piorMesPct, 2)}`
          }
        />
        <MiniValor
          rotulo="Ativos efetivos"
          valor={divers.numEficaz.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
        />
        <MiniValor
          rotulo="Ret. anualizado"
          valor={risco.retornoAnualizadoPct === null ? "—" : pct(risco.retornoAnualizadoPct, 1)}
        />
      </div>
    </div>
  );
}

function MiniValor({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <p className="truncate text-[0.7rem] text-muted-foreground">{rotulo}</p>
      <p className="num truncate text-[0.875rem] font-semibold text-foreground">{valor}</p>
    </div>
  );
}
