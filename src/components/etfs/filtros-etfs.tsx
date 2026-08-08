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
import { CLASSES_ETF, COR_CLASSE_ETF, type ClasseEtf, type MercadoEtf } from "@/lib/etfs-base";

export type RankingEtf = "capitalizacao" | "dy" | "var12m" | "var60m" | "cotistas" | "var30d";

export const RANKINGS_ETF: { id: RankingEtf; rotulo: string }[] = [
  { id: "capitalizacao", rotulo: "Maior patrimônio" },
  { id: "cotistas", rotulo: "Mais cotistas" },
  { id: "dy", rotulo: "Dividend yield" },
  { id: "var30d", rotulo: "Variação 30d" },
  { id: "var12m", rotulo: "Variação 12m" },
  { id: "var60m", rotulo: "Variação 5 anos" },
];

export type FaixasEtf = {
  dy: [number, number];
  var12m: [number, number];
  /** Patrimônio mínimo em milhões de reais. */
  patrimonioMin: number;
};

export const FAIXAS_ETF_PADRAO: FaixasEtf = {
  dy: [0, 20],
  var12m: [-60, 120],
  patrimonioMin: 0,
};

export const GESTORA_TODAS = "todas";

/** Painel de filtros da grade de ETFs (desktop e bottom sheet no mobile). */
export function FiltrosEtfs({
  ranking,
  aoTrocarRanking,
  classes,
  aoAlternarClasse,
  mercado,
  aoTrocarMercado,
  gestora,
  aoTrocarGestora,
  gestoras,
  faixas,
  aoTrocarFaixas,
  aoLimpar,
  total,
}: {
  ranking: RankingEtf;
  aoTrocarRanking: (r: RankingEtf) => void;
  classes: ClasseEtf[];
  aoAlternarClasse: (c: ClasseEtf) => void;
  mercado: MercadoEtf | "todos";
  aoTrocarMercado: (m: MercadoEtf | "todos") => void;
  gestora: string;
  aoTrocarGestora: (g: string) => void;
  gestoras: string[];
  faixas: FaixasEtf;
  aoTrocarFaixas: (f: FaixasEtf) => void;
  aoLimpar: () => void;
  total: number;
}) {
  return (
    <div className="pilha-secao">
      <div>
        <p className="mb-2 t-label">Ranking rápido</p>
        <div className="flex flex-wrap gap-1.5">
          {RANKINGS_ETF.map((r) => (
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
        <p className="mb-2 t-label">Classe de exposição</p>
        <div className="flex flex-wrap gap-1.5">
          {CLASSES_ETF.map((c) => {
            const ativo = classes.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => aoAlternarClasse(c)}
                aria-pressed={ativo}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  ativo ? COR_CLASSE_ETF[c] : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-secao sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5 text-xs">
          <span className="t-label">Mercado</span>
          <Select value={mercado} onValueChange={(v) => aoTrocarMercado(v as MercadoEtf | "todos")}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os mercados</SelectItem>
              <SelectItem value="nacional">ETFs da B3</SelectItem>
              <SelectItem value="internacional">ETFs internacionais</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="t-label">Gestora</span>
          <Select value={gestora} onValueChange={aoTrocarGestora}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas as gestoras" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={GESTORA_TODAS}>Todas as gestoras</SelectItem>
              {gestoras.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <FaixaSlider
          rotulo="Dividend yield"
          sufixo="%"
          min={0}
          max={20}
          passo={0.5}
          casas={1}
          valor={faixas.dy}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, dy: v })}
        />
        <FaixaSlider
          rotulo="Variação 12m"
          sufixo="%"
          min={-60}
          max={120}
          passo={5}
          valor={faixas.var12m}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, var12m: v })}
        />

        <div className="space-y-1.5 text-xs sm:col-span-2 xl:col-span-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="t-label">Patrimônio mínimo</span>
            <span className="tabular-nums">
              {faixas.patrimonioMin === 0
                ? "sem mínimo"
                : `R$ ${faixas.patrimonioMin.toLocaleString("pt-BR")} mi`}
            </span>
          </div>
          <Slider
            value={[faixas.patrimonioMin]}
            min={0}
            max={5000}
            step={50}
            onValueChange={(v) => aoTrocarFaixas({ ...faixas, patrimonioMin: v[0] ?? 0 })}
            aria-label="Patrimônio mínimo"
            className="pt-2"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="inline-flex items-center gap-2 text-sm">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
          <strong className="font-semibold tabular-nums">{total.toLocaleString("pt-BR")}</strong>
          <span className="text-muted-foreground">ETFs encontrados</span>
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
  sufixo = "",
}: {
  rotulo: string;
  valor: [number, number];
  aoMudar: (v: [number, number]) => void;
  min: number;
  max: number;
  passo: number;
  casas?: number;
  sufixo?: string;
}) {
  const fmt = (v: number) =>
    `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}${sufixo}`;
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-baseline justify-between gap-2">
        <span className="t-label">{rotulo}</span>
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
