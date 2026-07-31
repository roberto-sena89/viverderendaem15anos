import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkline } from "@/components/cotacoes/sparkline";
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

const INDICADORES: {
  rotulo: string;
  valor: (l: LinhaAcao, h?: HistoricoAcao) => string;
  cor?: (l: LinhaAcao, h?: HistoricoAcao) => string;
}[] = [
  { rotulo: "Preço atual", valor: (l) => fmtMoeda(l.preco) },
  {
    rotulo: "Variação do dia",
    valor: (l) => fmtPct(l.variacaoPercent),
    cor: (l) => corVar(l.variacaoPercent),
  },
  { rotulo: "Valor de mercado", valor: (l) => fmtCompacto(l.valorMercado) },
  { rotulo: "P/L", valor: (l) => fmtNumero(l.pl, 2) },
  { rotulo: "P/VP", valor: (l) => fmtNumero(l.pvp, 2) },
  { rotulo: "Dividend yield", valor: (l) => fmtPctSimples(l.dy12, 2) },
  { rotulo: "DY médio 5 anos", valor: (_l, h) => fmtPctSimples(h?.dy5a ?? null, 2) },
  { rotulo: "ROE", valor: (l) => fmtPctSimples(l.roe, 1) },
  { rotulo: "Margem líquida", valor: (l) => fmtPctSimples(l.margemLiquida, 1) },
  { rotulo: "Dívida/Patrimônio", valor: (l) => fmtNumero(l.dividaPatrimonio, 2) },
  { rotulo: "Preço-teto Bazin", valor: (l) => fmtMoeda(l.precoTetoBazin) },
  {
    rotulo: "Upside Bazin",
    valor: (l) => fmtPct(l.upsideBazin),
    cor: (l) => corVar(l.upsideBazin),
  },
  { rotulo: "Preço justo Graham", valor: (l) => fmtMoeda(l.precoJustoGraham) },
  {
    rotulo: "Upside Graham",
    valor: (l) => fmtPct(l.upsideGraham),
    cor: (l) => corVar(l.upsideGraham),
  },
  {
    rotulo: "Pontuação Buy and Hold",
    valor: (l) => (l.pontuacao === null ? "—" : String(l.pontuacao)),
    cor: (l) => corPontuacao(l.pontuacao),
  },
  {
    rotulo: "Variação 12m",
    valor: (_l, h) => fmtPct(h?.var12m ?? null),
    cor: (_l, h) => corVar(h?.var12m),
  },
  {
    rotulo: "Variação 5 anos",
    valor: (_l, h) => fmtPct(h?.var60m ?? null),
    cor: (_l, h) => corVar(h?.var60m),
  },
];

/** Comparação lado a lado das ações selecionadas na grade. */
export function ComparadorAcoes({
  linhas,
  historico,
  aberto,
  aoFechar,
}: {
  linhas: LinhaAcao[];
  historico: Map<string, HistoricoAcao>;
  aberto: boolean;
  aoFechar: () => void;
}) {
  if (!linhas.length) return null;
  const maxima = Math.max(1, ...linhas.map((l) => Math.abs(historico.get(l.ticker)?.var60m ?? 0)));

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Comparar {linhas.length} ações</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 text-left text-[0.7rem] tracking-wide text-muted-foreground uppercase">
                  Indicador
                </th>
                {linhas.map((l) => (
                  <th key={l.ticker} scope="col" className="px-3 py-2 text-right">
                    <span className="font-display block text-sm">{l.ticker}</span>
                    <span className="block truncate text-[0.68rem] font-normal text-muted-foreground">
                      {nomeEmpresa(l)}
                    </span>
                    <span
                      className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[0.62rem] font-medium ${COR_SETOR[l.setor]}`}
                    >
                      {l.setor}
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
                  Performance (5a · 12m · 30d)
                </th>
                {linhas.map((l) => {
                  const h = historico.get(l.ticker);
                  const serie = [0, h?.var60m ?? 0, h?.var12m ?? 0, h?.var30d ?? 0].map((v) => v / maxima);
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
