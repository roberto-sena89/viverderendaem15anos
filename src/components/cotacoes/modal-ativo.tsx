import { Link } from "@tanstack/react-router";
import { ExternalLink, Newspaper, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { corVar, fmtPercent, fmtPreco, fmtVar, fmtVolume, posicaoFaixa } from "@/components/cotacoes/formatos";
import { useFavoritos } from "@/lib/favoritos-mercado";
import type { LinhaCotacao } from "@/lib/grade-mercado.functions";
import { useAtivos } from "@/lib/data";

/** Painel de detalhes do ativo: gráfico ampliado, faixa do dia e posição na carteira. */
export function ModalAtivo({
  linha,
  aberto,
  aoFechar,
}: {
  linha: LinhaCotacao | null;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const { ehFavorito, alternar } = useFavoritos();
  const { data: ativos = [] } = useAtivos();
  if (!linha) return null;

  const positivo = (linha.variacaoPercent ?? 0) >= 0;
  const posicao = ativos.find(
    (a) => a.ticker.toUpperCase().replace(/\.SA$/, "") === linha.ticker.toUpperCase(),
  );
  const faixa = posicaoFaixa(linha);
  const favorito = ehFavorito(linha.ticker);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-left">
            <span className="font-display text-xl">{linha.ticker}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-pressed={favorito}
              aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              onClick={() => alternar(linha.ticker)}
            >
              <Star className={`size-4 ${favorito ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </Button>
          </DialogTitle>
          <DialogDescription className="text-left">{linha.nome}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-display text-3xl tabular-nums">{fmtPreco(linha.preco, linha.moeda)}</p>
              <p className={`text-sm tabular-nums ${corVar(linha.variacaoPercent)}`}>
                {fmtVar(linha.variacao)} ({fmtPercent(linha.variacaoPercent)})
              </p>
            </div>
            <Sparkline serie={linha.spark} positivo={positivo} largura={260} altura={72} />
          </div>

          {faixa !== null ? (
            <div>
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>Mín. {fmtPreco(linha.minimo, linha.moeda)}</span>
                <span>Máx. {fmtPreco(linha.maximo, linha.moeda)}</span>
              </div>
              <div className="relative mt-1 h-1.5 rounded-full bg-muted">
                <span
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
                  style={{ left: `${faixa}%` }}
                />
              </div>
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Info rotulo="Fechamento anterior" valor={fmtPreco(linha.fechamentoAnterior, linha.moeda)} />
            <Info rotulo="Volume do dia" valor={fmtVolume(linha.volume)} />
            <Info rotulo="Moeda" valor={linha.moeda} />
            {linha.extra.map((e) => (
              <Info key={e.rotulo} rotulo={e.rotulo} valor={e.valor} />
            ))}
          </dl>

          {posicao ? (
            <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
              <p className="panel-title mb-2">Sua posição</p>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Info rotulo="Quantidade" valor={posicao.quantidade.toLocaleString("pt-BR")} />
                <Info
                  rotulo="Preço médio"
                  valor={posicao.precoMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                />
                <Info
                  rotulo="Saldo atual"
                  valor={(posicao.quantidade * (linha.preco ?? posicao.precoAtual)).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                />
                <Info
                  rotulo="Rentabilidade"
                  valor={fmtPercent(
                    posicao.precoMedio > 0 && linha.preco
                      ? ((linha.preco - posicao.precoMedio) / posicao.precoMedio) * 100
                      : null,
                  )}
                />
              </dl>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/noticias">
                <Newspaper className="size-4" /> Notícias de mercado
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a
                href={`https://finance.yahoo.com/quote/${encodeURIComponent(linha.simbolo)}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink className="size-4" /> Ver gráfico completo
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="truncate text-sm font-medium tabular-nums">{valor}</dd>
    </div>
  );
}
