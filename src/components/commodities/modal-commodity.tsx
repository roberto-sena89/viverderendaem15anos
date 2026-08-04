import { Link } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { corCategoria, mercadoCategoria, rotuloCategoria, CORRELACOES } from "@/lib/commodities-base";
import type { LinhaCommodity } from "@/lib/commodities-base";
import { corVar, fmtDinheiro, fmtVar, type Moeda } from "@/components/commodities/card-commodity";
import { cn } from "@/lib/utils";

/** Detalhes da commodity: gráfico expandido, faixa de 12m e contexto setorial. */
export function ModalCommodity({
  linha,
  usdBrl,
  moeda,
  aberto,
  aoFechar,
}: {
  linha: LinhaCommodity | null;
  usdBrl: number;
  moeda: Moeda;
  aberto: boolean;
  aoFechar: () => void;
}) {
  if (!linha) return null;
  const mercado = mercadoCategoria(linha.categoria);
  const brl = linha.precoUsd === null ? null : linha.precoUsd * usdBrl;
  const correlacao = CORRELACOES[linha.codigo];

  const indicadores = [
    { rotulo: "Fechamento anterior", valor: fmtDinheiro(linha.fechamentoAnterior, "US$") },
    { rotulo: "Mínima 12m", valor: fmtDinheiro(linha.minima12m, "US$") },
    { rotulo: "Máxima 12m", valor: fmtDinheiro(linha.maxima12m, "US$") },
    { rotulo: "Variação 30 dias", valor: fmtVar(linha.variacao30d) },
    { rotulo: "Variação no dia", valor: fmtVar(linha.variacaoDia) },
    { rotulo: "Em reais", valor: fmtDinheiro(brl, "R$") },
  ];

  return (
    <Dialog open={aberto} onOpenChange={(v) => (v ? undefined : aoFechar())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg">{linha.nome}</span>
            <span className="text-sm font-normal text-muted-foreground">{linha.bolsa}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase",
                corCategoria(linha.categoria),
              )}
            >
              {rotuloCategoria(linha.categoria)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="pilha-secao">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-3xl tabular-nums">
                {moeda === "brl" ? fmtDinheiro(brl, "R$") : fmtDinheiro(linha.precoUsd, "US$")}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">/ {linha.unidade}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {moeda === "brl"
                  ? `${fmtDinheiro(linha.precoUsd, "US$")} na origem`
                  : `${fmtDinheiro(brl, "R$")} convertido pelo dólar comercial`}{" "}
                · fonte {linha.fonte}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-lg font-semibold tabular-nums", corVar(linha.variacao12m))}>
                {fmtVar(linha.variacao12m)}
              </p>
              <p className="text-xs text-muted-foreground">Variação em 12 meses</p>
            </div>
          </div>

          <p
            className={cn(
              "rounded-lg border px-3 py-2 text-xs",
              mercado.aberto
                ? "border-positive/30 bg-positive/10 text-positive"
                : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {mercado.rotulo}
          </p>

          <div className="panel p-cartao">
            <p className="panel-title mb-2">Últimos 30 pregões</p>
            <Sparkline
              serie={linha.spark}
              positivo={(linha.variacao30d ?? linha.variacao12m ?? 0) >= 0}
              largura={640}
              altura={140}
              className="w-full"
            />
          </div>

          <div className="grid gap-secao sm:grid-cols-3">
            {indicadores.map((i) => (
              <div key={i.rotulo} className="panel p-bloco">
                <p className="t-label">{i.rotulo}</p>
                <p className="t-num-sm mt-1 font-display">{i.valor}</p>
              </div>
            ))}
          </div>

          <p className="t-body-sm text-muted-foreground">{linha.descricao}</p>

          {correlacao ? (
            <p className="t-caption">
              Ativos correlacionados na B3: <strong>{correlacao.tickers.join(", ")}</strong> — {correlacao.frase}.
            </p>
          ) : null}

          <Link
            to="/noticias"
            search={{ tema: "commodities" }}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Newspaper className="size-4" />
            Ver notícias de commodities
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
