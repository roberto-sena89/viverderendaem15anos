/**
 * Ficha do ativo no Radar — gráfico da série completa desde o início,
 * posição histórica, janela de 52 semanas, ficha fundamentalista, notícias
 * relacionadas e análise do Gestor IA (com fatos externos em tempo real).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Loader2, MessageSquare, Sparkles, FlaskConical } from "lucide-react";
import { fmtPreco } from "@/components/cotacoes/formatos";
import { CORES_SINAL, ROTULOS_ZONA } from "@/lib/radar-base";
import {
  useRadarAnaliseIA,
  useRadarBacktest,
  useRadarDetalhe,
  useRadarHistoricoIA,
} from "@/lib/radar";
import { notificarPush, registrarAlerta } from "@/lib/alertas-historico";
import type { DetalheFundamentos } from "@/lib/radar.functions";
import type { LinhaRadarBase } from "@/lib/radar.server";

const ROTULOS_VEREDITO: Record<string, string> = {
  comprar: "Comprar",
  manter: "Manter",
  vender: "Vender",
  observar: "Observar",
};

const ROTULOS_CONVICCAO: Record<string, string> = {
  alta: "Convicção alta",
  media: "Convicção média",
  baixa: "Convicção baixa",
};

const ROTULOS_HORIZONTE: Record<string, string> = {
  curto: "Curto prazo",
  medio: "Médio prazo",
  longo: "Longo prazo",
};

const CORES_CONVICCAO: Record<string, string> = {
  alta: "border-none bg-green-600/10 text-green-600",
  media: "border-none bg-amber-500/10 text-amber-600",
  baixa: "border-none bg-muted text-muted-foreground",
};

const avisosVeredito = new Set<string>();

const corVariacao = (v: number | null) =>
  v === null
    ? "text-muted-foreground"
    : v > 0
      ? "text-positive"
      : v < 0
        ? "text-negative"
        : "text-muted-foreground";

const fmtPct = (v: number | null | undefined, casas = 1): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
};

const fmtBrl = (v: number | null | undefined, casas = 2): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const min = Math.abs(v) < 1 ? 4 : casas;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: min })}`;
};

const fmtGrande = (v: number | null | undefined): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1e9)
    return `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} B`;
  if (Math.abs(v) >= 1e6)
    return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} M`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};

const fmtVolume = (v: number | null | undefined): string => {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return "—";
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} B`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} M`;
  if (v >= 1e3) return `${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
};

function Campo({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={`text-sm font-semibold tabular-nums ${destaque ?? ""}`}>{valor}</p>
    </div>
  );
}

type ChaveMedia = "ma20" | "ma60" | "ma200";

const MEDIAS_MOVEIS: [ChaveMedia, number, string][] = [
  ["ma20", 20, "#818cf8"],
  ["ma60", 60, "#f59e0b"],
  ["ma200", 200, "#a78bfa"],
];

type PontoComMedia = {
  d: string;
  f: number;
  ma20: number | null;
  ma60: number | null;
  ma200: number | null;
};

function comMediasMoveis(pontos: { d: string; f: number }[]): PontoComMedia[] {
  return pontos.map((p, i) => {
    const linha: PontoComMedia = { d: p.d, f: p.f, ma20: null, ma60: null, ma200: null };
    for (const [chave, janela] of MEDIAS_MOVEIS) {
      if (i + 1 >= janela) {
        const fatia = pontos.slice(i - janela + 1, i + 1);
        linha[chave] = fatia.reduce((s, q) => s + q.f, 0) / janela;
      }
    }
    return linha;
  });
}

function GraficoSerie({ pontos }: { pontos: { d: string; f: number }[] }) {
  const dados = comMediasMoveis(pontos);
  const tem200 = pontos.length >= 200;
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-[var(--color-chart-1)]" aria-hidden /> Fechamento
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-[#818cf8]" aria-hidden /> MM20
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-[#f59e0b]" aria-hidden /> MM60
        </span>
        {tem200 ? (
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#a78bfa]" aria-hidden /> MM200
          </span>
        ) : null}
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="grad-radar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="d"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              minTickGap={32}
              stroke="var(--color-muted-foreground)"
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" })
              }
            />
            <YAxis
              tickFormatter={(v: number) =>
                `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
              }
              tickLine={false}
              axisLine={false}
              width={70}
              fontSize={12}
              stroke="var(--color-muted-foreground)"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                color: "var(--color-popover-foreground)",
                fontSize: "13px",
              }}
              labelFormatter={(d) =>
                new Date(String(d)).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
              }
              formatter={(v: number, nome: string | number) => [
                fmtBrl(v),
                nome === "f" ? "Fechamento" : String(nome).toUpperCase(),
              ]}
            />
            <Area
              type="monotone"
              dataKey="f"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              fill="url(#grad-radar)"
              name="Fechamento"
            />
            {MEDIAS_MOVEIS.map(([chave, , cor]) =>
              chave === "ma200" && !tem200 ? null : (
                <Line
                  key={chave}
                  type="monotone"
                  dataKey={chave}
                  stroke={cor}
                  strokeWidth={1.2}
                  dot={false}
                  activeDot={false}
                  name={chave.toUpperCase()}
                />
              ),
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FichaFundamentos({ p }: { p: DetalheFundamentos }) {
  if (p.categoria === "acao") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Campo rotulo="Setor" valor={p.setor ?? "—"} />
        <Campo rotulo="Segmento" valor={p.segmento ?? "—"} />
        <Campo rotulo="P/L" valor={p.pl !== null ? p.pl.toLocaleString("pt-BR") : "—"} />
        <Campo rotulo="P/VPA" valor={p.pvp !== null ? p.pvp.toLocaleString("pt-BR") : "—"} />
        <Campo
          rotulo="DY 12m"
          valor={p.dy12 !== null ? `${p.dy12.toLocaleString("pt-BR")}%` : "—"}
        />
        <Campo rotulo="ROE" valor={p.roe !== null ? fmtPct(p.roe) : "—"} />
        <Campo rotulo="ROIC" valor={p.roic !== null ? fmtPct(p.roic) : "—"} />
        <Campo
          rotulo="Margem líquida"
          valor={p.margemLiquida !== null ? fmtPct(p.margemLiquida) : "—"}
        />
        <Campo rotulo="Margem EBIT" valor={p.margemEbit !== null ? fmtPct(p.margemEbit) : "—"} />
        <Campo
          rotulo="Dívida / Patrimônio"
          valor={p.dividaPatrimonio !== null ? p.dividaPatrimonio.toLocaleString("pt-BR") : "—"}
        />
        <Campo
          rotulo="Cresc. receita 5a"
          valor={p.crescReceita5a !== null ? fmtPct(p.crescReceita5a) : "—"}
        />
        <Campo rotulo="Lucro 12m" valor={fmtGrande(p.lucro)} />
        <Campo rotulo="Receita 12m" valor={fmtGrande(p.receita)} />
        <Campo rotulo="Patrimônio líquido" valor={fmtGrande(p.patrimonio)} />
        <Campo rotulo="Valor de mercado" valor={fmtGrande(p.valorMercado)} />
        <Campo
          rotulo="Teto de Bazin"
          valor={fmtBrl(p.precoTetoBazin)}
          destaque={p.upsideBazin !== null && p.upsideBazin > 0 ? "text-positive" : undefined}
        />
        <Campo
          rotulo="Upside Bazin"
          valor={fmtPct(p.upsideBazin)}
          destaque={p.upsideBazin !== null && p.upsideBazin > 0 ? "text-positive" : undefined}
        />
        <Campo
          rotulo="Preço justo (Graham)"
          valor={fmtBrl(p.precoJustoGraham)}
          destaque={p.upsideGraham !== null && p.upsideGraham > 0 ? "text-positive" : undefined}
        />
        <Campo
          rotulo="Upside Graham"
          valor={fmtPct(p.upsideGraham)}
          destaque={p.upsideGraham !== null && p.upsideGraham > 0 ? "text-positive" : undefined}
        />
        <Campo
          rotulo="Nota Buy & Hold"
          valor={p.pontuacao !== null ? `${p.pontuacao}/100` : "—"}
          destaque={
            p.pontuacao !== null && p.pontuacao >= 70
              ? "text-positive"
              : p.pontuacao !== null && p.pontuacao >= 45
                ? "text-amber-500"
                : undefined
          }
        />
        <Campo rotulo="Liquidez média" valor={fmtVolume(p.liquidez)} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Campo rotulo="Tipo de fundo" valor={p.tipo ?? "—"} />
      <Campo rotulo="Segmento" valor={p.segmento ?? "—"} />
      <Campo rotulo="P/VPA" valor={p.pvp !== null ? p.pvp.toLocaleString("pt-BR") : "—"} />
      <Campo rotulo="VPA" valor={fmtBrl(p.vpa)} />
      <Campo rotulo="DY 12m" valor={p.dy12 !== null ? `${p.dy12.toLocaleString("pt-BR")}%` : "—"} />
      <Campo
        rotulo="Vacância"
        valor={p.vacancia !== null ? `${p.vacancia.toLocaleString("pt-BR")}%` : "—"}
      />
      <Campo
        rotulo="Cap rate"
        valor={p.capRate !== null ? `${p.capRate.toLocaleString("pt-BR")}%` : "—"}
      />
      <Campo rotulo="Patrimônio" valor={fmtGrande(p.patrimonio)} />
      <Campo rotulo="Valor de mercado" valor={fmtGrande(p.valorMercado)} />
      <Campo rotulo="Liquidez média" valor={fmtVolume(p.liquidez)} />
      <Campo rotulo="Volume do dia" valor={fmtVolume(p.volume)} />
    </div>
  );
}

export function ModalRadar({
  linha,
  aberto,
  aoFechar,
}: {
  linha: LinhaRadarBase | null;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const navegar = useNavigate();
  const ticker = aberto ? (linha?.ticker ?? null) : null;
  const detalhe = useRadarDetalhe(ticker);
  const [versaoIA, setVersaoIA] = useState(0);
  const ia = useRadarAnaliseIA(ticker, versaoIA);
  const historico = useRadarHistoricoIA(ticker);
  const [pedidoBacktest, setPedidoBacktest] = useState(false);
  const backtestQuery = useRadarBacktest(pedidoBacktest ? ticker : null, Boolean(ticker));

  // Toda ocorrência de mudança de versão pede uma análise nova, sem cache.
  useEffect(() => {
    setVersaoIA(0);
  }, [ticker]);

  const serie = detalhe.data?.serie?.pontos ?? [];
  const posicao = detalhe.data?.posicao ?? linha?.posicao ?? null;
  const fundamentos = detalhe.data?.fundamentos ?? null;
  const noticias = detalhe.data?.noticias ?? [];
  const analise = ia.data?.analise ?? null;
  const erroIa = ia.data?.erro ?? null;

  // Mudança de veredito do Gestor IA: avisa uma única vez por par (sessão).
  const mudancaVeredito = useMemo(() => {
    const h = historico.data ?? [];
    if (h.length < 2) return null;
    const atual = h[0].veredito;
    const anterior = h[1].veredito;
    if (atual === anterior) return null;
    return { de: anterior, para: atual };
  }, [historico.data]);

  useEffect(() => {
    if (!mudancaVeredito || !ticker || !linha) return;
    const chave = `${ticker}:${mudancaVeredito.de}->${mudancaVeredito.para}`;
    if (avisosVeredito.has(chave)) return;
    avisosVeredito.add(chave);
    registrarAlerta({
      ticker,
      tipo: "veredito",
      variacaoPercent: 0,
      preco: linha.preco,
      limite: 0,
      canais: ["Gestor IA"],
      titulo: "O Gestor IA mudou de ideia sobre este ativo — confira a nova análise.",
      vereditoDe: mudancaVeredito.de,
      vereditoPara: mudancaVeredito.para,
    });
    notificarPush(
      `Gestor IA: ${ticker} · de ${ROTULOS_VEREDITO[mudancaVeredito.de] ?? mudancaVeredito.de} para ${ROTULOS_VEREDITO[mudancaVeredito.para] ?? mudancaVeredito.para}`,
      "Abra o radar para conferir a nova análise.",
    );
  }, [mudancaVeredito, ticker, linha]);

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {linha?.logo ? (
              <img src={linha.logo} alt="" className="size-6 rounded object-contain" />
            ) : null}
            <span>{linha?.ticker}</span>
            <span className="text-sm font-normal text-muted-foreground">{linha?.nome}</span>
            {linha ? (
              <Badge
                className={`border-none ${CORES_SINAL[linha.sinal.tipo] ?? "bg-muted text-muted-foreground"}`}
                title={linha.sinal.motivo}
              >
                {ROTULOS_VEREDITO[linha.sinal.tipo] ?? linha.sinal.tipo}
              </Badge>
            ) : null}
          </DialogTitle>
          {linha ? (
            <div className="pt-1">
              <Button
                size="sm"
                className="h-8 gap-2"
                onClick={() => {
                  aoFechar();
                  void navegar({
                    to: "/chat",
                    search: {
                      q: `Use a ferramenta radarAtivo para ${linha.ticker} e me diga: em que zona de preço está, se é oportunidade de compra agora e como isso se encaixa na minha carteira.`,
                    },
                  });
                }}
                title="Levar este ativo para o Gestor IA"
              >
                <MessageSquare className="size-4 shrink-0" aria-hidden />
                Analisar no Gestor IA
              </Button>
            </div>
          ) : null}
        </DialogHeader>


        {linha ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Campo rotulo="Preço atual" valor={fmtPreco(linha.preco, "BRL")} />
              <Campo
                rotulo="Variação no dia"
                valor={fmtPct(linha.variacaoDia, 2)}
                destaque={corVariacao(linha.variacaoDia)}
              />
              <Campo
                rotulo="DY 12m"
                valor={linha.dy12 !== null ? `${linha.dy12.toLocaleString("pt-BR")}%` : "—"}
              />
              <Campo
                rotulo="P/VPA"
                valor={linha.pvp !== null ? linha.pvp.toLocaleString("pt-BR") : "—"}
              />
            </div>

            <section className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-semibold">
                Histórico desde o lançamento (série semanal)
              </h3>
              {detalhe.isLoading && !serie.length ? (
                <Skeleton className="h-40 w-full" />
              ) : serie.length ? (
                <GraficoSerie pontos={serie} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Série histórica ainda não disponível para este ativo.
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Campo rotulo="Menor preço histórico" valor={fmtBrl(posicao?.minimo)} />
                <Campo rotulo="Maior preço histórico" valor={fmtBrl(posicao?.maximo)} />
                <Campo
                  rotulo="Posição na história"
                  valor={
                    posicao?.percentil !== null && posicao?.percentil !== undefined
                      ? `${posicao.percentil.toFixed(0)}%`
                      : "—"
                  }
                />
                <Campo
                  rotulo="Série desde"
                  valor={posicao?.inicioSerie ?? detalhe.data?.serie?.inicioSerie ?? "—"}
                />
              </div>
              {posicao ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Zona {ROTULOS_ZONA[linha.sinal.zona]} · Estratégia do radar: {linha.sinal.motivo}
                </p>
              ) : null}
            </section>

            <section className="rounded-lg border p-4">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <FlaskConical className="size-4 text-primary" aria-hidden />
                  Backtest Rápido: Radar vs BOVA11
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPedidoBacktest(true)}
                  disabled={pedidoBacktest || backtestQuery.isFetching}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  {backtestQuery.isFetching ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FlaskConical className="size-3.5" />
                  )}
                  Executar Simulação
                </Button>
              </div>

              {!pedidoBacktest ? (
                <div className="rounded-md bg-muted/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Compare a performance de comprar nas mínimas de 52 semanas deste ativo contra o índice Bovespa.
                  </p>
                </div>
              ) : backtestQuery.isFetching ? (
                <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Rodando simulação histórica...
                </div>
              ) : backtestQuery.data ? (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">Retorno Radar</p>
                      <p className={`text-sm font-bold ${(backtestQuery.data.resultado?.retornoTotalPct ?? 0) >= 0 ? "text-positive" : "text-negative"}`}>
                        {fmtPct(backtestQuery.data.resultado?.retornoTotalPct, 1)}
                      </p>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">Retorno BOVA11</p>
                      <p className={`text-sm font-bold ${(backtestQuery.data.ibov?.buyHoldPct ?? 0) >= 0 ? "text-positive" : "text-negative"}`}>
                        {fmtPct(backtestQuery.data.ibov?.buyHoldPct, 1)}
                      </p>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">Taxa Acerto</p>
                      <p className="text-sm font-bold text-primary">
                        {fmtPct(backtestQuery.data.resultado?.taxaAcertoPct, 0)}
                      </p>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">Negócios</p>
                      <p className="text-sm font-bold">{backtestQuery.data.resultado?.negocios ?? 0}</p>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                    Simulação: Compra em {ticker} quando ≤2% acima da mínima de 52s. Alvo: +20% ou Stop: -12%. 
                    Período: ~{backtestQuery.data.resultado?.anos.toFixed(1) ?? "—"} anos. Benchmark: Buy & Hold BOVA11.
                  </p>
                </div>
              ) : backtestQuery.isError ? (
                <div className="rounded-md bg-destructive/5 p-4 text-center text-xs text-destructive">
                  Não foi possível processar o backtest para este ativo.
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-semibold">Janela de 52 semanas e risco</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Campo rotulo="Mínima 52 semanas" valor={fmtBrl(posicao?.minimo52s)} />
                <Campo rotulo="Máxima 52 semanas" valor={fmtBrl(posicao?.maximo52s)} />
                <Campo
                  rotulo="Distância da mín. 52s"
                  valor={
                    posicao?.distMinima52sPct !== null && posicao?.distMinima52sPct !== undefined
                      ? `−${posicao.distMinima52sPct.toFixed(1)}%`
                      : "—"
                  }
                  destaque={
                    posicao?.distMinima52sPct !== null &&
                    posicao?.distMinima52sPct !== undefined &&
                    posicao.distMinima52sPct <= 5
                      ? "text-positive"
                      : undefined
                  }
                />
                <Campo
                  rotulo="Drawdown máximo"
                  valor={
                    posicao?.drawdownMaximoPct !== null && posicao?.drawdownMaximoPct !== undefined
                      ? `${posicao.drawdownMaximoPct.toFixed(1)}%`
                      : "—"
                  }
                  destaque="text-negative"
                />
                <Campo
                  rotulo="Volatilidade anual"
                  valor={
                    posicao?.volatilidadeAnualPct !== null &&
                    posicao?.volatilidadeAnualPct !== undefined
                      ? `${posicao.volatilidadeAnualPct.toFixed(1)}%`
                      : "—"
                  }
                />
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Ficha fundamentalista</h3>
              {detalhe.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : fundamentos ? (
                <FichaFundamentos p={fundamentos} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Fundamentos indisponíveis para este ativo agora.
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Notícias relacionadas</h3>
              {noticias.length ? (
                <ul className="space-y-2">
                  {noticias.map((n) => (
                    <li key={n.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">
                        {n.urgente ? (
                          <Badge className="mr-1 border-none bg-red-600/10 text-red-600">
                            urgente
                          </Badge>
                        ) : null}
                        {n.titulo}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.fonte} · {new Date(n.publicadoEm).toLocaleDateString("pt-BR")}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma notícia específica encontrada no feed recente.
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Gestor IA</h3>
              {analise ? (
                <div className="space-y-3 rounded-lg border p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={`border-none ${CORES_SINAL[analise.veredito] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {ROTULOS_VEREDITO[analise.veredito] ?? analise.veredito}
                    </Badge>
                    {analise.conviccao ? (
                      <Badge
                        className={`border-none ${CORES_CONVICCAO[analise.conviccao] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {ROTULOS_CONVICCAO[analise.conviccao] ?? analise.conviccao}
                      </Badge>
                    ) : null}
                    {analise.horizonte ? (
                      <Badge variant="outline">
                        {ROTULOS_HORIZONTE[analise.horizonte] ?? analise.horizonte}
                      </Badge>
                    ) : null}
                  </div>
                  {analise.tese ? <p>{analise.tese}</p> : null}
                  {analise.cenarioOtimista || analise.cenarioBase || analise.cenarioPessimista ? (
                    <div className="space-y-1.5 rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cenários
                      </p>
                      {analise.cenarioOtimista ? (
                        <p>
                          <strong className="text-positive">Otimista:</strong>{" "}
                          {analise.cenarioOtimista}
                        </p>
                      ) : null}
                      {analise.cenarioBase ? (
                        <p>
                          <strong>Base:</strong> {analise.cenarioBase}
                        </p>
                      ) : null}
                      {analise.cenarioPessimista ? (
                        <p>
                          <strong className="text-negative">Pessimista:</strong>{" "}
                          {analise.cenarioPessimista}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {analise.riscos ? (
                    <p className="text-muted-foreground">
                      <strong>Riscos:</strong> {analise.riscos}
                    </p>
                  ) : null}
                  {analise.gatilhos ? (
                    <p className="text-muted-foreground">
                      <strong>Gatilhos:</strong> {analise.gatilhos}
                    </p>
                  ) : null}
                  {analise.monitorar ? (
                    <p className="text-muted-foreground">
                      <strong>Monitorar:</strong> {analise.monitorar}
                    </p>
                  ) : null}
                  {analise.fatoresExternos?.length ? (
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground">
                        Fatos externos considerados:
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                        {analise.fatoresExternos.map((f, i) => (
                          <li key={`${f}-${i}`}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Análise gerada por IA em{" "}
                    {new Date(analise.geradaEm).toLocaleDateString("pt-BR")}
                    {" — não substitui uma recomendação formal."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setVersaoIA((v) => v + 1)}
                  >
                    <Sparkles className="size-4" />
                    Regenerar análise
                  </Button>
                </div>
              ) : ia.isFetching ? (
                <div className="space-y-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Gestor IA consultando histórico, ficha e noticiário em tempo real…
                  </p>
                </div>
              ) : ia.isError ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Não foi possível gerar a análise agora.
                  </p>
                  <Button
                    variant="outline"
                    className="w-fit gap-2"
                    onClick={() => void ia.refetch()}
                  >
                    <Sparkles className="size-4" />
                    Tentar de novo
                  </Button>
                </div>
              ) : erroIa ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-destructive">{erroIa}</p>
                  <Button
                    variant="outline"
                    className="w-fit gap-2"
                    onClick={() => void ia.refetch()}
                  >
                    <Sparkles className="size-4" />
                    Tentar de novo
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Peça ao Gestor IA um veredito com base no histórico, na ficha e no noticiário
                    (com busca automática em tempo real).
                  </p>
                  <Button
                    variant="outline"
                    className="w-fit gap-2"
                    onClick={() => setVersaoIA((v) => v + 1)}
                  >
                    <Sparkles className="size-4" />
                    Gerar análise
                  </Button>
                </div>
              )}
            </section>

            {(historico.data ?? []).length > 0 ? (
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-muted-foreground" />
                  Histórico do Gestor IA
                </h3>
                <ul className="space-y-2">
                  {historico.data!.map((a, i) => {
                    const mudou = i > 0 && historico.data![0].veredito !== a.veredito;
                    return (
                      <li
                        key={`${a.geradaEm}-${i}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.geradaEm).toLocaleDateString("pt-BR")}
                          </span>
                          <Badge
                            className={`border-none ${CORES_SINAL[a.veredito] ?? "bg-muted text-muted-foreground"}`}
                          >
                            {ROTULOS_VEREDITO[a.veredito] ?? a.veredito}
                          </Badge>
                        </div>
                        {mudou ? (
                          <span className="text-xs font-medium text-amber-600">
                            a IA mudou de ideia desde esta data
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <FlaskConical className="size-4 text-muted-foreground" />
                Backtest do sinal do radar
              </h3>
              {backtestQuery.data ? (
                backtestQuery.data.resultado ? (
                  <div className="space-y-3 rounded-lg border p-4 text-sm">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Campo
                        rotulo="Negócios simulados"
                        valor={String(backtestQuery.data.resultado.negocios)}
                      />
                      <Campo
                        rotulo="Taxa de acerto"
                        valor={fmtPct(backtestQuery.data.resultado.taxaAcertoPct, 0)}
                      />
                      <Campo
                        rotulo="Retorno médio por negócio"
                        valor={fmtPct(backtestQuery.data.resultado.retornoMedioPct)}
                      />
                      <Campo
                        rotulo="Sinal · retorno anual"
                        valor={fmtPct(backtestQuery.data.resultado.retornoAnualPct)}
                      />
                      <Campo
                        rotulo="Buy & hold do ativo (período)"
                        valor={fmtPct(backtestQuery.data.resultado.buyHoldPct, 0)}
                      />
                      <Campo
                        rotulo="Buy & hold BOVA11 (período)"
                        valor={fmtPct(backtestQuery.data.ibov?.buyHoldPct, 0)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Simulação da regra do radar na série semanal
                      {backtestQuery.data.inicioSerie
                        ? ` de ${new Date(backtestQuery.data.inicioSerie).toLocaleDateString("pt-BR")}`
                        : ""}
                      {backtestQuery.data.fimSerie
                        ? ` até ${new Date(backtestQuery.data.fimSerie).toLocaleDateString("pt-BR")}`
                        : ""}
                      : compra quando o preço encosta na mínima de 52 semanas (tolerância de 2%),
                      venda com +20% de lucro ou -12% de proteção. Educacional, não é recomendação.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Série semanal insuficiente para simular o sinal deste ativo.
                  </p>
                )
              ) : backtestQuery.isFetching ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : backtestQuery.isError ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Não foi possível simular o backtest agora.
                  </p>
                  <Button
                    variant="outline"
                    className="w-fit gap-2"
                    onClick={() => setPedidoBacktest(true)}
                  >
                    <FlaskConical className="size-4" />
                    Tentar de novo
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Simule como o sinal do radar teria se saído nas últimas semanas deste ativo,
                    comparado ao buy & hold e ao Ibovespa (BOVA11).
                  </p>
                  <Button
                    variant="outline"
                    className="w-fit gap-2"
                    onClick={() => setPedidoBacktest(true)}
                  >
                    <FlaskConical className="size-4" />
                    Rodar backtest
                  </Button>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
