import { ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  corVar,
  fmtCompacto,
  fmtMoeda,
  fmtNumero,
  fmtPct,
  fmtPctSimples,
  nomeCurto,
} from "@/components/fiis/formatos-fii";
import { COR_TIPO, ROTULO_TIPO, type HistoricoFii, type LinhaFii } from "@/lib/fiis-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { useAtivos } from "@/lib/data";

function Item({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/30 p-bloco">
      <p className="t-label truncate">{rotulo}</p>
      <p className={`t-num mt-0.5 truncate font-semibold ${cor ?? ""}`}>{valor}</p>
    </div>
  );
}

/** Detalhes do fundo: cotação, indicadores, histórico e posição do usuário. */
export function ModalFii({
  linha,
  historico,
  aberto,
  aoFechar,
}: {
  linha: LinhaFii | null;
  historico?: HistoricoFii;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const { ehFavorito, alternar } = useFavoritos();
  const { data: ativos = [] } = useAtivos();
  if (!linha) return null;

  const posicao = ativos.find(
    (a) => a.ticker.toUpperCase().replace(/\.SA$/, "") === linha.ticker.toUpperCase(),
  );
  const rentabilidade =
    posicao && posicao.precoMedio > 0 && linha.preco
      ? ((linha.preco - posicao.precoMedio) / posicao.precoMedio) * 100
      : null;
  const favorito = ehFavorito(linha.ticker);
  const rendaMensal = linha.dy12 && linha.preco ? (linha.preco * (linha.dy12 / 100)) / 12 : null;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-left">
            <span className="font-display text-xl">{linha.ticker}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${COR_TIPO[linha.tipo]}`}
            >
              {ROTULO_TIPO[linha.tipo]}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-pressed={favorito}
              aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              onClick={() => alternar(linha.ticker)}
            >
              <Star
                className={`size-4 ${favorito ? "fill-primary text-primary" : "text-muted-foreground"}`}
              />
            </Button>
          </DialogTitle>
          <DialogDescription className="text-left">
            {nomeCurto(linha)} · {linha.segmento}
          </DialogDescription>
        </DialogHeader>

        <div className="pilha-secao">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="font-display text-3xl tabular-nums">{fmtMoeda(linha.preco)}</p>
            <p className={`text-sm font-semibold tabular-nums ${corVar(linha.variacaoPercent)}`}>
              {fmtPct(linha.variacaoPercent)}{" "}
              <span className="font-normal">
                ({linha.variacao === null ? "—" : fmtMoeda(linha.variacao)} hoje)
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-bloco sm:grid-cols-4">
            <Item rotulo="Patrimônio líquido" valor={fmtCompacto(linha.patrimonio)} />
            <Item rotulo="Valor de mercado" valor={fmtCompacto(linha.valorMercado)} />
            <Item rotulo="P/VP" valor={fmtNumero(linha.pvp, 2)} />
            <Item rotulo="Valor patrimonial/cota" valor={fmtMoeda(linha.vpa)} />
            <Item rotulo="Dividend yield 12m" valor={fmtPctSimples(linha.dy12, 2)} />
            <Item rotulo="DY médio 5 anos" valor={fmtPctSimples(historico?.dy5a ?? null, 2)} />
            <Item rotulo="Provento médio/mês" valor={fmtMoeda(rendaMensal)} />
            <Item rotulo="Liquidez diária" valor={fmtCompacto(linha.liquidez)} />
            <Item
              rotulo="Variação 12m"
              valor={fmtPct(historico?.var12m ?? null)}
              cor={corVar(historico?.var12m)}
            />
            <Item
              rotulo="Variação 24m"
              valor={fmtPct(historico?.var24m ?? null)}
              cor={corVar(historico?.var24m)}
            />
            <Item
              rotulo="Variação 5 anos"
              valor={fmtPct(historico?.var60m ?? null)}
              cor={corVar(historico?.var60m)}
            />
            <Item rotulo="Vacância média" valor={fmtPctSimples(linha.vacancia, 1)} />
          </div>

          {posicao ? (
            <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-bloco text-sm">
              <p className="font-semibold">Sua posição</p>
              <p className="mt-1 text-muted-foreground">
                {posicao.quantidade.toLocaleString("pt-BR")} cotas · preço médio{" "}
                {fmtMoeda(posicao.precoMedio)} ·{" "}
                <span className={corVar(rentabilidade)}>{fmtPct(rentabilidade)}</span> de
                rentabilidade
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://www.fundsexplorer.com.br/funds/${linha.ticker.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Relatórios e histórico de dividendos
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://www.fundamentus.com.br/detalhes.php?papel=${linha.ticker}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Composição do portfólio
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
