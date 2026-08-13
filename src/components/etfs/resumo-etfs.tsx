import { ArrowDownRight, ArrowUpRight, Coins, Layers } from "lucide-react";
import { TextoTruncado } from "@/components/texto-truncado";
import { Sparkline } from "@/components/cotacoes/sparkline";
import {
  corVar,
  fmtCompacto,
  fmtMoeda,
  fmtPct,
  fmtPctSimples,
} from "@/components/etfs/formatos-etf";
import type { LinhaEtf, ResumoIbovEtf } from "@/lib/etfs-base";

function Card({
  titulo,
  children,
  aoClicar,
}: {
  titulo: string;
  children: React.ReactNode;
  aoClicar?: () => void;
}) {
  const conteudo = (
    <>
      <TextoTruncado as="p" className="t-label block" passivo>
        {titulo}
      </TextoTruncado>
      <div className="mt-bloco">{children}</div>
    </>
  );
  if (!aoClicar) return <div className="panel p-cartao min-w-0">{conteudo}</div>;
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="panel min-w-0 p-cartao text-left transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {conteudo}
    </button>
  );
}

function Destaque({
  linha,
  valor,
  icone,
}: {
  linha: LinhaEtf | null;
  valor: string;
  icone: React.ReactNode;
}) {
  if (!linha) return <p className="t-body-sm text-muted-foreground">—</p>;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <TextoTruncado as="p" className="t-ticker font-display block">
          {linha.ticker}
        </TextoTruncado>
        <TextoTruncado as="p" className="t-subtexto block">
          {fmtMoeda(linha.preco)}
        </TextoTruncado>
      </div>
      <span className="t-num inline-flex shrink-0 items-center gap-1 font-semibold">
        {icone}
        {valor}
      </span>
    </div>
  );
}

/** Faixa de cards do topo: Ibovespa, maior alta, maior baixa e maior patrimônio. */
export function ResumoEtfs({
  ibovespa,
  maiorAlta,
  maiorBaixa,
  maiorPatrimonio,
  maiorDy,
  aoSelecionar,
}: {
  ibovespa: ResumoIbovEtf | null;
  maiorAlta: LinhaEtf | null;
  maiorBaixa: LinhaEtf | null;
  maiorPatrimonio: LinhaEtf | null;
  maiorDy: LinhaEtf | null;
  aoSelecionar: (l: LinhaEtf) => void;
}) {
  const positivo = (ibovespa?.variacaoPercent ?? 0) >= 0;
  return (
    <div className="grid gap-secao sm:grid-cols-2 xl:grid-cols-5">
      <Card titulo="Índice Ibovespa">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-xl leading-none tabular-nums">
              {ibovespa?.valor
                ? ibovespa.valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
                : "—"}
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs">
              <span
                className={`font-semibold tabular-nums ${corVar(ibovespa?.variacaoPercent ?? null)}`}
              >
                {fmtPct(ibovespa?.variacaoPercent ?? null)}
              </span>
              <span className="text-muted-foreground">
                12m{" "}
                <span className={corVar(ibovespa?.variacao12m ?? null)}>
                  {fmtPct(ibovespa?.variacao12m ?? null)}
                </span>
              </span>
            </p>
          </div>
          <Sparkline serie={ibovespa?.spark ?? []} positivo={positivo} largura={92} altura={32} />
        </div>
      </Card>

      <Card
        titulo="Maior alta do dia"
        aoClicar={maiorAlta ? () => aoSelecionar(maiorAlta) : undefined}
      >
        <Destaque
          linha={maiorAlta}
          valor={fmtPct(maiorAlta?.variacaoPercent ?? null)}
          icone={<ArrowUpRight className="size-4 text-positive" />}
        />
      </Card>

      <Card
        titulo="Maior baixa do dia"
        aoClicar={maiorBaixa ? () => aoSelecionar(maiorBaixa) : undefined}
      >
        <Destaque
          linha={maiorBaixa}
          valor={fmtPct(maiorBaixa?.variacaoPercent ?? null)}
          icone={<ArrowDownRight className="size-4 text-negative" />}
        />
      </Card>

      <Card
        titulo="Maior patrimônio"
        aoClicar={maiorPatrimonio ? () => aoSelecionar(maiorPatrimonio) : undefined}
      >
        <Destaque
          linha={maiorPatrimonio}
          valor={fmtCompacto(maiorPatrimonio?.capitalizacao ?? null)}
          icone={<Layers className="size-4 text-primary" />}
        />
      </Card>

      <Card
        titulo="Maior dividend yield"
        aoClicar={maiorDy ? () => aoSelecionar(maiorDy) : undefined}
      >
        <Destaque
          linha={maiorDy}
          valor={fmtPctSimples(maiorDy?.dy12 ?? null, 2)}
          icone={<Coins className="size-4 text-primary" />}
        />
      </Card>
    </div>
  );
}
