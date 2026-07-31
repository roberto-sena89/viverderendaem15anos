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
  nomeEmpresa,
} from "@/components/acoes/formatos-acao";
import { COR_SETOR, corPontuacao, type HistoricoAcao, type LinhaAcao } from "@/lib/acoes-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { useAtivos } from "@/lib/data";

function Item({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <p className="text-[0.68rem] tracking-wide text-muted-foreground uppercase">{rotulo}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${cor ?? ""}`}>{valor}</p>
    </div>
  );
}

/** Detalhes da ação: cotação, fundamentos, valuation e posição do usuário. */
export function ModalAcao({
  linha,
  historico,
  aberto,
  aoFechar,
}: {
  linha: LinhaAcao | null;
  historico?: HistoricoAcao;
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
  const proventoAno = linha.dy12 && linha.preco ? linha.preco * (linha.dy12 / 100) : null;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-left">
            {linha.logo ? (
              <img src={linha.logo} alt="" className="size-7 rounded bg-muted object-contain" />
            ) : null}
            <span className="font-display text-xl">{linha.ticker}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${COR_SETOR[linha.setor]}`}
            >
              {linha.setor}
            </span>
            {linha.pontuacao !== null ? (
              <span
                className={`rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] font-semibold ${corPontuacao(linha.pontuacao)}`}
              >
                Buy and Hold {linha.pontuacao}/100
              </span>
            ) : null}
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
          <DialogDescription className="text-left">
            {nomeEmpresa(linha)}
            {linha.subsetor ? ` · ${linha.subsetor}` : ""}
            {linha.segmento ? ` · ${linha.segmento}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="font-display text-3xl tabular-nums">{fmtMoeda(linha.preco)}</p>
            <p className={`text-sm font-semibold tabular-nums ${corVar(linha.variacaoPercent)}`}>
              {fmtPct(linha.variacaoPercent)}{" "}
              <span className="font-normal">
                ({linha.variacao === null ? "—" : fmtMoeda(linha.variacao)} hoje)
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Item rotulo="Valor de mercado" valor={fmtCompacto(linha.valorMercado)} />
            <Item rotulo="P/L" valor={fmtNumero(linha.pl, 2)} />
            <Item rotulo="P/VP" valor={fmtNumero(linha.pvp, 2)} />
            <Item rotulo="EV/EBIT" valor={fmtNumero(linha.evEbit, 2)} />
            <Item rotulo="Dividend yield 12m" valor={fmtPctSimples(linha.dy12, 2)} />
            <Item rotulo="DY médio 5 anos" valor={fmtPctSimples(historico?.dy5a ?? null, 2)} />
            <Item rotulo="Provento por ação (12m)" valor={fmtMoeda(proventoAno)} />
            <Item rotulo="Liquidez diária" valor={fmtCompacto(linha.liquidez)} />
            <Item rotulo="ROE" valor={fmtPctSimples(linha.roe, 1)} />
            <Item rotulo="ROIC" valor={fmtPctSimples(linha.roic, 1)} />
            <Item rotulo="Margem líquida" valor={fmtPctSimples(linha.margemLiquida, 1)} />
            <Item rotulo="Margem EBIT" valor={fmtPctSimples(linha.margemEbit, 1)} />
            <Item rotulo="Patrimônio líquido" valor={fmtCompacto(linha.patrimonio)} />
            <Item rotulo="Lucro (12m)" valor={fmtCompacto(linha.lucro)} />
            <Item rotulo="Receita (12m)" valor={fmtCompacto(linha.receita)} />
            <Item rotulo="Dívida/Patrimônio" valor={fmtNumero(linha.dividaPatrimonio, 2)} />
            <Item rotulo="Preço-teto Bazin" valor={fmtMoeda(linha.precoTetoBazin)} />
            <Item
              rotulo="Upside Bazin"
              valor={fmtPct(linha.upsideBazin)}
              cor={corVar(linha.upsideBazin)}
            />
            <Item rotulo="Preço justo Graham" valor={fmtMoeda(linha.precoJustoGraham)} />
            <Item
              rotulo="Upside Graham"
              valor={fmtPct(linha.upsideGraham)}
              cor={corVar(linha.upsideGraham)}
            />
            <Item
              rotulo="Cresc. receita 5 anos"
              valor={fmtPctSimples(linha.crescReceita5a, 1)}
              cor={corVar(linha.crescReceita5a)}
            />
            <Item
              rotulo="Variação 30 dias"
              valor={fmtPct(historico?.var30d ?? null)}
              cor={corVar(historico?.var30d)}
            />
            <Item
              rotulo="Variação 12m"
              valor={fmtPct(historico?.var12m ?? null)}
              cor={corVar(historico?.var12m)}
            />
            <Item
              rotulo="Variação 5 anos"
              valor={fmtPct(historico?.var60m ?? null)}
              cor={corVar(historico?.var60m)}
            />
          </div>

          {posicao ? (
            <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-3 text-sm">
              <p className="font-semibold">Sua posição</p>
              <p className="mt-1 text-muted-foreground">
                {posicao.quantidade.toLocaleString("pt-BR")} ações · preço médio{" "}
                {fmtMoeda(posicao.precoMedio)} ·{" "}
                <span className={corVar(rentabilidade)}>{fmtPct(rentabilidade)}</span> de rentabilidade
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://www.fundamentus.com.br/detalhes.php?papel=${linha.ticker}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Balanços e indicadores completos
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://statusinvest.com.br/acoes/${linha.ticker.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Histórico de proventos
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
