import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { SimuladorTesouro } from "@/components/tesouro/simulador-tesouro";
import { fmtBRL, fmtData, fmtNum, fmtPct } from "@/components/tesouro/resumo-tesouro";
import {
  corIndexador,
  defTipo,
  rotuloIndexador,
  textoTaxa,
  type LinhaTesouro,
} from "@/lib/tesouro-base";
import { cn } from "@/lib/utils";
import { TextoTruncado } from "@/components/texto-truncado";

/** Detalhes completos de um título público, com simulador integrado. */
export function ModalTitulo({
  linha,
  cdi,
  posicao,
  aberto,
  aoFechar,
}: {
  linha: LinhaTesouro | null;
  cdi: number | null;
  posicao?: number;
  aberto: boolean;
  aoFechar: () => void;
}) {
  if (!linha) return null;
  const def = defTipo(linha.tipo);
  const serie = linha.serie.map((p) => p.preco);
  const variacao =
    serie.length > 1 ? ((serie[serie.length - 1] - serie[0]) / serie[0]) * 100 : null;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                corIndexador(linha.indexador),
              )}
            >
              {rotuloIndexador(linha.indexador)}
            </span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {def.sigla}
            </span>
            {posicao ? (
              <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                {fmtBRL(posicao)} na sua carteira
              </span>
            ) : null}
          </div>
          <DialogTitle className="t-card-title text-left">{linha.nome}</DialogTitle>
          <DialogDescription className="t-subtexto text-left">{def.explicacao}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-bloco sm:grid-cols-4">
          <Bloco rotulo="Rentabilidade" valor={textoTaxa(linha)} destaque />
          <Bloco rotulo="Vencimento" valor={fmtData(linha.vencimento)} />
          <Bloco rotulo="Preço unitário" valor={fmtBRL(linha.precoCompra)} />
          <Bloco rotulo="Investimento mínimo" valor={fmtBRL(linha.investimentoMinimo)} />
        </div>

        <Tabs defaultValue="simulador">
          <TabsList>
            <TabsTrigger value="simulador">Simulador</TabsTrigger>
            <TabsTrigger value="dados">Dados do título</TabsTrigger>
          </TabsList>

          <TabsContent value="simulador" className="mt-4">
            <SimuladorTesouro linha={linha} cdi={cdi} />
          </TabsContent>

          <TabsContent value="dados" className="mt-secao pilha-bloco">
            {serie.length > 1 ? (
              <div className="rounded-xl border border-border bg-card p-cartao">
                <div className="flex items-center justify-between t-caption">
                  <span>Preço unitário nos últimos 18 meses</span>
                  <span className={variacao && variacao < 0 ? "text-negative" : "text-positive"}>
                    {variacao === null ? "—" : `${variacao > 0 ? "+" : ""}${fmtNum(variacao)}%`}
                  </span>
                </div>
                <Sparkline
                  serie={serie}
                  positivo={(variacao ?? 0) >= 0}
                  largura={640}
                  altura={120}
                  className="mt-2 w-full"
                />
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <Dado rotulo="Tipo" valor={def.rotulo} />
              <Dado rotulo="Indexador" valor={rotuloIndexador(linha.indexador)} />
              <Dado
                rotulo="Pagamento"
                valor={linha.jurosSemestrais ? "Cupons semestrais" : "No vencimento"}
              />
              <Dado rotulo="Taxa de compra" valor={fmtPct(linha.taxaCompra)} />
              <Dado rotulo="Taxa de venda" valor={fmtPct(linha.taxaVenda)} />
              <Dado rotulo="Preço de venda" valor={fmtBRL(linha.precoVenda)} />
              <Dado rotulo="Prazo restante" valor={`${fmtNum(linha.anosAteVencimento, 1)} anos`} />
              <Dado rotulo="Preços de" valor={fmtData(linha.dataBase)} />
              <Dado
                rotulo="Estimativa nominal"
                valor={
                  linha.rentabilidadeEstimada === null
                    ? "—"
                    : `${fmtPct(linha.rentabilidadeEstimada)} a.a.`
                }
              />
            </dl>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Bloco({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-bloco">
      <TextoTruncado as="p" className="t-label block">
        {rotulo}
      </TextoTruncado>
      <TextoTruncado
        as="p"
        className={`t-num mt-0.5 block font-semibold ${destaque ? "text-primary" : ""}`}
      >
        {valor}
      </TextoTruncado>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="t-label">{rotulo}</dt>
      <TextoTruncado as="dd" className="font-medium tabular-nums block">
        {valor}
      </TextoTruncado>
    </div>
  );
}
