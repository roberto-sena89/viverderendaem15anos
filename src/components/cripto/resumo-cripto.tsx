import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { fmtCompacto, fmtPct, fmtPreco, corVar } from "@/components/cripto/formatos-cripto";
import { TextoTruncado } from "@/components/texto-truncado";
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
      className={`panel min-w-0 rounded-xl p-bloco text-left transition-colors hover:bg-muted/40 ${
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
    (l) =>
      l.categoria !== "stablecoin" && (l.capitalizacao ?? 0) > 50_000_000 && l.variacao24h !== null,
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
      <div className="flex min-w-0 items-center gap-2">
        {l.imagem ? (
          <img src={l.imagem} alt="" className="size-6 shrink-0 rounded-full" loading="lazy" />
        ) : null}
        <TextoTruncado as="span" className="t-ticker min-w-0" texto={l.nome}>
          {l.nome}
        </TextoTruncado>
        <span className="t-caption shrink-0">{l.ticker}</span>
      </div>
      <p className="t-metric-sm mt-1.5">{fmtPreco(l.precoUsd, "US$")}</p>
      <div className="flex items-baseline gap-2">
        <span className="t-num-sm text-muted-foreground">
          {fmtPreco(l.precoUsd === null ? null : l.precoUsd * usdBrl, "R$")}
        </span>
        <span className={`t-num-sm font-medium ${corVar(l.variacao24h)}`}>
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
      <p className="t-label flex items-center gap-1">
        {icone}
        {titulo}
      </p>
      <TextoTruncado as="p" className="t-ticker mt-1" texto={l ? `${l.nome} · ${l.ticker}` : "—"}>
        {l ? `${l.nome} · ${l.ticker}` : "—"}
      </TextoTruncado>
      <p className={`t-num-sm ${corVar(l?.variacao24h ?? null)}`}>
        {fmtPct(l?.variacao24h ?? null)}
      </p>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 gap-bloco sm:grid-cols-3 xl:grid-cols-6">
      {btc ? <Destaque l={btc} /> : null}
      {eth ? <Destaque l={eth} /> : null}

      <Card>
        <p className="t-label flex items-center gap-1">
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
        <p className="t-metric-sm mt-1">
          {dominanciaBtc === null
            ? "—"
            : `${dominanciaBtc.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
        </p>
        <p className="t-num-sm text-muted-foreground">
          Dólar: R${" "}
          {usdBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </Card>

      <Mini titulo="Maior alta 24h" l={maiorAlta} icone={<TrendingUp className="size-3" />} />
      <Mini titulo="Maior baixa 24h" l={maiorBaixa} icone={<TrendingDown className="size-3" />} />

      <Card>
        <p className="t-label">Capitalização total</p>
        <p className="t-metric-sm mt-1">{fmtCompacto(capitalizacaoTotal)}</p>
        <p className="t-num-sm text-muted-foreground">
          {fmtCompacto(capitalizacaoTotal * usdBrl, "R$")}
        </p>
      </Card>
    </div>
  );
}
