import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ROTULO_CATEGORIA, type CategoriaCripto } from "@/lib/cripto-base";

export type RankingCripto =
  | "capitalizacao"
  | "altas1h"
  | "altas24h"
  | "altas7d"
  | "altas30d"
  | "volume24h"
  | "baixas24h"
  | "queridas";


export const RANKINGS: { id: RankingCripto; rotulo: string }[] = [
  { id: "capitalizacao", rotulo: "Maior capitalização" },
  { id: "altas1h", rotulo: "Maiores altas 1h" },
  { id: "altas24h", rotulo: "Maiores altas 24h" },
  { id: "altas7d", rotulo: "Maiores altas 7 dias" },
  { id: "altas30d", rotulo: "Maiores altas 30 dias" },
  { id: "volume24h", rotulo: "Mais negociadas 24h" },
  { id: "baixas24h", rotulo: "Maiores baixas 24h" },
  { id: "queridas", rotulo: "Mais queridas" },
];

export const CATEGORIAS: CategoriaCripto[] = [
  "reserva",
  "smart-contract",
  "stablecoin",
  "staking",
  "wrapped",
  "meme",
  "defi",
];

export type FaixasCripto = {
  /** Capitalização mínima em milhões de dólares. */
  capMin: number;
  var24h: [number, number];
  var30d: [number, number];
  var12m: [number, number];
};

export const FAIXAS_PADRAO: FaixasCripto = {
  capMin: 0,
  var24h: [-100, 100],
  var30d: [-100, 200],
  var12m: [-100, 500],
};

function LinhaFaixa({
  rotulo,
  valor,
  min,
  max,
  passo,
  aoMudar,
}: {
  rotulo: string;
  valor: [number, number];
  min: number;
  max: number;
  passo: number;
  aoMudar: (v: [number, number]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{rotulo}</span>
        <span className="tabular-nums">
          {valor[0]}% a {valor[1]}%
        </span>
      </div>
      <Slider
        value={valor}
        min={min}
        max={max}
        step={passo}
        onValueChange={(v) => aoMudar([v[0] ?? min, v[1] ?? max])}
      />
    </div>
  );
}

/** Painel de filtros da grade de criptomoedas. */
export function FiltrosCripto({
  categorias,
  alternarCategoria,
  faixas,
  definirFaixas,
  aoLimpar,
}: {
  categorias: CategoriaCripto[];
  alternarCategoria: (c: CategoriaCripto) => void;
  faixas: FaixasCripto;
  definirFaixas: (f: FaixasCripto) => void;
  aoLimpar: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">Categoria</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIAS.map((c) => {
            const ativa = categorias.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={ativa}
                onClick={() => alternarCategoria(c)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  ativa
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {ROTULO_CATEGORIA[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Capitalização mínima</span>
            <span className="tabular-nums">
              {faixas.capMin === 0 ? "sem mínimo" : `US$ ${faixas.capMin} M`}
            </span>
          </div>
          <Slider
            value={[faixas.capMin]}
            min={0}
            max={5000}
            step={50}
            onValueChange={(v) => definirFaixas({ ...faixas, capMin: v[0] ?? 0 })}
          />
        </div>

        <LinhaFaixa
          rotulo="Variação 24h"
          valor={faixas.var24h}
          min={-100}
          max={100}
          passo={1}
          aoMudar={(v) => definirFaixas({ ...faixas, var24h: v })}
        />
        <LinhaFaixa
          rotulo="Variação 30 dias"
          valor={faixas.var30d}
          min={-100}
          max={200}
          passo={5}
          aoMudar={(v) => definirFaixas({ ...faixas, var30d: v })}
        />
        <LinhaFaixa
          rotulo="Variação 12 meses"
          valor={faixas.var12m}
          min={-100}
          max={500}
          passo={10}
          aoMudar={(v) => definirFaixas({ ...faixas, var12m: v })}
        />
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={aoLimpar}>
        Limpar filtros
      </Button>
    </div>
  );
}
