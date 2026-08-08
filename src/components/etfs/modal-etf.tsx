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
  fmtPct,
  fmtPctSimples,
  nomeFundo,
} from "@/components/etfs/formatos-etf";
import { COR_CLASSE_ETF, type LinhaEtf } from "@/lib/etfs-base";
import { useFavoritos } from "@/lib/favoritos-mercado";
import { TextoTruncado } from "@/components/texto-truncado";
import { useAtivos } from "@/lib/data";

function Item({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/30 p-bloco">
      <TextoTruncado as="p" className="t-label block">
        {rotulo}
      </TextoTruncado>
      <TextoTruncado as="p" className={`t-num mt-0.5 block font-semibold ${cor ?? ""}`}>
        {valor}
      </TextoTruncado>
    </div>
  );
}

/** Detalhes do ETF: cotação, patrimônio, rentabilidades e posição do usuário. */
export function ModalEtf({
  linha,
  aberto,
  aoFechar,
}: {
  linha: LinhaEtf | null;
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
            <span className="font-display text-xl">{linha.ticker}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${COR_CLASSE_ETF[linha.classe]}`}
            >
              {linha.classe}
            </span>
            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
              {linha.mercado === "nacional" ? "B3" : (linha.pais ?? "Exterior")}
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
          <DialogDescription className="t-subtexto text-left">
            {nomeFundo(linha)}
            {linha.gestora ? ` · gestão ${linha.gestora}` : ""}
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
            {linha.precoDefasado ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                último fechamento conhecido
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-bloco sm:grid-cols-4">
            <Item rotulo="Patrimônio" valor={fmtCompacto(linha.capitalizacao)} />
            <Item rotulo="Volume do dia" valor={fmtCompacto(linha.volume)} />
            <Item
              rotulo="Cotistas"
              valor={linha.cotistas === null ? "—" : linha.cotistas.toLocaleString("pt-BR")}
            />
            <Item rotulo="Fechamento anterior" valor={fmtMoeda(linha.fechamentoAnterior)} />
            <Item rotulo="Dividend yield 12m" valor={fmtPctSimples(linha.dy12, 2)} />
            <Item rotulo="DY médio 5 anos" valor={fmtPctSimples(linha.dy5a, 2)} />
            <Item rotulo="Provento por cota (12m)" valor={fmtMoeda(proventoAno)} />
            <Item rotulo="Classe" valor={linha.classe} />
            <Item
              rotulo="Variação 30 dias"
              valor={fmtPct(linha.var30d)}
              cor={corVar(linha.var30d)}
            />
            <Item rotulo="Variação 12m" valor={fmtPct(linha.var12m)} cor={corVar(linha.var12m)} />
            <Item rotulo="Variação 24m" valor={fmtPct(linha.var24m)} cor={corVar(linha.var24m)} />
            <Item
              rotulo="Variação 5 anos"
              valor={fmtPct(linha.var60m)}
              cor={corVar(linha.var60m)}
            />
          </div>

          {posicao ? (
            <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-3 text-sm">
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
                href={`https://investidor10.com.br/etfs/${linha.ticker.toLowerCase()}/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Composição e histórico completo
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://statusinvest.com.br/etfs/${linha.ticker.toLowerCase()}`}
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
