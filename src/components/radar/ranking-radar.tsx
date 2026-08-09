/**
 * Ranking de ativos do Radar — terminal de triagem da B3.
 *
 * Ordena o universo filtrado pelo indicador escolhido (DY 12m, valorização
 * no dia, percentil histórico, P/VPA ou distância da mínima de 52 semanas)
 * e apresenta as posições numeradas em uma tabela profissional:
 * coluna dinâmica do critério com barra de força relativa, histórico com
 * barra de percentil e zona, score de oportunidade e veredito do sinal.
 * No mobile a tabela vira cartões de linha única, sem perder informação.
 */

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtPercent, fmtPreco } from "@/components/cotacoes/formatos";
import {
  CORES_SCORE,
  CORES_SINAL,
  ROTULOS_ZONA,
  rotuloScore,
  type SinalRadar,
} from "@/lib/radar-base";
import type { LinhaRadarBase } from "@/lib/radar.server";

type Critério = "dy" | "variacao" | "percentil" | "pvp" | "minima52";

const CRITERIOS: { valor: Critério; rotulo: string; cabecalho: string; ajuda: string }[] = [
  {
    valor: "dy",
    rotulo: "Maior DY 12m",
    cabecalho: "DY 12m",
    ajuda: "Rendimento por dividendos dos últimos 12 meses",
  },
  {
    valor: "variacao",
    rotulo: "Maior alta no dia",
    cabecalho: "Variação",
    ajuda: "Valorização percentual no pregão atual",
  },
  {
    valor: "percentil",
    rotulo: "Menor percentil histórico",
    cabecalho: "Percentil",
    ajuda: "0% = mínima da própria história · 100% = máxima",
  },
  {
    valor: "pvp",
    rotulo: "Menor P/VPA",
    cabecalho: "P/VPA",
    ajuda: "Preço sobre valor patrimonial — quanto menor, mais barato em relação aos fundamentos",
  },
  {
    valor: "minima52",
    rotulo: "Mais perto da mín. 52s",
    cabecalho: "Mín. 52s",
    ajuda: "Distância percentual até a mínima de 52 semanas",
  },
];

const ROTULOS_SINAL: Record<SinalRadar["tipo"], string> = {
  comprar: "Comprar",
  manter: "Manter",
  vender: "Vender",
  observar: "Observar",
  "sem-dados": "Sem dados",
};

const ROTULOS_SCORE: Record<ReturnType<typeof rotuloScore>, string> = {
  excelente: "Oportunidade excelente",
  boa: "Oportunidade boa",
  media: "Oportunidade média",
  fraca: "Oportunidade fraca",
};

/** Chip de posição no pódio: 1º dourado, 2º prata, 3º bronze. */
const PODIO = [
  "border-amber-500/40 bg-amber-500/10 text-amber-600",
  "border-slate-400/40 bg-slate-400/10 text-slate-400",
  "border-orange-500/40 bg-orange-500/10 text-orange-600",
];

function valorCritério(l: LinhaRadarBase, criterio: Critério): number | null {
  switch (criterio) {
    case "dy":
      return l.dy12;
    case "variacao":
      return l.variacaoDia;
    case "percentil":
      return l.posicao?.percentil ?? null;
    case "pvp":
      return l.pvp;
    case "minima52":
      return l.posicao?.distMinima52sPct ?? null;
  }
}

function formatarValor(v: number | null, criterio: Critério): string {
  if (v === null || !Number.isFinite(v)) return "—";
  switch (criterio) {
    case "dy":
      return `${v.toLocaleString("pt-BR")}%`;
    case "variacao":
      return fmtPercent(v);
    case "percentil":
      return `${v.toFixed(0)}%`;
    case "pvp":
      return v.toLocaleString("pt-BR");
    case "minima52":
      return `−${v.toFixed(1).replace(".", ",")}%`;
  }
}

function corValor(v: number | null, criterio: Critério): string {
  if (v === null || !Number.isFinite(v)) return "text-muted-foreground";
  switch (criterio) {
    case "variacao":
      return v > 0 ? "text-positive" : v < 0 ? "text-negative" : "text-muted-foreground";
    case "percentil":
      return v <= 25 ? "text-emerald-600" : v <= 45 ? "text-sky-600" : "text-muted-foreground";
    case "minima52":
      return v <= 5 ? "text-emerald-600" : v <= 20 ? "text-sky-600" : "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

function corBarra(v: number | null, criterio: Critério): string {
  if (v === null || !Number.isFinite(v)) return "bg-muted";
  switch (criterio) {
    case "variacao":
      return v >= 0 ? "bg-emerald-500" : "bg-red-500";
    case "percentil":
      return v <= 25 ? "bg-emerald-500" : v <= 45 ? "bg-sky-500" : "bg-amber-500";
    case "minima52":
      return v <= 5 ? "bg-emerald-500" : v <= 20 ? "bg-sky-500" : "bg-slate-400";
    default:
      return "bg-primary";
  }
}

/** Barra do critério: escala fixa (percentil) ou força relativa ao campo. */
function larguraBarra(
  v: number | null,
  criterio: Critério,
  maximo: number | null,
  minimo: number | null,
): number {
  if (v === null || !Number.isFinite(v)) return 0;
  if (criterio === "percentil") return Math.max(2, Math.min(100, v));
  if (criterio === "dy") return Math.max(2, Math.min(100, (v / 12) * 100));
  if (criterio === "variacao") {
    if (maximo === null || minimo === null || maximo === minimo) return v >= 0 ? 70 : 30;
    return Math.max(2, Math.min(100, ((v - minimo) / (maximo - minimo)) * 100));
  }
  if (maximo === null || maximo <= 0) return Math.max(2, Math.min(100, v));
  return Math.max(2, Math.min(100, (1 - v / maximo) * 100));
}

function ChipPosicao({ posicao }: { posicao: number }) {
  if (posicao <= 3) {
    return (
      <span
        className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${PODIO[posicao - 1]}`}
      >
        {posicao}
      </span>
    );
  }
  return (
    <span className="inline-flex w-6 shrink-0 justify-center text-sm font-semibold tabular-nums text-muted-foreground">
      {posicao}
    </span>
  );
}

function BarraHistorico({
  percentil,
  zona,
}: {
  percentil: number | null;
  zona: SinalRadar["zona"];
}) {
  if (percentil === null)
    return <span className="text-xs text-muted-foreground">Sem histórico</span>;
  const cor =
    percentil <= 25
      ? "bg-emerald-500"
      : percentil <= 45
        ? "bg-sky-500"
        : percentil <= 70
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${percentil}%` }} />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {percentil.toFixed(0)}%
      </span>
      <span className="hidden min-w-0 truncate text-xs text-muted-foreground xl:inline">
        {ROTULOS_ZONA[zona]}
      </span>
    </div>
  );
}

function SinalBadge({ sinal }: { sinal: SinalRadar }) {
  return (
    <Badge
      className={`whitespace-nowrap border-none ${CORES_SINAL[sinal.tipo]}`}
      title={sinal.motivo}
    >
      {ROTULOS_SINAL[sinal.tipo]}
      {sinal.urgente ? " ⚠" : ""}
    </Badge>
  );
}

function LogoAtivo({ l }: { l: LinhaRadarBase }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/60">
      {l.logo ? (
        <img src={l.logo} alt="" loading="lazy" className="size-full object-contain" />
      ) : (
        <span className="px-1 text-[0.6rem] font-bold tracking-wide text-muted-foreground">
          {l.ticker.slice(0, 4)}
        </span>
      )}
    </span>
  );
}

export function RankingRadar({
  linhas,
  carteira,
  aoSelecionar,
}: {
  linhas: (LinhaRadarBase & { sinal: SinalRadar })[];
  /** Ticker (maiúsculo) → quantidade na carteira do usuário. */
  carteira?: ReadonlyMap<string, number>;
  aoSelecionar: (linha: LinhaRadarBase) => void;
}) {
  const [criterio, setCriterio] = useState<Critério>("dy");
  const meta = CRITERIOS.find((c) => c.valor === criterio)!;

  const ranking = useMemo(() => {
    const semDados = linhas.filter((l) => valorCritério(l, criterio) === null);
    const comDados = linhas
      .filter((l) => valorCritério(l, criterio) !== null)
      .sort((a, b) => {
        const va = valorCritério(a, criterio) as number;
        const vb = valorCritério(b, criterio) as number;
        switch (criterio) {
          case "dy":
          case "variacao":
            return vb - va;
          case "percentil":
          case "pvp":
          case "minima52":
            return va - vb;
        }
      });
    return [...comDados, ...semDados];
  }, [linhas, criterio]);

  const extremos = useMemo(() => {
    let maximo: number | null = null;
    let minimo: number | null = null;
    for (const l of ranking) {
      const v = valorCritério(l, criterio);
      if (v === null || !Number.isFinite(v)) continue;
      if (maximo === null || v > maximo) maximo = v;
      if (minimo === null || v < minimo) minimo = v;
    }
    return { maximo, minimo };
  }, [ranking, criterio]);

  const estatisticas = useMemo(() => {
    const comHistorico = linhas.filter((l) => l.posicao).length;
    const tickersDoRanking = new Set(linhas.map((l) => l.ticker.toUpperCase()));
    const naCarteira = [...(carteira?.keys() ?? [])].filter((t) =>
      tickersDoRanking.has(String(t).toUpperCase()),
    ).length;
    const scoress = linhas
      .map((l) => l.score)
      .filter((s): s is number => s !== null && Number.isFinite(s));
    const scoreMedio = scoress.length
      ? scoress.reduce((soma, s) => soma + s, 0) / scoress.length
      : null;
    return { comHistorico, naCarteira, scoreMedio };
  }, [linhas, carteira]);

  if (!linhas.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Nenhum ativo encontrado com esses filtros.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho do terminal: resumo + escolha do critério */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-xs text-muted-foreground">
            Posição na própria história e indicadores do{" "}
            <span className="font-medium text-foreground">
              universo filtrado ({linhas.length.toLocaleString("pt-BR")})
            </span>
            .
          </p>
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Ativos com histórico</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {estatisticas.comHistorico}
              </dd>
              <dd>com histórico</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Na sua carteira</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {estatisticas.naCarteira}
              </dd>
              <dd>na carteira</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Score médio</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {estatisticas.scoreMedio !== null ? estatisticas.scoreMedio.toFixed(0) : "—"}
              </dd>
              <dd>de score médio</dd>
            </div>
          </dl>
        </div>
        <Select value={criterio} onValueChange={(v) => setCriterio(v as Critério)}>
          <SelectTrigger className="h-9 w-full min-w-0 sm:w-60" aria-label="Critério do ranking">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {CRITERIOS.map((c) => (
              <SelectItem key={c.valor} value={c.valor}>
                {c.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela profissional (desktop e tablet) */}
      <div className="hidden w-full max-w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm md:block">
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-[960px] table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="w-[4%] min-w-[44px] pl-4 text-center"
                  aria-label="Posição no ranking"
                >
                  #
                </TableHead>
                <TableHead className="w-[18%] min-w-[170px]">Ativo</TableHead>
                <TableHead
                  className="w-[10%] whitespace-nowrap text-right"
                  title="Último preço e variação do dia"
                >
                  Preço
                </TableHead>
                <TableHead className="w-[12%] whitespace-nowrap text-right" title={meta.ajuda}>
                  {meta.cabecalho}
                  <span className="ml-1 align-middle text-[0.65rem] font-medium text-muted-foreground/60">
                    ▾
                  </span>
                </TableHead>
                <TableHead className="w-[15%] min-w-[150px]">Histórico</TableHead>
                <TableHead className="hidden w-[9%] whitespace-nowrap text-center xl:table-cell">
                  Mín. 52s
                </TableHead>
                <TableHead className="w-[9%] min-w-[80px] whitespace-nowrap text-center">
                  Score
                </TableHead>
                <TableHead className="w-[12%] min-w-[110px] pr-4 text-right">Sinal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((l, i) => {
                const v = valorCritério(l, criterio);
                const quantidade = carteira?.get(l.ticker.toUpperCase()) ?? 0;
                const rotuloScoreAtivo = l.score !== null ? rotuloScore(l.score) : null;
                return (
                  <TableRow
                    key={l.ticker}
                    onClick={() => aoSelecionar(l)}
                    className="group cursor-pointer"
                  >
                    <TableCell className="pl-4 text-center">
                      <ChipPosicao posicao={i + 1} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <LogoAtivo l={l} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold">{l.ticker}</p>
                            {quantidade > 0 ? (
                              <span
                                className="hidden shrink-0 rounded-full border border-emerald-600/30 bg-emerald-600/10 px-1.5 py-px text-[0.6rem] font-bold text-emerald-600 xl:inline"
                                title={`Na sua carteira · ${quantidade} cotas`}
                              >
                                {quantidade} na carteira
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {l.nome}
                            {l.setor ? ` · ${l.setor}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="block text-sm tabular-nums">
                        {l.preco !== null ? fmtPreco(l.preco, "BRL") : "—"}
                      </span>
                      <span
                        className={`block text-xs tabular-nums ${corValor(l.variacaoDia, "variacao")}`}
                      >
                        {fmtPercent(l.variacaoDia)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`block text-sm font-bold tabular-nums ${corValor(v, criterio)}`}
                      >
                        {formatarValor(v, criterio)}
                      </span>
                      <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${corBarra(v, criterio)}`}
                          style={{
                            width: `${larguraBarra(v, criterio, extremos.maximo, extremos.minimo)}%`,
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <BarraHistorico
                        percentil={l.posicao?.percentil ?? null}
                        zona={l.sinal.zona}
                      />
                    </TableCell>
                    <TableCell className="hidden text-center xl:table-cell">
                      <span
                        className={`text-xs tabular-nums ${
                          l.posicao?.distMinima52sPct !== null &&
                          l.posicao?.distMinima52sPct !== undefined
                            ? l.posicao.distMinima52sPct <= 5
                              ? "text-emerald-600"
                              : l.posicao.distMinima52sPct <= 20
                                ? "text-sky-600"
                                : "text-muted-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {l.posicao?.distMinima52sPct !== null &&
                        l.posicao?.distMinima52sPct !== undefined
                          ? `−${l.posicao.distMinima52sPct.toFixed(1).replace(".", ",")}%`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {rotuloScoreAtivo ? (
                        <Badge
                          className={`whitespace-nowrap border-none ${CORES_SCORE[rotuloScoreAtivo]}`}
                          title={ROTULOS_SCORE[rotuloScoreAtivo]}
                        >
                          {l.score}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <SinalBadge sinal={l.sinal} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cartões de linha única (mobile) */}
      <ol className="space-y-2 md:hidden">
        {ranking.map((l, i) => {
          const v = valorCritério(l, criterio);
          const quantidade = carteira?.get(l.ticker.toUpperCase()) ?? 0;
          return (
            <li key={l.ticker}>
              <button
                type="button"
                onClick={() => aoSelecionar(l)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left shadow-sm transition-colors active:scale-[0.99] hover:bg-muted/50"
              >
                <span className="w-6 shrink-0 text-center">
                  <ChipPosicao posicao={i + 1} />
                </span>
                <LogoAtivo l={l} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {l.ticker}
                    {quantidade > 0 ? (
                      <span className="ml-1.5 text-[0.6rem] font-bold text-emerald-600">
                        · {quantidade} na carteira
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="block min-w-0 truncate text-xs text-muted-foreground">
                      {l.nome}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {fmtPreco(l.preco, "BRL")}
                    </span>
                    <span
                      className={`shrink-0 text-xs tabular-nums ${corValor(l.variacaoDia, "variacao")}`}
                    >
                      {fmtPercent(l.variacaoDia)}
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span
                      className={`text-sm font-bold tabular-nums sm:text-base ${corValor(v, criterio)}`}
                    >
                      {formatarValor(v, criterio)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
                      <span className={l.posicao ? "text-foreground" : ""}>
                        {l.posicao?.percentil !== null && l.posicao?.percentil !== undefined
                          ? ROTULOS_ZONA[l.sinal.zona]
                          : "Sem histórico"}
                      </span>
                    </span>
                  </span>
                </span>
                <SinalBadge sinal={l.sinal} />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
