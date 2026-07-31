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
import { COR_SETOR, SETORES_ACAO, type SetorAcao } from "@/lib/acoes-base";

export type RankingAcao =
  | "valorMercado"
  | "dy"
  | "graham"
  | "margemLiquida"
  | "pontuacao"
  | "var12m";

export const RANKINGS_ACAO: { id: RankingAcao; rotulo: string }[] = [
  { id: "valorMercado", rotulo: "Valor de mercado" },
  { id: "dy", rotulo: "Dividend yield" },
  { id: "graham", rotulo: "Mais baratas (Graham)" },
  { id: "margemLiquida", rotulo: "Margem líquida" },
  { id: "pontuacao", rotulo: "Pontuação Buy and Hold" },
  { id: "var12m", rotulo: "Maior variação 12m" },
];

export type FaixasAcao = {
  dy: [number, number];
  pl: [number, number];
  pvp: [number, number];
  roe: [number, number];
  margem: [number, number];
};

export const FAIXAS_ACAO_PADRAO: FaixasAcao = {
  dy: [0, 20],
  pl: [0, 40],
  pvp: [0, 10],
  roe: [-20, 50],
  margem: [-30, 60],
};

/** Painel de filtros da grade de ações (desktop e bottom sheet no mobile). */
export function FiltrosAcoes({
  ranking,
  aoTrocarRanking,
  setores,
  aoAlternarSetor,
  subsetor,
  aoTrocarSubsetor,
  subsetores,
  segmento,
  aoTrocarSegmento,
  segmentos,
  faixas,
  aoTrocarFaixas,
  aoLimpar,
  total,
}: {
  ranking: RankingAcao;
  aoTrocarRanking: (r: RankingAcao) => void;
  setores: SetorAcao[];
  aoAlternarSetor: (s: SetorAcao) => void;
  subsetor: string;
  aoTrocarSubsetor: (s: string) => void;
  subsetores: string[];
  segmento: string;
  aoTrocarSegmento: (s: string) => void;
  segmentos: string[];
  faixas: FaixasAcao;
  aoTrocarFaixas: (f: FaixasAcao) => void;
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
          {RANKINGS_ACAO.map((r) => (
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
          Setor
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SETORES_ACAO.map((s) => {
            const ativo = setores.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => aoAlternarSetor(s)}
                aria-pressed={ativo}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  ativo ? COR_SETOR[s] : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5 text-xs">
          <span className="font-semibold tracking-wide text-muted-foreground uppercase">Subsetor</span>
          <Select value={subsetor} onValueChange={aoTrocarSubsetor}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os subsetores" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todos">Todos os subsetores</SelectItem>
              {subsetores.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold tracking-wide text-muted-foreground uppercase">Segmento</span>
          <Select value={segmento} onValueChange={aoTrocarSegmento}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os segmentos" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todos">Todos os segmentos</SelectItem>
              {segmentos.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
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
          valor={faixas.dy}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, dy: v })}
        />
        <FaixaSlider
          rotulo="P/L"
          min={0}
          max={40}
          passo={0.5}
          casas={1}
          valor={faixas.pl}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, pl: v })}
        />
        <FaixaSlider
          rotulo="P/VP"
          min={0}
          max={10}
          passo={0.1}
          casas={1}
          valor={faixas.pvp}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, pvp: v })}
        />
        <FaixaSlider
          rotulo="ROE"
          sufixo="%"
          min={-20}
          max={50}
          passo={1}
          valor={faixas.roe}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, roe: v })}
        />
        <FaixaSlider
          rotulo="Margem líquida"
          sufixo="%"
          min={-30}
          max={60}
          passo={1}
          valor={faixas.margem}
          aoMudar={(v) => aoTrocarFaixas({ ...faixas, margem: v })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="inline-flex items-center gap-2 text-sm">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
          <strong className="font-semibold tabular-nums">{total.toLocaleString("pt-BR")}</strong>
          <span className="text-muted-foreground">ações encontradas</span>
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
