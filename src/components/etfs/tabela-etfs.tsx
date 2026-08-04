import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Info, Star } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  corVar,
  fmtCompacto,
  fmtMoeda,
  fmtNumero,
  fmtPct,
  fmtPctSimples,
  nomeFundo,
} from "@/components/etfs/formatos-etf";
import { COR_CLASSE_ETF, type LinhaEtf } from "@/lib/etfs-base";
import { useEhMobile, useJanelaVirtual } from "@/lib/fiis-virtualizacao";
import { TextoTruncado } from "@/components/texto-truncado";

export type ColunaEtfId =
  | "var30d"
  | "var12m"
  | "var24m"
  | "var60m"
  | "capitalizacao"
  | "dy12"
  | "dy5a"
  | "cotistas"
  | "volume"
  | "classe"
  | "gestora"
  | "mercado";

export type GrupoColunaEtf = "Rentabilidade" | "Tamanho" | "Proventos" | "Classificação";

export const COLUNAS_ETF: {
  id: ColunaEtfId;
  rotulo: string;
  grupo: GrupoColunaEtf;
  ajuda: string;
}[] = [
  {
    id: "var30d",
    rotulo: "Var. 30d",
    grupo: "Rentabilidade",
    ajuda: "Rentabilidade da cota nos últimos 30 dias.",
  },
  {
    id: "var12m",
    rotulo: "Var. 12m",
    grupo: "Rentabilidade",
    ajuda: "Rentabilidade da cota nos últimos 12 meses.",
  },
  {
    id: "var24m",
    rotulo: "Var. 24m",
    grupo: "Rentabilidade",
    ajuda: "Rentabilidade acumulada da cota nos últimos dois anos.",
  },
  {
    id: "var60m",
    rotulo: "Var. 5 anos",
    grupo: "Rentabilidade",
    ajuda: "Rentabilidade acumulada da cota nos últimos cinco anos.",
  },
  {
    id: "capitalizacao",
    rotulo: "Patrimônio",
    grupo: "Tamanho",
    ajuda: "Capitalização do fundo: soma do valor de mercado de todas as cotas emitidas.",
  },
  {
    id: "volume",
    rotulo: "Volume do dia",
    grupo: "Tamanho",
    ajuda: "Quantidade de cotas negociadas no pregão atual — indicador de liquidez.",
  },
  {
    id: "cotistas",
    rotulo: "Cotistas",
    grupo: "Tamanho",
    ajuda: "Número de investidores que possuem cotas do fundo.",
  },
  {
    id: "dy12",
    rotulo: "Dividend yield",
    grupo: "Proventos",
    ajuda: "Proventos distribuídos nos últimos 12 meses sobre o preço da cota. ETFs de acumulação reinvestem os dividendos e por isso aparecem sem DY.",
  },
  {
    id: "dy5a",
    rotulo: "DY médio 5 anos",
    grupo: "Proventos",
    ajuda: "Média anual do dividend yield nos últimos cinco anos.",
  },
  {
    id: "classe",
    rotulo: "Classe",
    grupo: "Classificação",
    ajuda: "Exposição principal do índice replicado pelo ETF.",
  },
  {
    id: "gestora",
    rotulo: "Gestora",
    grupo: "Classificação",
    ajuda: "Instituição responsável pela gestão do fundo.",
  },
  {
    id: "mercado",
    rotulo: "Mercado",
    grupo: "Classificação",
    ajuda: "Bolsa em que o ETF é negociado: B3 ou exterior.",
  },
];

export const GRUPOS_COLUNA_ETF: GrupoColunaEtf[] = [
  "Rentabilidade",
  "Tamanho",
  "Proventos",
  "Classificação",
];

export type OrdemColunaEtf = "ticker" | "preco" | "variacaoPercent" | ColunaEtfId;
export type OrdemEtf = { coluna: OrdemColunaEtf; desc: boolean };

export type PosicaoUsuarioEtf = { precoMedio: number; quantidade: number };

type Props = {
  linhas: LinhaEtf[];
  colunas: ColunaEtfId[];
  ordem: OrdemEtf;
  aoOrdenar: (c: OrdemColunaEtf) => void;
  favoritos: string[];
  aoFavoritar: (t: string) => void;
  posicoes: Map<string, PosicaoUsuarioEtf>;
  aoAbrir: (l: LinhaEtf) => void;
  carregando: boolean;
  inicioRanking: number;
  aoVisiveis?: (tickers: string[]) => void;
};

/** Guarda o preço anterior de cada ticker para acionar o flash de atualização. */
function useFlash(linhas: LinhaEtf[]) {
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
  largura,
}: {
  rotulo: string;
  ajuda: string;
  coluna: OrdemColunaEtf;
  ordem: OrdemEtf;
  aoOrdenar: (c: OrdemColunaEtf) => void;
  alinhamento?: "left" | "right";
  largura?: string;
}) {
  const ativo = ordem.coluna === coluna;
  return (
    <th
      scope="col"
      className={`px-2 py-2 ${largura ?? ""} ${alinhamento === "right" ? "text-right" : "text-left"}`}
    >
      <span
        className={`inline-flex max-w-full items-center gap-1 ${alinhamento === "right" ? "flex-row-reverse" : ""}`}
      >
        <button
          type="button"
          onClick={() => aoOrdenar(coluna)}
          className={`inline-flex items-center gap-1 rounded text-left text-[0.68rem] leading-tight font-semibold tracking-wide uppercase transition-colors hover:text-foreground ${
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
          <TooltipContent className="max-w-[260px] text-xs">{ajuda}</TooltipContent>
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

export function BadgeClasse({ linha }: { linha: LinhaEtf }) {
  return (
    <span
      title={linha.classe}
      className={`inline-block max-w-full truncate rounded-full border px-2 py-0.5 align-middle text-[0.66rem] font-medium ${COR_CLASSE_ETF[linha.classe]}`}
    >
      {linha.classe}
    </span>
  );
}

function BadgeNeutro({ texto }: { texto: string | null }) {
  if (!texto) return <span className="text-muted-foreground">—</span>;
  return (
    <TextoTruncado
      as="span"
      className="inline-block max-w-[160px] truncate rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] text-muted-foreground"
    >
      {texto}
    </TextoTruncado>
  );
}

function Num({ valor, texto, casas }: { valor: number | null; texto?: string; casas?: number }) {
  const conteudo = texto ?? fmtNumero(valor, casas ?? 2);
  const cor =
    valor === null || !Number.isFinite(valor)
      ? "text-muted-foreground"
      : valor < 0
        ? "text-negative"
        : "";
  return <span className={`tabular-nums ${cor}`}>{conteudo}</span>;
}

export function celulaEtf(id: ColunaEtfId, l: LinhaEtf) {
  switch (id) {
    case "var30d":
      return <span className={`tabular-nums ${corVar(l.var30d)}`}>{fmtPct(l.var30d)}</span>;
    case "var12m":
      return <span className={`tabular-nums ${corVar(l.var12m)}`}>{fmtPct(l.var12m)}</span>;
    case "var24m":
      return <span className={`tabular-nums ${corVar(l.var24m)}`}>{fmtPct(l.var24m)}</span>;
    case "var60m":
      return <span className={`tabular-nums ${corVar(l.var60m)}`}>{fmtPct(l.var60m)}</span>;
    case "capitalizacao":
      return <Num valor={l.capitalizacao} texto={fmtCompacto(l.capitalizacao)} />;
    case "volume":
      return <Num valor={l.volume} texto={fmtCompacto(l.volume)} />;
    case "cotistas":
      return (
        <Num
          valor={l.cotistas}
          texto={l.cotistas === null ? "—" : l.cotistas.toLocaleString("pt-BR")}
        />
      );
    case "dy12":
      return <Num valor={l.dy12} texto={fmtPctSimples(l.dy12, 2)} />;
    case "dy5a":
      return <Num valor={l.dy5a} texto={fmtPctSimples(l.dy5a, 2)} />;
    case "classe":
      return <BadgeClasse linha={l} />;
    case "gestora":
      return <BadgeNeutro texto={l.gestora} />;
    case "mercado":
      return <BadgeNeutro texto={l.mercado === "nacional" ? "B3" : (l.pais ?? "Exterior")} />;
  }
}

const ALINHA_ESQUERDA: ColunaEtfId[] = ["classe", "gestora", "mercado"];

const ALTURA_LINHA = 53;
const ALTURA_CARD = 176;

/** Grade principal de ETFs: tabela densa no desktop, cards compactos no mobile. */
export function TabelaEtfs({
  linhas,
  colunas,
  ordem,
  aoOrdenar,
  favoritos,
  aoFavoritar,
  posicoes,
  aoAbrir,
  carregando,
  inicioRanking,
  aoVisiveis,
}: Props) {
  const flashes = useFlash(linhas);
  const visiveis = COLUNAS_ETF.filter((c) => colunas.includes(c.id));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const ehMobile = useEhMobile();
  const janela = useJanelaVirtual(containerRef, linhas.length, ehMobile ? ALTURA_CARD : ALTURA_LINHA);

  const naJanela = useMemo(
    () => linhas.slice(janela.inicio, janela.fim),
    [linhas, janela.inicio, janela.fim],
  );

  const chaveVisivel = naJanela.map((l) => l.ticker).join(",");
  useEffect(() => {
    aoVisiveis?.(chaveVisivel ? chaveVisivel.split(",") : []);
  }, [chaveVisivel, aoVisiveis]);

  if (carregando) {
    return (
      <div className="pilha-bloco p-cartao">
        {Array.from({ length: 12 }).map((_, i) => (
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

  const alturaItem = ehMobile ? ALTURA_CARD : ALTURA_LINHA;
  const espacoTopo = janela.inicio * alturaItem;
  const espacoBase = Math.max(0, linhas.length - janela.fim) * alturaItem;
  const colunasTotais = visiveis.length + 4;

  return (
    <TooltipProvider delayDuration={150}>
      <div ref={containerRef}>
        {!ehMobile ? (
          <div className="hidden md:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <tr className="border-b border-border">
                  <th scope="col" className="w-8 px-1 py-2 text-right text-[0.7rem] text-muted-foreground">
                    #
                  </th>
                  <Cabecalho
                    rotulo="ETF"
                    ajuda="Ticker e nome do fundo. Clique na linha para ver os detalhes."
                    coluna="ticker"
                    ordem={ordem}
                    aoOrdenar={aoOrdenar}
                    alinhamento="left"
                    largura="w-[22%] min-w-0"
                  />
                  <Cabecalho
                    rotulo="Preço atual"
                    ajuda="Última cotação da cota, sincronizada durante o pregão."
                    coluna="preco"
                    ordem={ordem}
                    aoOrdenar={aoOrdenar}
                    largura="w-[11%]"
                  />
                  <Cabecalho
                    rotulo="Variação do dia"
                    ajuda="Diferença frente ao fechamento anterior, em reais e em percentual."
                    coluna="variacaoPercent"
                    ordem={ordem}
                    aoOrdenar={aoOrdenar}
                    largura="w-[11%]"
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
                      largura={ALINHA_ESQUERDA.includes(c.id) ? "w-[13%]" : undefined}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {espacoTopo > 0 ? (
                  <tr aria-hidden style={{ height: espacoTopo }}>
                    <td colSpan={colunasTotais} />
                  </tr>
                ) : null}
                {naJanela.map((l, i) => {
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
                      <td className="px-1 py-2 text-right text-xs text-muted-foreground tabular-nums">
                        {inicioRanking + janela.inicio + i + 1}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Estrela
                            ativo={favoritos.includes(l.ticker)}
                            aoClicar={() => aoFavoritar(l.ticker)}
                            ticker={l.ticker}
                          />
                          <span className="grid size-6 shrink-0 place-items-center rounded bg-primary-soft text-[0.6rem] font-bold">
                            {l.ticker.slice(0, 2)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="t-ticker font-display block">
                              {l.ticker}
                            </span>
                            <TextoTruncado as="span" className="t-subtexto block">
                              {nomeFundo(l)}
                            </TextoTruncado>
                          </span>
                        </div>
                      </td>
                      <td className="truncate px-2 py-2 text-right">
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
                                Sincronização ao vivo indisponível para este ETF — exibindo o último
                                fechamento conhecido.
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
                      <td className={`truncate px-2 py-2 text-right tabular-nums ${corVar(l.variacaoPercent)}`}>
                        <span className="block font-medium">{fmtPct(l.variacaoPercent)}</span>
                        <span className="block text-[0.68rem]">
                          {l.variacao === null ? "" : fmtMoeda(l.variacao)}
                        </span>
                      </td>
                      {visiveis.map((c) => (
                        <td
                          key={c.id}
                          className={`truncate px-2 py-2 text-[0.82rem] whitespace-nowrap ${
                            ALINHA_ESQUERDA.includes(c.id) ? "text-left" : "text-right"
                          }`}
                        >
                          {celulaEtf(c.id, l)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {espacoBase > 0 ? (
                  <tr aria-hidden style={{ height: espacoBase }}>
                    <td colSpan={colunasTotais} />
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          /* Mobile */
          <div className="grid gap-bloco p-cartao md:hidden">
            {espacoTopo > 0 ? <div aria-hidden style={{ height: espacoTopo }} /> : null}
            {naJanela.map((l, i) => {
              const flash = flashes.get(l.ticker);
              const posicao = posicoes.get(l.ticker);
              return (
                <button
                  key={l.ticker}
                  type="button"
                  onClick={() => aoAbrir(l)}
                  className={`rounded-lg border border-border bg-card p-bloco text-left ${
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
                      <span className="min-w-0 flex-1">
                        <span className="t-ticker font-display block">
                          <span className="mr-1 text-xs text-muted-foreground tabular-nums">
                            {inicioRanking + janela.inicio + i + 1}.
                          </span>
                          {l.ticker}
                        </span>
                        <TextoTruncado as="span" className="t-subtexto block">{nomeFundo(l)}</TextoTruncado>
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
                  <div className="mt-bloco grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-xs">
                    <Info2 rotulo="Patrimônio" valor={fmtCompacto(l.capitalizacao)} />
                    <Info2 rotulo="Dividend yield" valor={fmtPctSimples(l.dy12, 2)} />
                    <Info2 rotulo="Var. 12m" valor={fmtPct(l.var12m)} cor={corVar(l.var12m)} />
                    <Info2 rotulo="Var. 5 anos" valor={fmtPct(l.var60m)} cor={corVar(l.var60m)} />
                  </div>
                  <div className="mt-bloco flex flex-wrap items-center gap-1.5">
                    <BadgeClasse linha={l} />
                    {l.gestora ? (
                      <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
                        {l.gestora}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {espacoBase > 0 ? <div aria-hidden style={{ height: espacoBase }} /> : null}
          </div>
        )}
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
