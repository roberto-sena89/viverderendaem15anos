import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Info, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

export type ColunaId =
  | "patrimonio"
  | "pvp"
  | "dy12"
  | "dy5a"
  | "liquidez"
  | "tipo"
  | "var12m"
  | "var24m"
  | "var60m"
  | "segmento";

export const COLUNAS: { id: ColunaId; rotulo: string; ajuda: string; largura?: string }[] = [
  {
    id: "patrimonio",
    rotulo: "Patrimônio líquido",
    ajuda: "Valor total dos ativos do fundo menos suas obrigações.",
  },
  {
    id: "pvp",
    rotulo: "P/VP",
    ajuda: "Preço da cota dividido pelo valor patrimonial por cota. Abaixo de 1 indica cota negociada com desconto.",
  },
  { id: "dy12", rotulo: "Dividend yield", ajuda: "Proventos distribuídos nos últimos 12 meses sobre o preço atual." },
  { id: "dy5a", rotulo: "DY médio 5 anos", ajuda: "Média anual do dividend yield nos últimos cinco anos." },
  { id: "liquidez", rotulo: "Liquidez diária", ajuda: "Volume financeiro médio negociado por dia." },
  { id: "tipo", rotulo: "Tipo", ajuda: "Classificação do fundo: tijolo, papel, misto, FOF, FI-Infra, FIP e outros." },
  { id: "var12m", rotulo: "Var. 12m", ajuda: "Rentabilidade da cota nos últimos 12 meses (sem proventos)." },
  { id: "var24m", rotulo: "Var. 24m", ajuda: "Rentabilidade da cota nos últimos 24 meses (sem proventos)." },
  { id: "var60m", rotulo: "Var. 5 anos", ajuda: "Rentabilidade da cota nos últimos cinco anos (sem proventos)." },
  { id: "segmento", rotulo: "Segmento", ajuda: "Área de atuação dos imóveis ou ativos do fundo." },
];

export type OrdemColuna = "ticker" | "preco" | "variacaoPercent" | ColunaId;
export type Ordem = { coluna: OrdemColuna; desc: boolean };

export type PosicaoUsuario = { precoMedio: number; quantidade: number };

type Props = {
  linhas: LinhaFii[];
  historico: Map<string, HistoricoFii>;
  colunas: ColunaId[];
  ordem: Ordem;
  aoOrdenar: (c: OrdemColuna) => void;
  favoritos: string[];
  aoFavoritar: (t: string) => void;
  posicoes: Map<string, PosicaoUsuario>;
  selecionados: string[];
  aoSelecionar: (t: string) => void;
  aoAbrir: (l: LinhaFii) => void;
  carregando: boolean;
  inicioRanking: number;
};

/** Guarda o preço anterior de cada ticker para acionar o flash de atualização. */
function useFlash(linhas: LinhaFii[]) {
  const anterior = useRef(new Map<string, number>());
  const flashes = useMemo(() => {
    const mapa = new Map<string, "alta" | "baixa">();
    for (const l of linhas) {
      const antes = anterior.current.get(l.ticker);
      if (l.preco !== null && antes !== undefined && antes !== l.preco) {
        mapa.set(l.ticker, l.preco > antes ? "alta" : "baixa");
      }
    }
    return mapa;
  }, [linhas]);

  useEffect(() => {
    for (const l of linhas) if (l.preco !== null) anterior.current.set(l.ticker, l.preco);
  }, [linhas]);

  return flashes;
}

function Cabecalho({
  rotulo,
  ajuda,
  coluna,
  ordem,
  aoOrdenar,
  alinhamento = "right",
}: {
  rotulo: string;
  ajuda: string;
  coluna: OrdemColuna;
  ordem: Ordem;
  aoOrdenar: (c: OrdemColuna) => void;
  alinhamento?: "left" | "right";
}) {
  const ativo = ordem.coluna === coluna;
  return (
    <th scope="col" className={`px-3 py-2 ${alinhamento === "right" ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-1 ${alinhamento === "right" ? "flex-row-reverse" : ""}`}>
        <button
          type="button"
          onClick={() => aoOrdenar(coluna)}
          className={`inline-flex items-center gap-1 rounded text-[0.7rem] font-semibold tracking-wide uppercase transition-colors hover:text-foreground ${
            ativo ? "text-foreground" : "text-muted-foreground"
          }`}
          aria-label={`Ordenar por ${rotulo}`}
        >
          {rotulo}
          {ativo ? (
            ordem.desc ? (
              <ArrowDown className="size-3" aria-hidden />
            ) : (
              <ArrowUp className="size-3" aria-hidden />
            )
          ) : null}
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={`O que é ${rotulo}`} className="text-muted-foreground/70">
              <Info className="size-3" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs">{ajuda}</TooltipContent>
        </Tooltip>
      </span>
    </th>
  );
}

function Estrela({ ativo, aoClicar, ticker }: { ativo: boolean; aoClicar: () => void; ticker: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        aoClicar();
      }}
      aria-pressed={ativo}
      aria-label={ativo ? `Remover ${ticker} dos favoritos` : `Adicionar ${ticker} aos favoritos`}
      className="shrink-0 rounded p-0.5 transition-transform hover:scale-110"
    >
      <Star
        className={`size-4 transition-colors ${ativo ? "fill-primary text-primary" : "text-muted-foreground/60"}`}
      />
    </button>
  );
}

function BadgeTipo({ linha }: { linha: LinhaFii }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${COR_TIPO[linha.tipo]}`}>
      {linha.tipo}
    </span>
  );
}

function celula(id: ColunaId, l: LinhaFii, h: HistoricoFii | undefined) {
  switch (id) {
    case "patrimonio":
      return <span className="tabular-nums">{fmtCompacto(l.patrimonio)}</span>;
    case "pvp":
      return <span className="tabular-nums">{fmtNumero(l.pvp, 2)}</span>;
    case "dy12":
      return <span className="tabular-nums">{fmtPctSimples(l.dy12, 2)}</span>;
    case "dy5a":
      return <span className="tabular-nums">{fmtPctSimples(h?.dy5a ?? null, 2)}</span>;
    case "liquidez":
      return <span className="tabular-nums">{fmtCompacto(l.liquidez)}</span>;
    case "tipo":
      return <BadgeTipo linha={l} />;
    case "var12m":
      return <span className={`tabular-nums ${corVar(h?.var12m)}`}>{fmtPct(h?.var12m ?? null)}</span>;
    case "var24m":
      return <span className={`tabular-nums ${corVar(h?.var24m)}`}>{fmtPct(h?.var24m ?? null)}</span>;
    case "var60m":
      return <span className={`tabular-nums ${corVar(h?.var60m)}`}>{fmtPct(h?.var60m ?? null)}</span>;
    case "segmento":
      return (
        <span className="inline-block rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
          {l.segmento}
        </span>
      );
  }
}

const ALINHA_ESQUERDA: ColunaId[] = ["tipo", "segmento"];

/** Grade principal: tabela densa no desktop, cards compactos no mobile. */
export function TabelaFiis({
  linhas,
  historico,
  colunas,
  ordem,
  aoOrdenar,
  favoritos,
  aoFavoritar,
  posicoes,
  selecionados,
  aoSelecionar,
  aoAbrir,
  carregando,
  inicioRanking,
}: Props) {
  const flashes = useFlash(linhas);
  const visiveis = COLUNAS.filter((c) => colunas.includes(c.id));

  if (carregando) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
            <Skeleton className="hidden h-4 w-16 lg:block" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      {/* Desktop / tablet */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <tr className="border-b border-border">
              <th scope="col" className="w-10 px-2 py-2 text-left">
                <span className="sr-only">Selecionar</span>
              </th>
              <th scope="col" className="w-10 px-1 py-2 text-right text-[0.7rem] text-muted-foreground">
                #
              </th>
              <Cabecalho
                rotulo="Ativo"
                ajuda="Ticker e nome do fundo. Clique na linha para ver os detalhes."
                coluna="ticker"
                ordem={ordem}
                aoOrdenar={aoOrdenar}
                alinhamento="left"
              />
              <Cabecalho
                rotulo="Preço atual"
                ajuda="Última cotação negociada, sincronizada durante o pregão."
                coluna="preco"
                ordem={ordem}
                aoOrdenar={aoOrdenar}
              />
              <Cabecalho
                rotulo="Variação do dia"
                ajuda="Diferença frente ao fechamento anterior, em reais e em percentual."
                coluna="variacaoPercent"
                ordem={ordem}
                aoOrdenar={aoOrdenar}
              />
              {visiveis.map((c) => (
                <Cabecalho
                  key={c.id}
                  rotulo={c.rotulo}
                  ajuda={c.ajuda}
                  coluna={c.id}
                  ordem={ordem}
                  aoOrdenar={aoOrdenar}
                  alinhamento={ALINHA_ESQUERDA.includes(c.id) ? "left" : "right"}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => {
              const h = historico.get(l.ticker);
              const flash = flashes.get(l.ticker);
              const posicao = posicoes.get(l.ticker);
              const rentabilidade =
                posicao && posicao.precoMedio > 0 && l.preco
                  ? ((l.preco - posicao.precoMedio) / posicao.precoMedio) * 100
                  : null;
              return (
                <tr
                  key={l.ticker}
                  tabIndex={0}
                  onClick={() => aoAbrir(l)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") aoAbrir(l);
                  }}
                  className={`cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none ${
                    posicao ? "border-l-2 border-l-primary" : ""
                  }`}
                >
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selecionados.includes(l.ticker)}
                      onCheckedChange={() => aoSelecionar(l.ticker)}
                      aria-label={`Selecionar ${l.ticker} para comparar`}
                    />
                  </td>
                  <td className="px-1 py-2 text-right text-xs text-muted-foreground tabular-nums">
                    {inicioRanking + i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Estrela
                        ativo={favoritos.includes(l.ticker)}
                        aoClicar={() => aoFavoritar(l.ticker)}
                        ticker={l.ticker}
                      />
                      {l.logo ? (
                        <img src={l.logo} alt="" loading="lazy" className="size-6 rounded bg-muted object-contain" />
                      ) : (
                        <span className="grid size-6 shrink-0 place-items-center rounded bg-primary-soft text-[0.6rem] font-bold">
                          {l.ticker.slice(0, 2)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block font-display text-[0.9rem] leading-tight">{l.ticker}</span>
                        <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
                          {nomeCurto(l)}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      key={`${l.ticker}-${l.preco}`}
                      className={`inline-flex items-center gap-1 rounded px-1 font-medium tabular-nums ${
                        flash === "alta" ? "flash-alta" : flash === "baixa" ? "flash-baixa" : ""
                      }`}
                    >
                      {l.precoDefasado ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span aria-label="Cotação desatualizada">
                              <AlertTriangle className="size-3.5 text-amber-400" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Sincronização ao vivo indisponível para este fundo — exibindo o último fechamento.
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                      {fmtMoeda(l.preco)}
                    </span>
                    {rentabilidade !== null ? (
                      <span className={`block text-[0.68rem] ${corVar(rentabilidade)}`}>
                        sua posição {fmtPct(rentabilidade)}
                      </span>
                    ) : null}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${corVar(l.variacaoPercent)}`}>
                    <span className="block font-medium">{fmtPct(l.variacaoPercent)}</span>
                    <span className="block text-[0.68rem]">{l.variacao === null ? "" : fmtMoeda(l.variacao)}</span>
                  </td>
                  {visiveis.map((c) => (
                    <td
                      key={c.id}
                      className={`px-3 py-2 ${ALINHA_ESQUERDA.includes(c.id) ? "text-left" : "text-right"}`}
                    >
                      {celula(c.id, l, h)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="grid gap-2 p-3 md:hidden">
        {linhas.map((l, i) => {
          const h = historico.get(l.ticker);
          const flash = flashes.get(l.ticker);
          const posicao = posicoes.get(l.ticker);
          return (
            <button
              key={l.ticker}
              type="button"
              onClick={() => aoAbrir(l)}
              className={`rounded-lg border border-border bg-card p-3 text-left ${
                posicao ? "border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Estrela
                    ativo={favoritos.includes(l.ticker)}
                    aoClicar={() => aoFavoritar(l.ticker)}
                    ticker={l.ticker}
                  />
                  <span className="min-w-0">
                    <span className="font-display block text-sm">
                      <span className="mr-1 text-xs text-muted-foreground tabular-nums">
                        {inicioRanking + i + 1}.
                      </span>
                      {l.ticker}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{nomeCurto(l)}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span
                    key={`${l.ticker}-${l.preco}`}
                    className={`block text-base font-semibold tabular-nums ${
                      flash === "alta" ? "flash-alta" : flash === "baixa" ? "flash-baixa" : ""
                    }`}
                  >
                    {fmtMoeda(l.preco)}
                  </span>
                  <span className={`block text-xs font-medium tabular-nums ${corVar(l.variacaoPercent)}`}>
                    {fmtPct(l.variacaoPercent)}
                  </span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-xs">
                <Info2 rotulo="Dividend yield" valor={fmtPctSimples(l.dy12, 2)} />
                <Info2 rotulo="P/VP" valor={fmtNumero(l.pvp, 2)} />
                <Info2 rotulo="Patrimônio" valor={fmtCompacto(l.patrimonio)} />
                <Info2 rotulo="Liquidez" valor={fmtCompacto(l.liquidez)} />
                <Info2 rotulo="DY 5 anos" valor={fmtPctSimples(h?.dy5a ?? null, 2)} />
                <Info2 rotulo="Var. 12m" valor={fmtPct(h?.var12m ?? null)} cor={corVar(h?.var12m)} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <BadgeTipo linha={l} />
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
                  {l.segmento}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function Info2({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <span className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className={`font-medium tabular-nums ${cor ?? ""}`}>{valor}</span>
    </span>
  );
}
