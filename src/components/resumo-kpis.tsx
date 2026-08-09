import { useMemo, useState } from "react";
import { Coins, PiggyBank, Plus, TrendingUp, Wallet } from "lucide-react";
import { DeltaChip } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { DialogTransacao } from "@/components/dialog-transacao";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { retornoPonderado12m } from "@/lib/analise-carteira";
import { chaveTicker, useAtivosAoVivo, useCotacoesTempoReal } from "@/lib/cotacoes-tempo-real";
import { useDividendos } from "@/lib/data";
import { useDesempenho12m } from "@/lib/desempenho-12m";
import { brl, dividendos12m, pct, resumoCarteira, valorAtual } from "@/lib/portfolio";

function Indicador({
  rotulo,
  valor,
  tom = "default",
  serie,
}: {
  rotulo: string;
  valor: string;
  tom?: "default" | "positive" | "negative";
  serie?: "patrimonio" | "investido";
}) {
  const classeSerie =
    serie === "patrimonio" ? "serie-patrimonio" : serie === "investido" ? "serie-investido" : "";
  const cor = serie
    ? classeSerie
    : tom === "positive"
      ? "text-success"
      : tom === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="min-w-0">
      <p className={`truncate text-[0.875rem] text-foreground ${serie ? "rotulo-serie" : ""}`}>
        {rotulo}
      </p>
      <p className={`num truncate text-sm font-semibold ${cor}`}>{valor}</p>
    </div>
  );
}

function CartaoResumo({
  titulo,
  icone: Icone,
  onClick,
  children,
}: {
  titulo: string;
  icone: typeof Wallet;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver detalhes e fórmulas de ${titulo}`}
      className="panel cursor-pointer p-4 text-left transition-[box-shadow,border-color] hover:border-primary/60 hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start gap-2">
        <Icone className="size-8! shrink-0 text-foreground" />
        <p className="min-w-0 flex-1 text-[0.875rem] leading-snug font-bold tracking-[0.06em] break-words text-balance text-foreground uppercase">
          {titulo}
        </p>

        <span className="hidden shrink-0 text-[0.8rem] text-foreground sm:inline">detalhes</span>
      </div>

      <div className="mt-3">{children}</div>
    </button>
  );
}

interface Linha {
  rotulo: string;
  valor: string;
  formula?: string;
  tom?: "default" | "positive" | "negative";
}

interface Detalhe {
  titulo: string;
  descricao: string;
  linhas: Linha[];
}

function PainelDetalhe({ detalhe, onClose }: { detalhe: Detalhe | null; onClose: () => void }) {
  return (
    <Dialog open={!!detalhe} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {detalhe && (
          <>
            <DialogHeader>
              <DialogTitle>{detalhe.titulo}</DialogTitle>
              <DialogDescription>{detalhe.descricao}</DialogDescription>
            </DialogHeader>
            <div className="divide-y divide-border rounded-md border border-border">
              {detalhe.linhas.map((l) => (
                <div key={l.rotulo} className="p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">{l.rotulo}</p>
                    <p
                      className={`num text-sm font-semibold ${
                        l.tom === "positive"
                          ? "text-success"
                          : l.tom === "negative"
                            ? "text-destructive"
                            : "text-foreground"
                      }`}
                    >
                      {l.valor}
                    </p>
                  </div>
                  {l.formula && (
                    <p className="num mt-1 text-[0.82rem] break-words text-muted-foreground">
                      {l.formula}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Faixa de indicadores da carteira (padrão Investidor 10). */
export function ResumoKpis({ mostrarLancamento = false }: { mostrarLancamento?: boolean }) {
  const { data: ativos = [] } = useAtivosAoVivo();
  const { data: proventos = [] } = useDividendos();
  const { mapa } = useCotacoesTempoReal();
  const [aberto, setAberto] = useState<Detalhe | null>(null);

  const tickers = useMemo(() => ativos.map((a) => a.ticker), [ativos]);
  const { porTicker } = useDesempenho12m(tickers);
  const ponderado12m = useMemo(() => {
    const retornos = new Map<string, number | null>();
    for (const [ticker, nota] of porTicker) retornos.set(ticker, nota.retorno12m);
    return retornoPonderado12m(ativos, retornos);
  }, [ativos, porTicker]);
  const retorno12m = ponderado12m.retornoPct;

  const resumo = resumoCarteira(ativos);
  const recebidos12m = dividendos12m(proventos);
  const totalProventos = proventos.reduce((s, d) => s + d.valor, 0);
  const yieldOnCost = resumo.totalInvestido > 0 ? (recebidos12m / resumo.totalInvestido) * 100 : 0;
  const rentComProventos =
    resumo.totalInvestido > 0
      ? ((resumo.lucroTotal + totalProventos) / resumo.totalInvestido) * 100
      : 0;

  /** Variação do dia da carteira em R$ e %, com o fechamento anterior por ativo. */
  const variacaoHoje = useMemo(() => {
    let delta = 0;
    let valorCoberto = 0;
    for (const a of ativos) {
      const c = mapa.get(chaveTicker(a.ticker));
      if (!c || c.preco === null || c.preco <= 0 || c.variacaoPercent === null) continue;
      const valor = valorAtual(a);
      if (valor <= 0) continue;
      delta += (valor * c.variacaoPercent) / (100 + c.variacaoPercent);
      valorCoberto += valor;
    }
    if (valorCoberto <= 0) return null;
    return { delta, pct: (delta / (valorCoberto - delta)) * 100, cobertura: valorCoberto };
  }, [ativos, mapa]);

  const fmtDelta = (v: number) => `${v >= 0 ? "+" : ""}${brl(v, 2)}`;
  const fmtPctDelta = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`;

  const detalhePatrimonio: Detalhe = {
    titulo: "Patrimônio total",
    descricao: "Soma do valor de mercado de todos os ativos da carteira.",
    linhas: [
      {
        rotulo: "Valor de mercado",
        valor: brl(resumo.totalAtual, 2),
        formula: "Σ (quantidade × preço atual) de cada ativo",
      },
      {
        rotulo: "Valor investido",
        valor: brl(resumo.totalInvestido, 2),
        formula: "Σ (quantidade × preço médio) de cada ativo",
      },
      {
        rotulo: "Variação",
        valor: brl(resumo.totalAtual - resumo.totalInvestido, 2),
        formula: "valor de mercado − valor investido",
        tom: resumo.lucroTotal >= 0 ? "positive" : "negative",
      },
      {
        rotulo: "Ativos na carteira",
        valor: String(ativos.length),
        formula: "contagem de posições ativas",
      },
      ...(variacaoHoje
        ? [
            {
              rotulo: "Variação do dia (mercado)",
              valor: `${fmtPctDelta(variacaoHoje.pct)} · ${fmtDelta(variacaoHoje.delta)}`,
              formula: `Σ quantidade × (preço atual − fechamento anterior) de ${variacaoHoje.cobertura.toLocaleString("pt-BR")} em ativos cotados`,
              tom: variacaoHoje.delta >= 0 ? ("positive" as const) : ("negative" as const),
            },
          ]
        : []),
      {
        rotulo: "Maior posição",
        valor: ativos.length
          ? `${[...ativos].sort((a, b) => valorAtual(b) - valorAtual(a))[0].ticker} · ${brl(
              valorAtual([...ativos].sort((a, b) => valorAtual(b) - valorAtual(a))[0]),
              2,
            )}`
          : "—",
        formula: "ativo com maior valor de mercado",
      },
    ],
  };

  const detalheLucro: Detalhe = {
    titulo: "Lucro total",
    descricao: "Ganho de capital não realizado somado aos proventos já recebidos.",
    linhas: [
      {
        rotulo: "Ganho de capital",
        valor: brl(resumo.lucroTotal, 2),
        formula: `${brl(resumo.totalAtual, 2)} − ${brl(resumo.totalInvestido, 2)}`,
        tom: resumo.lucroTotal >= 0 ? "positive" : "negative",
      },
      {
        rotulo: "Proventos acumulados",
        valor: brl(totalProventos, 2),
        formula: "Σ valor de todos os proventos lançados",
      },
      {
        rotulo: "Resultado total",
        valor: brl(resumo.lucroTotal + totalProventos, 2),
        formula: "ganho de capital + proventos acumulados",
        tom: resumo.lucroTotal + totalProventos >= 0 ? "positive" : "negative",
      },
      {
        rotulo: "Retorno sobre o investido",
        valor: pct(rentComProventos, 2),
        formula: "(ganho de capital + proventos) ÷ valor investido × 100",
        tom: rentComProventos >= 0 ? "positive" : "negative",
      },
    ],
  };

  const detalheProventos: Detalhe = {
    titulo: "Proventos recebidos (12M)",
    descricao: "Dividendos, JCP e rendimentos creditados nos últimos 12 meses.",
    linhas: [
      {
        rotulo: "Recebido nos últimos 12 meses",
        valor: brl(recebidos12m, 2),
        formula: "Σ proventos com data dentro dos 12 meses corridos",
      },
      {
        rotulo: "Total histórico",
        valor: brl(totalProventos, 2),
        formula: "Σ de todos os proventos",
      },
      {
        rotulo: "Média mensal (12M)",
        valor: brl(recebidos12m / 12, 2),
        formula: "recebido 12M ÷ 12",
      },
      {
        rotulo: "Yield on cost (12M)",
        valor: pct(yieldOnCost, 2),
        formula: "recebido 12M ÷ valor investido × 100",
      },
      {
        rotulo: "Projeção 12M (DY dos ativos)",
        valor: brl(resumo.dividendosEstimados12m, 2),
        formula: "Σ (valor de mercado do ativo × DY ÷ 100)",
      },
      {
        rotulo: "Lançamentos",
        valor: String(proventos.length),
        formula: "quantidade de proventos registrados",
      },
    ],
  };

  const detalheRentabilidade: Detalhe = {
    titulo: "Rentabilidade",
    descricao: "Variação percentual da carteira sobre o capital investido.",
    linhas: [
      {
        rotulo: "Rentabilidade (capital)",
        valor: pct(resumo.rentabilidade, 2),
        formula: "(valor de mercado − valor investido) ÷ valor investido × 100",
        tom: resumo.rentabilidade >= 0 ? "positive" : "negative",
      },
      ...(retorno12m !== null
        ? [
            {
              rotulo: "Rentabilidade 12 meses",
              valor: pct(retorno12m, 2),
              formula: "média ponderada pelo valor atual do retorno 12M dos ativos",
              tom: retorno12m >= 0 ? ("positive" as const) : ("negative" as const),
            },
          ]
        : []),
      {
        rotulo: "Rentabilidade com proventos",
        valor: pct(rentComProventos, 2),
        formula: "(ganho de capital + proventos) ÷ valor investido × 100",
        tom: rentComProventos >= 0 ? "positive" : "negative",
      },
      {
        rotulo: "DY da carteira",
        valor: pct(resumo.dyCarteira, 2),
        formula: "proventos estimados 12M ÷ valor de mercado × 100",
      },
      {
        rotulo: "Base de cálculo",
        valor: `${brl(resumo.totalInvestido, 2)} investidos`,
        formula: "Σ (quantidade × preço médio) de cada ativo",
      },
    ],
  };

  return (
    <>
      {mostrarLancamento && (
        <div className="flex justify-start">
          <DialogTransacao>
            <Button
              size="default"
              className="font-display gap-2 bg-primary px-5 text-[15px] font-semibold tracking-[0.01em] text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="size-5" />
              Adicionar Lançamento
            </Button>
          </DialogTransacao>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoResumo
          titulo="Patrimônio total"
          icone={Wallet}
          onClick={() => setAberto(detalhePatrimonio)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="t-metric serie-patrimonio">{brl(resumo.totalAtual, 2)}</p>
            <DeltaChip value={resumo.rentabilidade} />
          </div>
          <div className={`mt-3 ${variacaoHoje ? "grid grid-cols-2 gap-3" : ""}`}>
            <Indicador
              rotulo="Valor investido"
              valor={brl(resumo.totalInvestido, 2)}
              serie="investido"
            />
            {variacaoHoje ? (
              <Indicador
                rotulo="Hoje (mercado)"
                valor={`${fmtDelta(variacaoHoje.delta)} · ${fmtPctDelta(variacaoHoje.pct)}`}
                tom={variacaoHoje.delta >= 0 ? "positive" : "negative"}
              />
            ) : null}
          </div>
        </CartaoResumo>

        <CartaoResumo
          titulo="Lucro total"
          icone={PiggyBank}
          onClick={() => setAberto(detalheLucro)}
        >
          <p className={`t-metric ${resumo.lucroTotal >= 0 ? "text-success" : "text-destructive"}`}>
            {brl(resumo.lucroTotal, 2)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Indicador
              rotulo="Ganho de capital"
              valor={brl(resumo.lucroTotal, 2)}
              tom={resumo.lucroTotal >= 0 ? "positive" : "negative"}
            />
            <Indicador rotulo="Dividendos recebidos" valor={brl(totalProventos, 2)} />
          </div>
        </CartaoResumo>

        <CartaoResumo
          titulo="Proventos recebidos (12M)"
          icone={Coins}
          onClick={() => setAberto(detalheProventos)}
        >
          <p className="t-metric">{brl(recebidos12m, 2)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Indicador rotulo="Total" valor={brl(totalProventos, 2)} />
            <Indicador rotulo="Média mensal" valor={brl(recebidos12m / 12, 2)} />
          </div>
        </CartaoResumo>

        <CartaoResumo
          titulo="Rentabilidade"
          icone={TrendingUp}
          onClick={() => setAberto(detalheRentabilidade)}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="text-[0.875rem] text-foreground">12 meses</p>
              <p
                className={`t-metric-sm truncate ${
                  retorno12m === null
                    ? "text-muted-foreground"
                    : retorno12m >= 0
                      ? "text-success"
                      : "text-destructive"
                }`}
              >
                {retorno12m === null ? "—" : pct(retorno12m, 2)}
              </p>
            </div>
            <div className="min-w-0 border-l border-border pl-3">
              <p className="text-[0.875rem] text-foreground">Total</p>
              <p
                className={`t-metric-sm truncate ${
                  resumo.rentabilidade >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {pct(resumo.rentabilidade, 2)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[0.875rem] text-foreground">
            DY da carteira: {pct(resumo.dyCarteira, 2)}
          </p>
        </CartaoResumo>
      </div>

      <PainelDetalhe detalhe={aberto} onClose={() => setAberto(null)} />
    </>
  );
}
