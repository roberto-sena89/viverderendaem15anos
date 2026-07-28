import { Coins, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { DeltaChip } from "@/components/panel";
import { useAtivos, useDividendos } from "@/lib/data";
import { brl, dividendos12m, pct, resumoCarteira } from "@/lib/portfolio";

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
  children,
}: {
  titulo: string;
  icone: typeof Wallet;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2">
        <Icone className="size-4 shrink-0 text-muted-foreground/70" />
        <p className="truncate text-[0.7rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {titulo}
        </p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Faixa de indicadores da carteira (padrão Investidor 10). */
export function ResumoKpis() {
  const { data: ativos = [] } = useAtivos();
  const { data: proventos = [] } = useDividendos();

  const resumo = resumoCarteira(ativos);
  const recebidos12m = dividendos12m(proventos);
  const totalProventos = proventos.reduce((s, d) => s + d.valor, 0);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CartaoResumo titulo="Patrimônio total" icone={Wallet}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="num font-display text-[1.6rem] leading-none font-bold">{brl(resumo.totalAtual, 2)}</p>
          <DeltaChip value={resumo.rentabilidade} />
        </div>
        <div className="mt-3">
          <Indicador rotulo="Valor investido" valor={brl(resumo.totalInvestido, 2)} />
        </div>
      </CartaoResumo>

      <CartaoResumo titulo="Lucro total" icone={PiggyBank}>
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

      <CartaoResumo titulo="Proventos recebidos (12M)" icone={Coins}>
        <p className="num font-display text-[1.6rem] leading-none font-bold">{brl(recebidos12m, 2)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Indicador rotulo="Total" valor={brl(totalProventos, 2)} />
          <Indicador rotulo="Média mensal" valor={brl(recebidos12m / 12, 2)} />
        </div>
      </CartaoResumo>

      <CartaoResumo titulo="Rentabilidade" icone={TrendingUp}>
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
  );
}
