/**
 * Ficha do ativo no Radar — gráfico da série completa desde o início,
 * posição histórica, janela de 52 semanas, ficha fundamentalista, notícias
 * relacionadas e análise do Técnico IA (com fatos externos em tempo real).
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { fmtPreco } from "@/components/cotacoes/formatos";
import { CORES_SINAL, ROTULOS_ZONA } from "@/lib/radar-base";
import { useRadarAnaliseIA, useRadarDetalhe } from "@/lib/radar";
import type { DetalheFundamentos } from "@/lib/radar.functions";
import type { LinhaRadarBase } from "@/lib/radar.server";

const ROTULOS_VEREDITO: Record<string, string> = {
  comprar: "Comprar",
  manter: "Manter",
  vender: "Vender",
  observar: "Observar",
};

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

function GraficoSerie({ pontos }: { pontos: { d: string; f: number }[] }) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pontos} margin={{ left: 4, right: 8, top: 8 }}>
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
            formatter={(v: number) => [fmtBrl(v), "Fechamento"]}
          />
          <Area
            type="monotone"
            dataKey="f"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            fill="url(#grad-radar)"
            name="Fechamento"
          />
        </AreaChart>
      </ResponsiveContainer>
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
  const ticker = aberto ? (linha?.ticker ?? null) : null;
  const detalhe = useRadarDetalhe(ticker);
  const ia = useRadarAnaliseIA(ticker);

  const serie = detalhe.data?.serie?.pontos ?? [];
  const posicao = detalhe.data?.posicao ?? linha?.posicao ?? null;
  const fundamentos = detalhe.data?.fundamentos ?? null;
  const noticias = detalhe.data?.noticias ?? [];

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
              <h3 className="mb-2 text-sm font-semibold">Técnico IA</h3>
              {ia.data ? (
                <div className="space-y-2 rounded-lg border p-4 text-sm">
                  <p>
                    <Badge
                      className={`border-none ${CORES_SINAL[ia.data.veredito] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {ROTULOS_VEREDITO[ia.data.veredito] ?? ia.data.veredito}
                    </Badge>
                  </p>
                  {ia.data.tese ? <p>{ia.data.tese}</p> : null}
                  {ia.data.riscos ? (
                    <p className="text-muted-foreground">
                      <strong>Riscos:</strong> {ia.data.riscos}
                    </p>
                  ) : null}
                  {ia.data.gatilhos ? (
                    <p className="text-muted-foreground">
                      <strong>Gatilhos:</strong> {ia.data.gatilhos}
                    </p>
                  ) : null}
                  {ia.data.fatoresExternos?.length ? (
                    <div className="space-y-1">
                      <p className="font-medium text-muted-foreground">
                        Fatos externos considerados:
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                        {ia.data.fatoresExternos.map((f, i) => (
                          <li key={`${f}-${i}`}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Análise gerada por IA em{" "}
                    {new Date(ia.data.geradaEm).toLocaleDateString("pt-BR")}
                    {" — não substitui uma recomendação formal."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => ia.refetch()}
                  >
                    <Sparkles className="size-4" />
                    Regenerar análise
                  </Button>
                </div>
              ) : ia.isFetching ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : ia.isError ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Não foi possível gerar a análise agora.
                  </p>
                  <Button variant="outline" className="w-fit gap-2" onClick={() => ia.refetch()}>
                    <Sparkles className="size-4" />
                    Tentar de novo
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    Peça ao Técnico IA um veredito com base no histórico, na ficha e no noticiário
                    (com busca automática em tempo real).
                  </p>
                  <Button variant="outline" className="w-fit gap-2" onClick={() => ia.refetch()}>
                    <Sparkles className="size-4" />
                    Gerar análise
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
