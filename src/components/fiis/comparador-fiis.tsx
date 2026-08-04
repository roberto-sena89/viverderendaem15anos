import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { TextoTruncado } from "@/components/texto-truncado";
import {
  corVar,
  fmtCompacto,
  fmtMoeda,
  fmtNumero,
  fmtPct,
  fmtPctSimples,
  nomeCurto,
} from "@/components/fiis/formatos-fii";
import { COR_TIPO, type HistoricoFii, type LinhaFii } from "@/lib/fiis-base";

const INDICADORES: { rotulo: string; valor: (l: LinhaFii, h?: HistoricoFii) => string; cor?: (l: LinhaFii, h?: HistoricoFii) => string }[] = [
  { rotulo: "Preço atual", valor: (l) => fmtMoeda(l.preco) },
  {
    rotulo: "Variação do dia",
    valor: (l) => fmtPct(l.variacaoPercent),
    cor: (l) => corVar(l.variacaoPercent),
  },
  { rotulo: "Patrimônio líquido", valor: (l) => fmtCompacto(l.patrimonio) },
  { rotulo: "P/VP", valor: (l) => fmtNumero(l.pvp, 2) },
  { rotulo: "Dividend yield", valor: (l) => fmtPctSimples(l.dy12, 2) },
  { rotulo: "DY médio 5 anos", valor: (_l, h) => fmtPctSimples(h?.dy5a ?? null, 2) },
  { rotulo: "Liquidez diária", valor: (l) => fmtCompacto(l.liquidez) },
  { rotulo: "Vacância média", valor: (l) => fmtPctSimples(l.vacancia, 1) },
  {
    rotulo: "Variação 12m",
    valor: (_l, h) => fmtPct(h?.var12m ?? null),
    cor: (_l, h) => corVar(h?.var12m),
  },
  {
    rotulo: "Variação 24m",
    valor: (_l, h) => fmtPct(h?.var24m ?? null),
    cor: (_l, h) => corVar(h?.var24m),
  },
  {
    rotulo: "Variação 5 anos",
    valor: (_l, h) => fmtPct(h?.var60m ?? null),
    cor: (_l, h) => corVar(h?.var60m),
  },
];

/** Comparação lado a lado dos fundos selecionados na grade. */
export function ComparadorFiis({
  linhas,
  historico,
  aberto,
  aoFechar,
}: {
  linhas: LinhaFii[];
  historico: Map<string, HistoricoFii>;
  aberto: boolean;
  aoFechar: () => void;
}) {
  if (!linhas.length) return null;
  const maxima = Math.max(
    1,
    ...linhas.map((l) => Math.abs(historico.get(l.ticker)?.var60m ?? 0)),
  );

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Comparar {linhas.length} FIIs</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="t-label py-2 text-left">
                  Indicador
                </th>
                {linhas.map((l) => (
                  <th key={l.ticker} scope="col" className="min-w-0 px-3 py-2 text-right">
                    <TextoTruncado as="span" className="t-ticker block font-display">{l.ticker}</TextoTruncado>
                    <TextoTruncado as="span" className="t-subtexto block font-normal">
                      {nomeCurto(l)}
                    </TextoTruncado>
                    <span
                      className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[0.62rem] font-medium ${COR_TIPO[l.tipo]}`}
                    >
                      {l.tipo}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INDICADORES.map((ind) => (
                <tr key={ind.rotulo} className="border-b border-border/60">
                  <th scope="row" className="py-2 text-left text-xs font-medium text-muted-foreground">
                    {ind.rotulo}
                  </th>
                  {linhas.map((l) => {
                    const h = historico.get(l.ticker);
                    return (
                      <td
                        key={l.ticker}
                        className={`px-3 py-2 text-right tabular-nums ${ind.cor ? ind.cor(l, h) : ""}`}
                      >
                        {ind.valor(l, h)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th scope="row" className="py-3 text-left text-xs font-medium text-muted-foreground">
                  Performance (12m · 24m · 5a)
                </th>
                {linhas.map((l) => {
                  const h = historico.get(l.ticker);
                  const serie = [0, h?.var60m ?? 0, h?.var24m ?? 0, h?.var12m ?? 0].map(
                    (v) => v / maxima,
                  );
                  return (
                    <td key={l.ticker} className="px-3 py-3 text-right">
                      <Sparkline serie={serie} positivo={(h?.var12m ?? 0) >= 0} largura={110} altura={34} />
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
