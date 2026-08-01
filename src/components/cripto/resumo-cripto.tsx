import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { fmtCompacto, fmtPct, fmtPreco, corVar } from "@/components/cripto/formatos-cripto";
import type { LinhaCripto } from "@/lib/cripto-base";

function Card({
  children,
  aoClicar,
  destaque,
}: {
  children: React.ReactNode;
  aoClicar?: () => void;
  destaque?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className={`panel min-w-0 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/40 ${
        destaque ? "border-primary/40" : ""
      }`}
    >
      {children}
    </button>
  );
}

/** Faixa de cards com os indicadores de referência do mercado cripto. */
export function ResumoCripto({
  linhas,
  usdBrl,
  capitalizacaoTotal,
  dominanciaBtc,
  aoAbrir,
}: {
  linhas: LinhaCripto[];
  usdBrl: number;
  capitalizacaoTotal: number;
  dominanciaBtc: number | null;
  aoAbrir: (l: LinhaCripto) => void;
}) {
  const btc = linhas.find((l) => l.id === "bitcoin") ?? null;
  const eth = linhas.find((l) => l.id === "ethereum") ?? null;

  const relevantes = linhas.filter(
    (l) => l.categoria !== "stablecoin" && (l.capitalizacao ?? 0) > 50_000_000 && l.variacao24h !== null,
  );
  const maiorAlta = relevantes.reduce<LinhaCripto | null>(
    (m, l) => (!m || (l.variacao24h ?? 0) > (m.variacao24h ?? 0) ? l : m),
    null,
  );
  const maiorBaixa = relevantes.reduce<LinhaCripto | null>(
    (m, l) => (!m || (l.variacao24h ?? 0) < (m.variacao24h ?? 0) ? l : m),
    null,
  );

  const Destaque = ({ l }: { l: LinhaCripto }) => (
    <Card aoClicar={() => aoAbrir(l)} destaque>
      <div className="flex items-center gap-2">
        {l.imagem ? (
          <img src={l.imagem} alt="" className="size-6 rounded-full" loading="lazy" />
        ) : null}
        <span className="truncate text-sm font-semibold">{l.nome}</span>
        <span className="text-xs text-muted-foreground">{l.ticker}</span>
      </div>
      <p className="mt-1.5 text-lg font-semibold tabular-nums">{fmtPreco(l.precoUsd, "US$")}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {fmtPreco(l.precoUsd === null ? null : l.precoUsd * usdBrl, "R$")}
        </span>
        <span className={`text-xs font-medium tabular-nums ${corVar(l.variacao24h)}`}>
          {fmtPct(l.variacao24h)}
        </span>
      </div>
    </Card>
  );

  const Mini = ({
    titulo,
    l,
    icone,
  }: {
    titulo: string;
    l: LinhaCripto | null;
    icone: React.ReactNode;
  }) => (
    <Card aoClicar={l ? () => aoAbrir(l) : undefined}>
      <p className="flex items-center gap-1 text-[0.68rem] tracking-[0.06em] text-muted-foreground uppercase">
        {icone}
        {titulo}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{l ? `${l.nome} · ${l.ticker}` : "—"}</p>
      <p className={`text-sm tabular-nums ${corVar(l?.variacao24h ?? null)}`}>
        {fmtPct(l?.variacao24h ?? null)}
      </p>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {btc ? <Destaque l={btc} /> : null}
      {eth ? <Destaque l={eth} /> : null}

      <Card>
        <p className="flex items-center gap-1 text-[0.68rem] tracking-[0.06em] text-muted-foreground uppercase">
          Dominância BTC
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-3" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-xs">
              Fatia da capitalização total do mercado cripto representada pelo Bitcoin. Alta
              dominância costuma indicar busca por segurança dentro do próprio mercado.
            </TooltipContent>
          </Tooltip>
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {dominanciaBtc === null ? "—" : `${dominanciaBtc.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Dólar: R$ {usdBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </Card>

      <Mini titulo="Maior alta 24h" l={maiorAlta} icone={<TrendingUp className="size-3" />} />
      <Mini titulo="Maior baixa 24h" l={maiorBaixa} icone={<TrendingDown className="size-3" />} />

      <Card>
        <p className="text-[0.68rem] tracking-[0.06em] text-muted-foreground uppercase">
          Capitalização total
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{fmtCompacto(capitalizacaoTotal)}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {fmtCompacto(capitalizacaoTotal * usdBrl, "R$")}
        </p>
      </Card>
    </div>
  );
}
