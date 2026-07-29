import { useState } from "react";
import { Coins, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { DeltaChip } from "@/components/panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAtivos, useDividendos } from "@/lib/data";
import { brl, dividendos12m, pct, resumoCarteira, valorAtual } from "@/lib/portfolio";

function Indicador({
  rotulo,
  valor,
  tom = "default",
}: {
  rotulo: string;
  valor: string;
  tom?: "default" | "positive" | "negative";
}) {
  const cor =
    tom === "positive" ? "text-success" : tom === "negative" ? "text-destructive" : "text-foreground";
  return (
    <div className="min-w-0">
      <p className="truncate text-[0.68rem] text-muted-foreground">{rotulo}</p>
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
      className="panel cursor-pointer p-4 text-left transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-center gap-2">
        <Icone className="size-8! shrink-0 text-muted-foreground/70" />
        <p className="truncate text-[0.7rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {titulo}
        </p>
        <span className="ml-auto text-[0.62rem] text-muted-foreground/70">detalhes</span>
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
                    <p className="num mt-1 text-[0.7rem] break-words text-muted-foreground">{l.formula}</p>
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
export function ResumoKpis() {
  const { data: ativos = [] } = useAtivos();
  const { data: proventos = [] } = useDividendos();
  const [aberto, setAberto] = useState<Detalhe | null>(null);

  const resumo = resumoCarteira(ativos);
  const recebidos12m = dividendos12m(proventos);
  const totalProventos = proventos.reduce((s, d) => s + d.valor, 0);
  const yieldOnCost = resumo.totalInvestido > 0 ? (recebidos12m / resumo.totalInvestido) * 100 : 0;
  const rentComProventos =
    resumo.totalInvestido > 0 ? ((resumo.lucroTotal + totalProventos) / resumo.totalInvestido) * 100 : 0;

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
      { rotulo: "Ativos na carteira", valor: String(ativos.length), formula: "contagem de posições ativas" },
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
      { rotulo: "Total histórico", valor: brl(totalProventos, 2), formula: "Σ de todos os proventos" },
      { rotulo: "Média mensal (12M)", valor: brl(recebidos12m / 12, 2), formula: "recebido 12M ÷ 12" },
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
      { rotulo: "Lançamentos", valor: String(proventos.length), formula: "quantidade de proventos registrados" },
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoResumo titulo="Patrimônio total" icone={Wallet} onClick={() => setAberto(detalhePatrimonio)}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="num font-display text-[1.6rem] leading-none font-bold">{brl(resumo.totalAtual, 2)}</p>
            <DeltaChip value={resumo.rentabilidade} />
          </div>
          <div className="mt-3">
            <Indicador rotulo="Valor investido" valor={brl(resumo.totalInvestido, 2)} />
          </div>
        </CartaoResumo>

        <CartaoResumo titulo="Lucro total" icone={PiggyBank} onClick={() => setAberto(detalheLucro)}>
          <p
            className={`num font-display text-[1.6rem] leading-none font-bold ${
              resumo.lucroTotal >= 0 ? "text-success" : "text-destructive"
            }`}
          >
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
          <p className="num font-display text-[1.6rem] leading-none font-bold">{brl(recebidos12m, 2)}</p>
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
            <div>
              <p className="text-[0.68rem] text-muted-foreground">12 meses</p>
              <p
                className={`num font-display text-xl font-bold ${
                  resumo.rentabilidade >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {pct(resumo.rentabilidade, 2)}
              </p>
            </div>
            <div className="border-l border-border pl-3">
              <p className="text-[0.68rem] text-muted-foreground">Total</p>
              <p
                className={`num font-display text-xl font-bold ${
                  resumo.rentabilidade >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {pct(resumo.rentabilidade, 2)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[0.68rem] text-muted-foreground">
            DY da carteira: {pct(resumo.dyCarteira, 2)}
          </p>
        </CartaoResumo>
      </div>

      <PainelDetalhe detalhe={aberto} onClose={() => setAberto(null)} />
    </>
  );
}
