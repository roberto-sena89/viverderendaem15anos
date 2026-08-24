import { useEffect, useMemo, useState } from "react";
import { Hourglass, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { useAtivosAoVivo } from "@/lib/cotacoes-tempo-real";
import { useDividendos, usePlano } from "@/lib/data";
import {
  calcularRelogioLiberdade,
  anosAteLiberdade,
  OBJETIVO_RENDA_PADRAO,
} from "@/lib/relogio-liberdade";
import { brl } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

const CHAVE_OBJETIVO = "vr15:objetivo-renda-mensal";

function lerObjetivo(): number {
  if (typeof window === "undefined") return OBJETIVO_RENDA_PADRAO;
  try {
    const v = Number(window.localStorage.getItem(CHAVE_OBJETIVO));
    return Number.isFinite(v) && v > 0 ? v : OBJETIVO_RENDA_PADRAO;
  } catch {
    return OBJETIVO_RENDA_PADRAO;
  }
}

/** Converte progresso (0–100+) em ângulo do ponteiro (0° = topo, 360° = volta). */
function anguloDoProgresso(progresso: number): number {
  return Math.min(360, Math.max(0, progresso)) * 3.6;
}

/** Relógio da Liberdade — mostrador analógico da jornada até a independência. */
export function RelogioLiberdade() {
  const { data: ativos = [] } = useAtivosAoVivo();
  const { data: dividendos = [] } = useDividendos();
  const { data: plano } = usePlano();

  const [objetivo, setObjetivo] = useState<number>(lerObjetivo);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (Number.isFinite(objetivo) && objetivo > 0) {
      try {
        window.localStorage.setItem(CHAVE_OBJETIVO, String(objetivo));
      } catch {
        /* armazenamento indisponível */
      }
    }
  }, [objetivo]);

  const relogio = useMemo(
    () => calcularRelogioLiberdade(ativos, dividendos, objetivo),
    [ativos, dividendos, objetivo],
  );

  const anos = useMemo(
    () => (plano ? anosAteLiberdade(ativos, plano, objetivo, 0) : null),
    [ativos, plano, objetivo],
  );

  const anosPausado = useMemo(
    () => (plano ? anosAteLiberdade(ativos, { ...plano, aporteMensal: 0 }, objetivo, 0) : null),
    [ativos, plano, objetivo],
  );

  const anosExibido = pausado ? anosPausado : anos;
  const { estagio, progresso } = relogio;
  const angulo = anguloDoProgresso(progresso);
  const liberto = progresso >= 100;
  const dyAtual =
    relogio.rendaPassivaMensal > 0
      ? ((relogio.rendaPassivaMensal * 12) /
          (ativos.reduce((s, a) => s + a.quantidade * a.precoAtual, 0) || 1)) *
        100
      : 0;

  const fraseAnos =
    anosExibido == null
      ? "Com este plano, a liberdade fica além do horizonte projetado."
      : anosExibido <= 0
        ? "Você já atingiu a meta de renda! 🎉"
        : pausado
          ? `Sem novos aportes, a liberdade chegaria em ~${formatarAnos(anosExibido)}.`
          : `Mantendo o plano, a liberdade chega em ~${formatarAnos(anosExibido)}.`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Mostrador */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative aspect-square w-full max-w-[300px]">
          <MostradorAnalógico
            angulo={angulo}
            progresso={progresso}
            cor={estagio.hex}
            liberto={liberto}
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[0.7rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Liberdade
            </span>
            <span className="num font-display text-3xl font-bold tabular-nums sm:text-4xl">
              {Math.min(999, Math.round(progresso))}%
            </span>
            <span className="mt-1 text-xs text-muted-foreground">da meta de renda coberta</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPausado((p) => !p)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              pausado
                ? "border-negative/40 bg-negative/10 text-negative"
                : "border-border bg-muted/50 hover:bg-muted",
            )}
            title="Simular como seria se você parasse de aportar hoje"
          >
            {pausado ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {pausado ? "Retomar aportes" : "E se eu parar de aportar?"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPausado(false);
              setObjetivo(OBJETIVO_RENDA_PADRAO);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            title="Restaurar padrões"
          >
            <RotateCcw className="size-3.5" />
            Padrões
          </button>
        </div>
      </div>

      {/* Leituras digitais */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="objetivo-renda"
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Hourglass className="size-3.5" />
              Meta de renda mensal
            </label>
            <input
              id="objetivo-renda"
              type="number"
              min={100}
              step={500}
              value={objetivo}
              onChange={(e) => setObjetivo(Number(e.target.value) || OBJETIVO_RENDA_PADRAO)}
              className="w-36 rounded-md border border-input bg-background px-2 py-1 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Meta de renda mensal em reais"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Rendimento estimado para {brl(objetivo, 2)}/mês ao seu ritmo atual de dividendos
            {dyAtual > 0 ? <> (DY {dyAtual.toFixed(1).replace(".", ",")}%)</> : null}.
          </p>
        </div>

        <p className="text-sm font-medium leading-relaxed" style={{ color: estagio.hex }}>
          {liberto ? estagio.mensagem : relogio.fraseDias}
        </p>

        <p className="text-xs leading-relaxed text-muted-foreground">{fraseAnos}</p>

        {/* Mini-historico: dias de liberdade comprados */}
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="size-3.5 text-amber-500" />
            Dias de liberdade comprados — últimos 12 meses
          </h3>
          {relogio.historico.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Sem proventos registrados ainda. Cada dividendo compra dias de liberdade.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {relogio.historico.slice(0, 6).map((m) => (
                <li key={m.rotulo} className="flex items-center gap-2 text-xs">
                  <span className="w-11 shrink-0 text-muted-foreground">{m.rotulo}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${Math.min(100, (m.dias / 30) * 100)}%`,
                        backgroundColor: estagio.hex,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right font-medium tabular-nums">
                    {m.dias.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias
                  </span>
                </li>
              ))}
            </ul>
          )}
          {relogio.melhorMes && relogio.melhorMes.dias > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Melhor mês: <strong>{relogio.melhorMes.rotulo}</strong> —{" "}
              {brl(relogio.melhorMes.valor, 2)} em proventos compraram{" "}
              {relogio.melhorMes.dias.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias de
              liberdade.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatarAnos(anos: number): string {
  if (anos < 1) return `${Math.round(anos * 12)} meses`;
  const a = Math.floor(anos);
  const m = Math.round((anos - a) * 12);
  return m > 0
    ? `${a} ano${a > 1 ? "s" : ""} e ${m} ${m > 1 ? "meses" : "mês"}`
    : `${a} ano${a > 1 ? "s" : ""}`;
}

/** Mostrador analógico em SVG: anel de progresso + ponteiro + marcas de hora. */
function MostradorAnalógico({
  angulo,
  progresso,
  cor,
  liberto,
}: {
  angulo: number;
  progresso: number;
  cor: string;
  liberto: boolean;
}) {
  const RAIO = 90;
  const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
  const pct = Math.min(100, progresso) / 100;

  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      role="img"
      aria-label="Relógio da Liberdade"
    >
      <defs>
        <linearGradient id="anel-gradiente" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={cor} />
          <stop offset="100%" stopColor={cor} stopOpacity={0.55} />
        </linearGradient>
      </defs>

      {/* anel de fundo */}
      <circle
        cx="100"
        cy="100"
        r={RAIO}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="10"
        opacity="0.4"
      />
      {/* anel de progresso */}
      <circle
        cx="100"
        cy="100"
        r={RAIO}
        fill="none"
        stroke="url(#anel-gradiente)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={CIRCUNFERENCIA}
        strokeDashoffset={CIRCUNFERENCIA * (1 - pct)}
        transform="rotate(-90 100 100)"
        className="transition-[stroke-dashoffset] duration-1000 ease-out"
      />

      {/* marcas de hora */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 2 * Math.PI;
        const x1 = 100 + Math.sin(a) * (RAIO - 14);
        const y1 = 100 - Math.cos(a) * (RAIO - 14);
        const x2 = 100 + Math.sin(a) * (RAIO - 18);
        const y2 = 100 - Math.cos(a) * (RAIO - 18);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--color-muted-foreground)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.7}
          />
        );
      })}

      {/* ponteiro */}
      <g
        style={{ transform: `rotate(${angulo}deg)`, transformOrigin: "100px 100px" }}
        className="transition-transform duration-1000 ease-out"
      >
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="34"
          stroke={liberto ? "#F5A623" : cor}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="6" fill={liberto ? "#F5A623" : cor} />
        <circle cx="100" cy="100" r="2.5" fill="var(--color-background)" />
      </g>
    </svg>
  );
}
