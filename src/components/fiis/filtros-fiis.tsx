import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COR_TIPO, ROTULO_TIPO, SEGMENTOS_FII, TIPOS_FII, type TipoFii } from "@/lib/fiis-base";

export type Ranking =
  | "patrimonio"
  | "dy"
  | "queridos"
  | "liquidez"
  | "pvp"
  | "var12m";

export const RANKINGS: { id: Ranking; rotulo: string }[] = [
  { id: "patrimonio", rotulo: "Valor patrimonial" },
  { id: "dy", rotulo: "Dividend yield" },
  { id: "queridos", rotulo: "Mais queridos" },
  { id: "liquidez", rotulo: "Liquidez" },
  { id: "pvp", rotulo: "Menor P/VP" },
  { id: "var12m", rotulo: "Maior variação 12m" },
];

export type FaixasFii = {
  dy: [number, number];
  pvp: [number, number];
  liquidez: [number, number];
};

export const FAIXAS_PADRAO: FaixasFii = { dy: [0, 30], pvp: [0, 3], liquidez: [0, 20] };

/** Painel de filtros da grade (usado no desktop e dentro do bottom sheet mobile). */
export function FiltrosFiis({
  ranking,
  aoTrocarRanking,
  tipos,
  aoAlternarTipo,
  segmento,
  aoTrocarSegmento,
  faixas,
  aoTrocarFaixas,
  aoLimpar,
  total,
}: {
  ranking: Ranking;
  aoTrocarRanking: (r: Ranking) => void;
  tipos: TipoFii[];
  aoAlternarTipo: (t: TipoFii) => void;
  segmento: string;
  aoTrocarSegmento: (s: string) => void;
  faixas: FaixasFii;
  aoTrocarFaixas: (f: FaixasFii) => void;
  aoLimpar: () => void;
  total: number;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
          Ranking rápido
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RANKINGS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => aoTrocarRanking(r.id)}
              aria-pressed={ranking === r.id}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                ranking === r.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {r.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
          Tipo de fundo
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_FII.map((t) => {
            const ativo = tipos.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => aoAlternarTipo(t)}
                aria-pressed={ativo}
                title={ROTULO_TIPO[t]}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  ativo ? COR_TIPO[t] : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5 text-xs">
          <span className="font-semibold tracking-wide text-muted-foreground uppercase">Segmento</span>
          <Select value={segmento} onValueChange={aoTrocarSegmento}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os segmentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os segmentos</SelectItem>
              {SEGMENTOS_FII.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <FaixaSlider
          rotulo="Dividend yield (12m)"
          sufixo="%"
          min={0}
          max={30}
          passo={0.5}
          valor={faixas.dy}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, dy: v })}
        />
        <FaixaSlider
          rotulo="P/VP"
          min={0}
          max={3}
          passo={0.05}
          casas={2}
          valor={faixas.pvp}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, pvp: v })}
        />
        <FaixaSlider
          rotulo="Liquidez diária"
          prefixo="R$ "
          sufixo=" mi"
          min={0}
          max={20}
          passo={0.1}
          casas={1}
          valor={faixas.liquidez}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, liquidez: v })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="inline-flex items-center gap-2 text-sm">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
          <strong className="font-semibold tabular-nums">{total.toLocaleString("pt-BR")}</strong>
          <span className="text-muted-foreground">FIIs encontrados</span>
        </p>
        <Button variant="ghost" size="sm" onClick={aoLimpar}>
          <RotateCcw className="size-4" />
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

function FaixaSlider({
  rotulo,
  valor,
  aoMudar,
  min,
  max,
  passo,
  casas = 0,
  prefixo = "",
  sufixo = "",
}: {
  rotulo: string;
  valor: [number, number];
  aoMudar: (v: [number, number]) => void;
  min: number;
  max: number;
  passo: number;
  casas?: number;
  prefixo?: string;
  sufixo?: string;
}) {
  const fmt = (v: number) =>
    `${prefixo}${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}${sufixo}`;
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tracking-wide text-muted-foreground uppercase">{rotulo}</span>
        <span className="tabular-nums">
          {fmt(valor[0])} – {valor[1] >= max ? `${fmt(max)}+` : fmt(valor[1])}
        </span>
      </div>
      <Slider
        value={valor}
        min={min}
        max={max}
        step={passo}
        onValueChange={(v) => aoMudar([v[0] ?? min, v[1] ?? max])}
        aria-label={rotulo}
        className="pt-2"
      />
    </div>
  );
}
