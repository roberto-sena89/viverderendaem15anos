/**
 * Ranking de ativos — terminal de triagem do Radar no padrão de gestão de
 * fundo profissional: painel de indicadores do universo, navegação por
 * sinais (livro de ordens), pódio do critério escolhido, tabela densa com
 * posição na própria história, faixa de 52 semanas, risco, score e veredito.
 * No mobile, a tabela vira cartões em camadas, sem perder informação.
 */

import { useMemo, useState, type ReactNode } from "react";
import { PaginacaoAtivos } from "@/components/radar/paginacao-ativos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  type TipoSinal,
} from "@/lib/radar-base";
import {
  CORES_RATING,
  avaliarParaGestor,
  type RatingGestor,
  type ScoreGestor,
} from "@/lib/score-gestor";
import type { LinhaRadarBase } from "@/lib/radar.server";
import {
  Activity,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CalendarDays,
  Gauge,
  Layers,
  Radar,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";

type Critério = "dy" | "variacao" | "percentil" | "pvp" | "minima52" | "score" | "gestor";
type Direcao = "desc" | "asc";
type AbaSinal = "todos" | TipoSinal;

const CRITERIOS: {
  valor: Critério;
  rotulo: string;
  cabecalho: string;
  ajuda: string;
  sentido: string;
}[] = [
  {
    valor: "gestor",
    rotulo: "Melhor rating do gestor",
    cabecalho: "Rating gestor",
    ajuda:
      "Nota 0–100: fundamentos (com ajuste setorial), oportunidade, dividendos, prêmio do DY sobre a Selic, liquidez e endividamento",
    sentido: "maior",
  },
  {
    valor: "score",
    rotulo: "Melhor score de oportunidade",
    cabecalho: "Score",
    ajuda: "Score 0–100: 50% posição na história, 30% DY 12m, 20% risco",
    sentido: "maior",
  },
  {
    valor: "dy",
    rotulo: "Maior DY 12m",
    cabecalho: "DY 12m",
    ajuda: "Rendimento por dividendos dos últimos 12 meses",
    sentido: "maior",
  },
  {
    valor: "percentil",
    rotulo: "Menor percentil histórico",
    cabecalho: "Percentil",
    ajuda: "0% = mínima da própria história · 100% = máxima",
    sentido: "menor",
  },
  {
    valor: "variacao",
    rotulo: "Maior alta no dia",
    cabecalho: "Variação",
    ajuda: "Valorização percentual no pregão atual",
    sentido: "maior",
  },
  {
    valor: "pvp",
    rotulo: "Menor P/VPA",
    cabecalho: "P/VPA",
    ajuda: "Preço sobre valor patrimonial — quanto menor, mais barato em relação aos fundamentos",
    sentido: "menor",
  },
  {
    valor: "minima52",
    rotulo: "Mais perto da mín. 52s",
    cabecalho: "Mín. 52s",
    ajuda: "Distância percentual até a mínima de 52 semanas",
    sentido: "menor",
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

const ABAS_SINAL: { valor: AbaSinal; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "comprar", rotulo: "Comprar" },
  { valor: "observar", rotulo: "Observar" },
  { valor: "manter", rotulo: "Manter" },
  { valor: "vender", rotulo: "Vender" },
  { valor: "sem-dados", rotulo: "Sem dados" },
];

const COR_DOT: Record<AbaSinal, string> = {
  todos: "bg-primary",
  comprar: "bg-emerald-500",
  observar: "bg-sky-500",
  manter: "bg-amber-500",
  vender: "bg-red-500",
  "sem-dados": "bg-slate-400",
};

/** Chip de posição no pódio: 1º dourado, 2º prata, 3º bronze. */
const PODIO = [
  "border-amber-500/40 bg-amber-500/10 text-amber-600",
  "border-slate-400/40 bg-slate-400/10 text-slate-400",
  "border-orange-500/40 bg-orange-500/10 text-orange-600",
];

/** Anel do cartão de pódio (desktop). */
const PODIO_ANEL = ["ring-amber-500/30", "ring-slate-400/25", "ring-orange-500/25"];

/** Cor da coluna de risco: queda profunda → vermelho. */
function corDrawdown(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "text-muted-foreground";
  return v <= -30 ? "text-negative" : "text-muted-foreground";
}

function corScoreBarra(rotulo: ReturnType<typeof rotuloScore>): string {
  switch (rotulo) {
    case "excelente":
      return "bg-emerald-500";
    case "boa":
      return "bg-sky-500";
    case "media":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

/** Cor da zona histórica (faixa lateral da linha e barras). */
function corZona(percentil: number | null): string {
  if (percentil === null) return "bg-slate-400/60";
  if (percentil <= 25) return "bg-emerald-500";
  if (percentil <= 45) return "bg-sky-500";
  if (percentil <= 70) return "bg-amber-500";
  return "bg-red-500";
}

/** Avalia a linha do radar na ótica do gestor (rating A/B/C/D + nota). */
function gestorDeLinha(l: LinhaRadarBase): ScoreGestor {
  return avaliarParaGestor({
    ticker: l.ticker,
    fundamentos: l.fundamentos,
    oportunidade: l.score,
    sinal: l.sinal.tipo,
    dy12: l.dy12,
    pl: l.pl,
    payout: null,
    liquidez: l.liquidez,
    dividaPatrimonio: l.dividaPatrimonio,
    margemLiquida: l.margemLiquida,
    regime: null,
    selic: l.selic,
    setor: l.setor,
    consistenciaDividendos: l.consistenciaDividendos,
    percentilDistribucional: l.posicao?.percentilDistribucional ?? null,
    volatilidadeAnualPct: l.posicao?.volatilidadeAnualPct ?? null,
    percentilPlReal: l.percentilPlReal ?? null,
    percentilEvEbitReal: l.percentilEvEbitReal ?? null,
    evEbitReal: l.evEbitReal ?? null,
    dividaLiquidaReal: l.dividaLiquidaReal ?? null,
  });
}

function valorCritério(l: LinhaRadarBase, criterio: Critério, gestor?: ScoreGestor): number | null {
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
    case "score":
      return l.score;
    case "gestor":
      return gestor?.nota ?? null;
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
    case "score":
      return `${v} pts`;
    case "gestor":
      return `${v} pts`;
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
    case "score":
      return v >= 70 ? "text-emerald-600" : v >= 50 ? "text-sky-600" : "text-muted-foreground";
    case "gestor":
      return v >= 75
        ? "text-emerald-600"
        : v >= 60
          ? "text-sky-600"
          : v >= 45
            ? "text-amber-600"
            : "text-muted-foreground";
    default:
      return "text-foreground";
  }
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

/** Posição do preço na própria história: barra + valor + zona. */
function BarraHistorico({
  percentil,
  zona,
  inicioSerie,
  compacto,
}: {
  percentil: number | null;
  zona: SinalRadar["zona"];
  inicioSerie?: string | null;
  compacto?: boolean;
}) {
  if (percentil === null)
    return <span className="text-xs text-muted-foreground">Sem histórico</span>;
  const larguraBarraHistorico = compacto ? "w-12" : "w-16 xl:w-20";
  return (
    <div className={`flex flex-col items-center gap-1 ${compacto ? "flex-1" : ""}`}>
      <div className="flex items-center gap-2">
        <div
          className={`h-1.5 shrink-0 overflow-hidden rounded-full bg-muted ${larguraBarraHistorico}`}
          title={
            inicioSerie
              ? `Posição na própria história desde ${new Date(inicioSerie).toLocaleDateString("pt-BR")}`
              : undefined
          }
        >
          <div
            className={`h-full rounded-full ${corZona(percentil)}`}
            style={{ width: `${percentil}%` }}
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {percentil.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="shrink-0 truncate text-[10px] font-medium text-muted-foreground/80 uppercase tracking-tight">
          {ROTULOS_ZONA[zona]}
        </span>
      </div>
    </div>
  );
}

/** Faixa de 52 semanas com a cotação atual marcada na régua. */
function Faixa52sCelula({ l }: { l: LinhaRadarBase }) {
  const minimo = l.posicao?.minimo52s ?? null;
  const maximo = l.posicao?.maximo52s ?? null;
  const preco = l.preco;
  if (minimo === null || maximo === null || preco === null || !(maximo > minimo)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const pct = Math.min(97, Math.max(3, ((preco - minimo) / (maximo - minimo)) * 100));
  const naMinima = preco <= minimo * 1.05;
  return (
    <div
      className="min-w-0"
      title={`Faixa de 52 semanas: ${fmtPreco(minimo, "BRL")} – ${fmtPreco(maximo, "BRL")} · atual ${fmtPreco(preco, "BRL")}`}
    >
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-emerald-500/35 via-sky-500/35 to-red-500/35">
        <span
          aria-hidden
          className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background ${
            naMinima ? "bg-emerald-500" : "bg-foreground"
          }`}
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[0.65rem] tabular-nums text-muted-foreground">
        <span>{fmtPreco(minimo, "BRL")}</span>
        <span>{fmtPreco(maximo, "BRL")}</span>
      </div>
    </div>
  );
}

/** Score de oportunidade: badge + barra de intensidade. */
function ScoreCelula({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const rotulo = rotuloScore(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge
        className={`whitespace-nowrap border-none ${CORES_SCORE[rotulo]}`}
        title={ROTULOS_SCORE[rotulo]}
      >
        {score}
      </Badge>
      <div className="h-1 w-10 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${corScoreBarra(rotulo)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/** Rating do gestor: letra A–D, nota e veredito com tooltip explicativo. */
function RatingGestorCelula({ gestor }: { gestor: ScoreGestor | null }) {
  if (!gestor || gestor.rating === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const alertas = gestor.alertas.length ? `\n\nBandeiras:\n• ${gestor.alertas.join("\n• ")}` : "";
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge
        className={`whitespace-nowrap border-none ${CORES_RATING[gestor.rating]}`}
        title={`${gestor.motivo}${alertas}`}
      >
        {gestor.rating}
      </Badge>
      <span className="text-[0.65rem] tabular-nums text-muted-foreground">
        {gestor.nota} pts · {gestor.veredito}
      </span>
    </div>
  );
}

function Kpi({
  rotulo,
  valor,
  sub,
  cor = "text-foreground",
  icone,
}: {
  rotulo: string;
  valor: string;
  sub?: ReactNode;
  cor?: string;
  icone: ReactNode;
}) {
  return (
    <div className="panel flex min-w-0 flex-col justify-between gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="t-label text-[0.6rem]">{rotulo}</p>
        <span className={`shrink-0 ${cor}`} aria-hidden>
          {icone}
        </span>
      </div>
      <p className={`t-metric-sm ${cor}`}>{valor}</p>
      {sub}
    </div>
  );
}

const ORDINAIS = ["1º", "2º", "3º"];

function PodiumCard({
  l,
  posicao,
  criterio,
  v,
  quantidade,
  aoSelecionar,
}: {
  l: LinhaRadarBase & { sinal: SinalRadar };
  posicao: number;
  criterio: Critério;
  v: number | null;
  quantidade: number;
  aoSelecionar: (linha: LinhaRadarBase) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => aoSelecionar(l)}
      className={`panel group flex min-w-0 items-center gap-3 p-4 text-left ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none ${PODIO_ANEL[posicao - 1]}`}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/50 text-base font-bold tabular-nums transition-colors group-hover:bg-primary/10">
        {posicao}
      </span>
      {l.logo ? (
        <img
          src={l.logo}
          alt=""
          loading="lazy"
          className="hidden size-9 shrink-0 rounded-lg object-contain sm:block"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">
          {l.ticker}
          {quantidade > 0 ? (
            <span className="ml-1.5 rounded-full border border-emerald-600/30 bg-emerald-600/10 px-1.5 py-px text-[0.6rem] font-bold text-emerald-600">
              {quantidade} na carteira
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {l.nome}
          {l.setor ? ` · ${l.setor}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
          {ORDINAIS[posicao - 1]} · {CRITERIOS.find((c) => c.valor === criterio)?.cabecalho}
        </p>
        <p className={`text-lg font-bold tabular-nums ${corValor(v, criterio)}`}>
          {formatarValor(v, criterio)}
        </p>
        <div className="mt-0.5 flex justify-end">
          <SinalBadge sinal={l.sinal} />
        </div>
      </div>
    </button>
  );
}

export function RankingRadar({
  linhas,
  carteira,
  categoria,
  totalUniverso,
  baseEm,
  atualizadoEm,
  aoTrocarCategoria,
  aoSelecionar,
}: {
  linhas: (LinhaRadarBase & { sinal: SinalRadar })[];
  /** Ticker (maiúsculo) → quantidade na carteira do usuário. */
  carteira?: ReadonlyMap<string, number>;
  categoria: "acao" | "fii";
  /** Total de ativos do universo completo (antes dos filtros). */
  totalUniverso: number;
  baseEm: string | null;
  atualizadoEm: string | null;
  aoTrocarCategoria: (categoria: "acao" | "fii") => void;
  aoSelecionar: (linha: LinhaRadarBase) => void;
}) {
  const [criterio, setCriterio] = useState<Critério>("score");
  const [direcao, setDirecao] = useState<Direcao>("desc");
  const [abaSinal, setAbaSinal] = useState<AbaSinal>("todos");
  const [porPagina, setPorPagina] = useState(50);
  const [pagina, setPagina] = useState(1);
  const meta = CRITERIOS.find((c) => c.valor === criterio)!;

  const estatisticas = useMemo(() => {
    let comHistorico = 0;
    let minimas52 = 0;
    let naCarteira = 0;
    const porSinal: Record<TipoSinal, number> = {
      comprar: 0,
      observar: 0,
      manter: 0,
      vender: 0,
      "sem-dados": 0,
    };
    const porRating: Partial<Record<RatingGestor, number>> = {};
    const scores: number[] = [];
    for (const l of linhas) {
      porSinal[l.sinal.tipo]++;
      const g = gestorDeLinha(l);
      if (g.rating) porRating[g.rating] = (porRating[g.rating] ?? 0) + 1;
      if (l.posicao) {
        comHistorico++;
        if (l.posicao.distMinima52sPct !== null && l.posicao.distMinima52sPct <= 5) minimas52++;
      }
      if ((carteira?.get(l.ticker.toUpperCase()) ?? 0) > 0) naCarteira++;
      if (l.score !== null && Number.isFinite(l.score)) scores.push(l.score);
    }
    return {
      total: linhas.length,
      comHistorico,
      coberturaPct: linhas.length > 0 ? (comHistorico / linhas.length) * 100 : 0,
      minimas52,
      naCarteira,
      scoreMedio: scores.length > 0 ? scores.reduce((s, x) => s + x, 0) / scores.length : null,
      porSinal,
      porRating: {
        A: porRating.A ?? 0,
        B: porRating.B ?? 0,
        C: porRating.C ?? 0,
        D: porRating.D ?? 0,
      },
    };
  }, [linhas, carteira]);

  const gestores = useMemo(() => {
    const mapa = new Map<string, ScoreGestor>();
    for (const l of linhas) mapa.set(l.ticker, gestorDeLinha(l));
    return mapa;
  }, [linhas]);

  const ranking = useMemo(() => {
    const alvo = abaSinal === "todos" ? linhas : linhas.filter((l) => l.sinal.tipo === abaSinal);
    const fator = direcao === "asc" ? -1 : 1;
    const semDados = alvo.filter(
      (l) => valorCritério(l, criterio, gestores.get(l.ticker)) === null,
    );
    const comDados = alvo
      .filter((l) => valorCritério(l, criterio, gestores.get(l.ticker)) !== null)
      .sort((a, b) => {
        const va = valorCritério(a, criterio, gestores.get(a.ticker)) as number;
        const vb = valorCritério(b, criterio, gestores.get(b.ticker)) as number;
        const vira = meta.sentido === "maior" ? vb - va : va - vb;
        return fator * vira;
      });
    return [...comDados, ...semDados];
  }, [linhas, criterio, direcao, abaSinal, meta.sentido, gestores]);

  const pódio = ranking.slice(0, 3);

  const totalPaginas = Math.max(1, Math.ceil(ranking.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const paginadas = ranking.slice(inicio, inicio + porPagina);
  const trocarPagina = (p: number) => {
    setPagina(Math.min(Math.max(1, p), totalPaginas));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const trocarPorPagina = (n: number) => {
    setPorPagina(n);
    setPagina(1);
  };

  if (!linhas.length) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-10 text-center">
        <Radar className="size-10 text-muted-foreground/40" aria-hidden />
        <div>
          <p className="t-card-title">Nenhum ativo encontrado</p>
          <p className="t-caption mt-1">
            Ajuste a busca ou os filtros aplicados na visão de cotações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho institucional do terminal */}
      <section className="panel relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-28 h-56 bg-gradient-to-b from-primary/10 to-transparent"
        />
        <div className="relative flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-lift"
              aria-hidden
            >
              <Trophy className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="t-label">Radar · Terminal de triagem</p>
              <h2 className="t-h3 mt-0.5">Ranking de Ativos</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  {atualizadoEm
                    ? `Atualizado ${new Date(atualizadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                    : "Atualização pendente"}
                </span>
                <span>
                  Base fundamentalista {baseEm ? new Date(baseEm).toLocaleDateString("pt-BR") : "—"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={categoria}
              onValueChange={(v) => aoTrocarCategoria(v as "acao" | "fii")}
              aria-label="Categoria do ranking"
            >
              <TabsList className="h-9 rounded-lg bg-muted/60">
                <TabsTrigger value="acao" className="gap-1.5 rounded-md px-3">
                  Ações
                </TabsTrigger>
                <TabsTrigger value="fii" className="gap-1.5 rounded-md px-3">
                  FIIs
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Badge variant="secondary" className="h-9 gap-1.5 px-3 text-xs font-normal">
              {totalUniverso.toLocaleString("pt-BR")}
              <span className="text-muted-foreground">
                {categoria === "acao" ? "ações" : "FIIs"} na B3
              </span>
            </Badge>
          </div>
        </div>
      </section>

      {/* Indicadores do universo (painel do gestor) */}
      <section
        aria-label="Indicadores do universo"
        className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7"
      >
        <Kpi
          rotulo="Universo filtrado"
          valor={estatisticas.total.toLocaleString("pt-BR")}
          sub={
            <div className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
              <span>de</span>
              <span className="font-bold text-foreground">{totalUniverso.toLocaleString("pt-BR")}</span>
              <span>ativos totais</span>
            </div>
          }
          cor="text-foreground"
          icone={<Layers className="size-4" />}
        />
        <Kpi
          rotulo="Cobertura de Histórico"
          valor={`${estatisticas.coberturaPct.toFixed(0)}%`}
          sub={
            <div className="mt-1 space-y-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted/50 ring-1 ring-border/20">
                <div
                  className="h-full rounded-full bg-gradient-brand shadow-[0_0_8px_rgba(0,107,60,0.4)]"
                  style={{ width: `${estatisticas.coberturaPct}%` }}
                />
              </div>
              <p className="flex items-center gap-1.5 text-[0.65rem] font-medium text-primary">
                <span className="size-1 rounded-full bg-primary animate-pulse" />
                {estatisticas.comHistorico} ativos com dados
              </p>
            </div>
          }
          cor="text-primary"
          icone={<Radar className="size-4" />}
        />
        <Kpi
          rotulo="Qualidade do Universo"
          valor={estatisticas.scoreMedio !== null ? estatisticas.scoreMedio.toFixed(0) : "—"}
          sub={
            <p className="t-caption leading-relaxed">
              Média de oportunidade baseada em <span className="text-foreground font-medium">Preço</span>, 
              <span className="text-foreground font-medium"> DY</span> e <span className="text-foreground font-medium">Risco</span>.
            </p>
          }
          cor="text-foreground"
          icone={<Gauge className="size-4" />}
        />
        <Kpi
          rotulo="Oportunidades de Compra"
          valor={String(estatisticas.porSinal.comprar)}
          sub={
            <p className="t-caption flex items-center gap-1 text-emerald-600/80 font-medium">
              <TrendingUp className="size-3" />
              Preços em mínimas históricas
            </p>
          }
          cor="text-emerald-600"
          icone={<TrendingUp className="size-4" />}
        />
        <Kpi
          rotulo="Alertas de Mínimas 52s"
          valor={String(estatisticas.minimas52)}
          sub={
            <p className="t-caption leading-relaxed">
              Ativos a menos de <span className="text-sky-600 font-bold">5%</span> da menor cotação do último ano.
            </p>
          }
          cor="text-sky-600"
          icone={<Activity className="size-4" />}
        />
        <Kpi
          rotulo="Ativos em Carteira"
          valor={String(estatisticas.naCarteira)}
          sub={
            <p className="t-caption">
              Total de ativos que você já possui neste universo filtrado.
            </p>
          }
          cor="text-foreground"
          icone={<Wallet className="size-4" />}
        />
        <Kpi
          rotulo="Excelência (Rating A)"
          valor={String(estatisticas.porRating.A)}
          sub={
            <div className="space-y-1">
              <div className="flex justify-between text-[0.65rem] font-medium">
                <span className="text-emerald-600">A/B: {estatisticas.porRating.A + estatisticas.porRating.B}</span>
                <span className="text-amber-600">C: {estatisticas.porRating.C}</span>
                <span className="text-red-600">D: {estatisticas.porRating.D}</span>
              </div>
              <div className="h-1 flex overflow-hidden rounded-full bg-muted/30">
                <div className="bg-emerald-500" style={{ width: `${((estatisticas.porRating.A + estatisticas.porRating.B) / Math.max(1, estatisticas.total)) * 100}%` }} />
                <div className="bg-amber-500" style={{ width: `${(estatisticas.porRating.C / Math.max(1, estatisticas.total)) * 100}%` }} />
                <div className="bg-red-500" style={{ width: `${(estatisticas.porRating.D / Math.max(1, estatisticas.total)) * 100}%` }} />
              </div>
            </div>
          }
          cor="text-emerald-600"
          icone={<Trophy className="size-4" />}
        />
      </section>

      {/* Navegação: livros por sinal + ferramentas do critério */}
      <section className="panel p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Tabs
            value={abaSinal}
            onValueChange={(v) => setAbaSinal(v as AbaSinal)}
            aria-label="Filtrar o ranking por sinal do radar"
          >
            <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-xl bg-muted/50 p-1">
              {ABAS_SINAL.map((aba) => {
                const contagem =
                  aba.valor === "todos" ? linhas.length : estatisticas.porSinal[aba.valor];
                return (
                  <TabsTrigger
                    key={aba.valor}
                    value={aba.valor}
                    className="h-8 gap-1.5 rounded-lg px-2.5 text-xs data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow"
                  >
                    <span aria-hidden className={`size-1.5 rounded-full ${COR_DOT[aba.valor]}`} />
                    {aba.rotulo}
                    <span className="rounded-full bg-muted px-1.5 text-[0.6rem] font-semibold tabular-nums text-muted-foreground">
                      {contagem}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Select value={criterio} onValueChange={(v) => setCriterio(v as Critério)}>
              <SelectTrigger
                className="h-9 w-full min-w-0 flex-1 sm:w-64"
                aria-label="Critério do ranking"
              >
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setDirecao((d) => (d === "desc" ? "asc" : "desc"))}
              title={
                direcao === "desc"
                  ? `Ordem decrescente — reverter para crescente`
                  : `Ordem crescente — reverter para decrescente`
              }
              aria-label={direcao === "desc" ? "Ordem decrescente" : "Ordem crescente"}
            >
              {direcao === "desc" ? (
                <ArrowDownWideNarrow className="size-4" aria-hidden />
              ) : (
                <ArrowUpNarrowWide className="size-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{meta.rotulo}</span> · {meta.ajuda}. Os
          ativos sem dado ficam ao final da lista.
        </p>
      </section>

      {/* Pódio do critério (desktop) */}
      {pódio.length >= 2 ? (
        <section aria-label="Top 3 do ranking" className="hidden gap-3 md:grid md:grid-cols-3">
          {OrdinaisPódio(pódio, criterio, carteira, aoSelecionar, gestores).map((node) => node)}
        </section>
      ) : null}

      <div className="panel hidden w-full overflow-hidden md:block">
        <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/60">
          <Table className="w-full min-w-[1200px] table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="w-[5%] min-w-[44px] pl-4 text-center"
                  aria-label="Posição no ranking"
                >
                  #
                </TableHead>
                <TableHead className="w-[20%] min-w-[200px] lg:w-[18%]">Ativo</TableHead>
                <TableHead
                  className="w-[10%] whitespace-nowrap text-right"
                  title="Último preço"
                >
                  Preço
                </TableHead>
                <TableHead
                  className="w-[10%] whitespace-nowrap text-right"
                  title="Variação percentual no pregão atual"
                >
                  Var. Dia %
                </TableHead>
                <TableHead
                  className="w-[9%] whitespace-nowrap text-right"
                  title="Rendimento por dividendos dos últimos 12 meses"
                >
                  DY 12m
                </TableHead>
                <TableHead
                  className="hidden w-[6%] whitespace-nowrap text-right lg:table-cell"
                  title="Preço sobre valor patrimonial"
                >
                  P/VPA
                </TableHead>
                <TableHead
                  className="hidden w-[10%] min-w-[120px] text-center xl:table-cell"
                  title="Posição do preço na própria história: 0% = mínima · 100% = máxima"
                >
                  Histórico
                </TableHead>
                <TableHead
                  className="hidden w-[10%] min-w-[110px] 2xl:table-cell"
                  title="Posição da cotação entre a mínima e a máxima de 52 semanas"
                >
                  Faixa 52s
                </TableHead>
                <TableHead
                  className="hidden w-[7%] whitespace-nowrap text-right xl:table-cell"
                  title="Distância do preço até a mínima de 52 semanas"
                >
                  Mín. 52s
                </TableHead>

                <TableHead
                  className="hidden w-[8%] whitespace-nowrap text-right 2xl:table-cell"
                  title="Risco: queda máxima desde o pico do histórico e volatilidade anual"
                >
                  Risco 52s
                </TableHead>
                <TableHead className="w-[8%] min-w-[64px] whitespace-nowrap text-center">
                  Score
                </TableHead>
                <TableHead
                  className="w-[12%] min-w-[84px] whitespace-nowrap text-center"
                  title="Rating do gestor: nota 0–100 — fundamentos (35%), oportunidade (20%), dividendos (20%), prêmio vs Selic (10%), liquidez (8%), endividamento (7%), com ajuste setorial"
                >
                  Gestor
                </TableHead>
                <TableHead
                  className="w-[14%] min-w-[104px] pr-4 text-right"

                  title={meta.ajuda}
                  aria-sort={direcao === "asc" ? "ascending" : "descending"}
                >
                  {meta.cabecalho}
                  <span className="ml-1 align-middle text-[0.65rem] font-medium text-muted-foreground/60">
                    {direcao === "desc" ? "↓" : "↑"}
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 10 }).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell className="pl-4 text-center">
                      <div className="flex justify-center">
                        <div className="size-6 animate-pulse rounded-full bg-muted/40" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-8 animate-pulse rounded-md bg-muted/40" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-16 animate-pulse rounded bg-muted/40" />
                          <div className="h-3 w-32 animate-pulse rounded bg-muted/40" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted/40" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted/40" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted/40" />
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted/40" />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex justify-center">
                        <div className="h-1.5 w-24 animate-pulse rounded-full bg-muted/40" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      <div className="h-1.5 w-full animate-pulse rounded-full bg-muted/40" />
                    </TableCell>
                    <TableCell className="hidden text-right xl:table-cell">
                      <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted/40" />
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      <div className="space-y-1 text-right">
                        <div className="ml-auto h-3 w-10 animate-pulse rounded bg-muted/40" />
                        <div className="ml-auto h-3 w-12 animate-pulse rounded bg-muted/40" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="mx-auto h-6 w-10 animate-pulse rounded bg-muted/40" />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="mx-auto h-6 w-12 animate-pulse rounded bg-muted/40" />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="ml-auto h-6 w-16 animate-pulse rounded bg-muted/40" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Search className="size-10 text-muted-foreground/40" />
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">Nenhum ativo encontrado</p>
                        <p className="text-sm text-muted-foreground">
                          Tente ajustar seus filtros ou mudar a busca.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginadas.map((l, i) => {
                  const quantidade = carteira?.get(l.ticker.toUpperCase()) ?? 0;
                  return (
                    <TableRow
                      key={l.ticker}
                      onClick={() => aoSelecionar(l)}
                      className="group relative cursor-pointer"
                    >
                      <TableCell className="relative pl-4 text-center">
                        <span
                          aria-hidden
                          className={`absolute inset-y-0 left-0 w-[3px] ${corZona(l.posicao?.percentil ?? null)}`}
                        />
                        <ChipPosicao posicao={inicio + i + 1} />
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
                              {l.setor ? (
                                <span className="ml-1 hidden rounded-full border border-border/60 px-1.5 py-px text-[0.6rem] text-muted-foreground lg:inline">
                                  {l.setor}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="block text-sm tabular-nums">
                          {l.preco !== null ? fmtPreco(l.preco, "BRL") : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {isFetching && !l.variacaoDia ? (
                          <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted/40" />
                        ) : (
                          <span
                            className={`block text-sm font-semibold tabular-nums ${corValor(l.variacaoDia, "variacao")}`}
                          >
                            {fmtPercent(l.variacaoDia)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="block text-sm font-semibold tabular-nums text-positive">
                          {l.dy12 !== null ? `${l.dy12.toLocaleString("pt-BR")}%` : "—"}
                        </span>
                        <div className="ml-auto mt-1 h-1 w-12 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500/70"
                            style={{
                              width: `${l.dy12 !== null ? Math.min(100, (l.dy12 / 12) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                        {l.pvp !== null ? l.pvp.toLocaleString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex justify-center">
                          <BarraHistorico
                            percentil={l.posicao?.percentil ?? null}
                            zona={l.sinal.zona}
                            inicioSerie={l.posicao?.inicioSerie ?? null}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell">
                        <Faixa52sCelula l={l} />
                      </TableCell>
                      <TableCell className="hidden text-right xl:table-cell">
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            l.posicao?.distMinima52sPct !== null &&
                            l.posicao?.distMinima52sPct !== undefined
                              ? l.posicao.distMinima52sPct <= 5
                                ? "text-emerald-600"
                                : l.posicao.distMinima52sPct <= 20
                                  ? "text-sky-600"
                                  : "text-muted-foreground"
                              : "text-muted-foreground"
                          }`}
                          title="Distância até a mínima de 52 semanas (0% = na mínima)"
                        >
                          {l.posicao?.distMinima52sPct !== null &&
                          l.posicao?.distMinima52sPct !== undefined
                            ? `−${l.posicao.distMinima52sPct.toFixed(1).replace(".", ",")}%`
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell">
                        <span
                          className={`block text-right text-xs tabular-nums ${corDrawdown(l.posicao?.drawdownMaximoPct ?? null)}`}
                        >
                          {l.posicao?.drawdownMaximoPct !== null &&
                          l.posicao?.drawdownMaximoPct !== undefined
                            ? `${l.posicao.drawdownMaximoPct.toFixed(1).replace(".", ",")}%`
                            : "—"}
                        </span>
                        <span className="block text-right text-[0.65rem] tabular-nums text-muted-foreground">
                          {l.posicao?.volatilidadeAnualPct !== null &&
                          l.posicao?.volatilidadeAnualPct !== undefined
                            ? `vol ${l.posicao.volatilidadeAnualPct.toFixed(0)}%`
                            : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreCelula score={l.score} />
                      </TableCell>
                      <TableCell className="text-center">
                        <RatingGestorCelula gestor={gestores.get(l.ticker) ?? null} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <SinalBadge sinal={l.sinal} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cartões em camadas (mobile) */}
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {paginadas.map((l, i) => {
          const v = valorCritério(l, criterio, gestores.get(l.ticker));
          const quantidade = carteira?.get(l.ticker.toUpperCase()) ?? 0;
          return (
            <li key={l.ticker}>
              <button
                type="button"
                onClick={() => aoSelecionar(l)}
                className="panel w-full overflow-hidden p-3 text-left transition-transform active:scale-[0.99] active:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <ChipPosicao posicao={inicio + i + 1} />
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
                    <span className="block truncate text-xs text-muted-foreground">
                      {l.nome}
                      {l.setor ? ` · ${l.setor}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums">
                      {l.preco !== null ? fmtPreco(l.preco, "BRL") : "—"}
                    </span>
                    <span
                      className={`block text-xs tabular-nums ${corValor(l.variacaoDia, "variacao")}`}
                    >
                      {fmtPercent(l.variacaoDia)}
                    </span>
                  </span>
                </div>
                <span className="mt-2.5 flex items-center gap-3 border-t border-border/60 pt-2.5">
                  <span className="min-w-0 shrink-0">
                    <span className="block text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      {meta.cabecalho}
                    </span>
                    <span
                      className={`block text-base font-bold tabular-nums ${corValor(v, criterio)}`}
                    >
                      {formatarValor(v, criterio)}
                    </span>
                  </span>
                  <div className="flex justify-center">
                    <BarraHistorico
                      percentil={l.posicao?.percentil ?? null}
                      zona={l.sinal.zona}
                      compacto
                    />
                  </div>
                  <SinalBadge sinal={l.sinal} />
                </span>
                <dl className="mt-2 grid grid-cols-4 gap-2 border-t border-border/60 pt-2.5 text-xs">
                  <div>
                    <dt className="t-caption">DY 12m</dt>
                    <dd className="t-num mt-0.5 text-positive">
                      {l.dy12 !== null ? `${l.dy12.toLocaleString("pt-BR")}%` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="t-caption">P/VPA</dt>
                    <dd className="t-num mt-0.5">
                      {l.pvp !== null ? l.pvp.toLocaleString("pt-BR") : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="t-caption">Score</dt>
                    <dd className="t-num mt-0.5">{l.score ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="t-caption">Gestor</dt>
                    <dd className="t-num mt-0.5">{gestores.get(l.ticker)?.rating ?? "—"}</dd>
                  </div>
                </dl>
              </button>
            </li>
          );
        })}
      </ol>

      <PaginacaoAtivos
        pagina={paginaAtual}
        totalPaginas={totalPaginas}
        totalItens={ranking.length}
        inicio={ranking.length ? inicio + 1 : 0}
        fim={Math.min(inicio + porPagina, ranking.length)}
        porPagina={porPagina}
        aoMudarPagina={trocarPagina}
        aoMudarPorPagina={trocarPorPagina}
      />

      {/* Legenda e nota */}
      <footer className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4 text-xs text-muted-foreground">
        <p className="t-label flex items-center gap-2">
          <Radar className="size-3.5 shrink-0" aria-hidden />
          Como ler o ranking
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
            Percentil ≤ 25% · mínima histórica
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-sky-500" />≤ 45% · barata
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-amber-500" />≤ 70% · faixa média
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-red-500" />
            {">"} 70% · cara
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-slate-400" />
            sem histórico
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-1.5 w-6 rounded-full bg-gradient-brand" />
            faixa de 52 semanas (marcador = cotação atual)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
            Rating A ≥ 75
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-sky-500" />B ≥ 60
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-amber-500" />C ≥ 45
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-red-500" />D &lt; 45
          </span>
        </div>
        <p className="border-t border-border/60 pt-3">
          O <span className="font-medium text-foreground">score</span> combina posição na própria
          história, dividendos e risco; o <span className="font-medium text-foreground">sinal</span>{" "}
          é o veredito consolidado do radar; o{" "}
          <span className="font-medium text-foreground">rating do gestor</span> pondera fundamentos
          (35%, com ajuste setorial), oportunidade (20%), dividendos (20%),{" "}
          <span className="font-medium text-foreground">prêmio do DY sobre a Selic</span> (10%),
          liquidez (8%) e endividamento (7%) e define o limite de aporte por posição (A=8%, B=5%,
          C=3%, D=0% do patrimônio). O prêmio negativo — DY abaixo da Selic — vira bandeira de custo
          de oportunidade. Material educacional de triagem — não constitui recomendação de
          investimento.
        </p>
      </footer>
    </div>
  );
}

/** Monta os cartões do pódio preservando a ordem 1º → 2º → 3º. */
function OrdinaisPódio(
  lideres: (LinhaRadarBase & { sinal: SinalRadar })[],
  criterio: Critério,
  carteira: ReadonlyMap<string, number> | undefined,
  aoSelecionar: (linha: LinhaRadarBase) => void,
  gestores?: ReadonlyMap<string, ScoreGestor>,
): ReactNode[] {
  return [0, 1, 2].map((i) => {
    const l = lideres[i];
    if (!l) return null;
    return (
      <PodiumCard
        key={l.ticker}
        l={l}
        posicao={i + 1}
        criterio={criterio}
        v={valorCritério(l, criterio, gestores?.get(l.ticker))}
        quantidade={carteira?.get(l.ticker.toUpperCase()) ?? 0}
        aoSelecionar={aoSelecionar}
      />
    );
  });
}
