import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  corVar,
  fmtCompacto,
  fmtMoeda,
  fmtPct,
  fmtPctSimples,
  nomeFundo,
} from "@/components/etfs/formatos-etf";
import { COR_CLASSE_ETF, type LinhaEtf } from "@/lib/etfs-base";
import { TextoTruncado } from "@/components/texto-truncado";

const INDICADORES: {
  rotulo: string;
  valor: (l: LinhaEtf) => string;
  cor?: (l: LinhaEtf) => string;
}[] = [
  { rotulo: "Preço atual", valor: (l) => fmtMoeda(l.preco) },
  {
    rotulo: "Variação do dia",
    valor: (l) => fmtPct(l.variacaoPercent),
    cor: (l) => corVar(l.variacaoPercent),
  },
  { rotulo: "Patrimônio", valor: (l) => fmtCompacto(l.capitalizacao) },
  { rotulo: "Volume do dia", valor: (l) => fmtCompacto(l.volume) },
  {
    rotulo: "Cotistas",
    valor: (l) => (l.cotistas === null ? "—" : l.cotistas.toLocaleString("pt-BR")),
  },
  { rotulo: "Dividend yield", valor: (l) => fmtPctSimples(l.dy12, 2) },
  { rotulo: "DY médio 5 anos", valor: (l) => fmtPctSimples(l.dy5a, 2) },
  { rotulo: "Variação 30d", valor: (l) => fmtPct(l.var30d), cor: (l) => corVar(l.var30d) },
  { rotulo: "Variação 12m", valor: (l) => fmtPct(l.var12m), cor: (l) => corVar(l.var12m) },
  { rotulo: "Variação 24m", valor: (l) => fmtPct(l.var24m), cor: (l) => corVar(l.var24m) },
  { rotulo: "Variação 5 anos", valor: (l) => fmtPct(l.var60m), cor: (l) => corVar(l.var60m) },
  { rotulo: "Gestora", valor: (l) => l.gestora ?? "—" },
  { rotulo: "Mercado", valor: (l) => (l.mercado === "nacional" ? "B3" : (l.pais ?? "Exterior")) },
];

/** Comparação lado a lado de até 4 ETFs selecionados na grade. */
export function ComparadorEtfs({
  linhas,
  aberto,
  aoFechar,
}: {
  linhas: LinhaEtf[];
  aberto: boolean;
  aoFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-left">Comparar ETFs</DialogTitle>
        </DialogHeader>

        {linhas.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Selecione ao menos dois ETFs para comparar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="px-2 py-2 text-left text-xs text-muted-foreground uppercase"
                  >
                    Indicador
                  </th>
                  {linhas.map((l) => (
                    <th key={l.ticker} scope="col" className="min-w-0 px-2 py-2 text-right">
                      <span className="t-ticker font-display block">{l.ticker}</span>
                      <TextoTruncado as="span" className="t-subtexto block font-normal">
                        {nomeFundo(l)}
                      </TextoTruncado>
                      <span
                        className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[0.62rem] font-medium ${COR_CLASSE_ETF[l.classe]}`}
                      >
                        {l.classe}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INDICADORES.map((ind) => (
                  <tr key={ind.rotulo} className="border-b border-border/60">
                    <th
                      scope="row"
                      className="px-2 py-2 text-left font-normal text-muted-foreground"
                    >
                      {ind.rotulo}
                    </th>
                    {linhas.map((l) => (
                      <td
                        key={l.ticker}
                        className={`px-2 py-2 text-right font-medium tabular-nums ${ind.cor?.(l) ?? ""}`}
                      >
                        {ind.valor(l)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
