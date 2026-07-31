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
  nomeEmpresa,
} from "@/components/acoes/formatos-acao";
import { COR_SETOR, corPontuacao, type HistoricoAcao, type LinhaAcao } from "@/lib/acoes-base";
import { useEhMobile, useJanelaVirtual } from "@/lib/fiis-virtualizacao";

export type ColunaAcaoId =
  | "var30d"
  | "var12m"
  | "var60m"
  | "valorMercado"
  | "pl"
  | "pvp"
  | "bazin"
  | "upsideBazin"
  | "graham"
  | "upsideGraham"
  | "dy12"
  | "dy5a"
  | "roe"
  | "margemLiquida"
  | "patrimonio"
  | "lucro"
  | "receita"
  | "crescReceita5a"
  | "dividaPatrimonio"
  | "liquidez"
  | "pontuacao"
  | "setor"
  | "subsetor"
  | "segmento";

export type GrupoColuna =
  | "Preço"
  | "Valuation"
  | "Dividendos"
  | "Rentabilidade"
  | "Fundamentos"
  | "Crescimento"
  | "Estrutura de capital"
  | "Qualitativo"
  | "Classificação";

export const COLUNAS_ACAO: {
  id: ColunaAcaoId;
  rotulo: string;
  grupo: GrupoColuna;
  ajuda: string;
}[] = [
  { id: "var30d", rotulo: "Var. 30d", grupo: "Preço", ajuda: "Rentabilidade do papel nos últimos 30 dias." },
  { id: "var12m", rotulo: "Var. 12m", grupo: "Preço", ajuda: "Rentabilidade do papel nos últimos 12 meses." },
  { id: "var60m", rotulo: "Var. 5 anos", grupo: "Preço", ajuda: "Rentabilidade do papel nos últimos cinco anos." },
  {
    id: "valorMercado",
    rotulo: "Valor de mercado",
    grupo: "Valuation",
    ajuda: "Capitalização total da empresa: preço da ação multiplicado pelo número de ações.",
  },
  {
    id: "pl",
    rotulo: "P/L",
    grupo: "Valuation",
    ajuda: "Preço sobre Lucro: quantos anos de lucro atual seriam necessários para pagar o preço da ação. Negativo indica prejuízo.",
  },
  {
    id: "pvp",
    rotulo: "P/VP",
    grupo: "Valuation",
    ajuda: "Preço sobre Valor Patrimonial. Abaixo de 1,00 a ação é negociada por menos do que o patrimônio contábil.",
  },
  {
    id: "bazin",
    rotulo: "Preço-teto Bazin",
    grupo: "Valuation",
    ajuda: "Método Bazin: dividendo anual por ação dividido por um yield mínimo exigido de 6% ao ano.",
  },
  {
    id: "upsideBazin",
    rotulo: "Upside Bazin",
    grupo: "Valuation",
    ajuda: "Potencial de valorização do preço atual até o preço-teto de Bazin.",
  },
  {
    id: "graham",
    rotulo: "Preço justo Graham",
    grupo: "Valuation",
    ajuda: "Método Graham: raiz quadrada de 22,5 × lucro por ação × valor patrimonial por ação.",
  },
  {
    id: "upsideGraham",
    rotulo: "Upside Graham",
    grupo: "Valuation",
    ajuda: "Potencial de valorização do preço atual até o preço justo de Graham.",
  },
  {
    id: "dy12",
    rotulo: "Dividend yield",
    grupo: "Dividendos",
    ajuda: "Proventos distribuídos nos últimos 12 meses sobre o preço atual da ação.",
  },
  {
    id: "dy5a",
    rotulo: "DY médio 5 anos",
    grupo: "Dividendos",
    ajuda: "Média anual do dividend yield nos últimos cinco anos.",
  },
  {
    id: "roe",
    rotulo: "ROE",
    grupo: "Rentabilidade",
    ajuda: "Retorno sobre o Patrimônio Líquido: quanto de lucro a empresa gera sobre o capital dos acionistas.",
  },
  {
    id: "margemLiquida",
    rotulo: "Margem líquida",
    grupo: "Rentabilidade",
    ajuda: "Percentual do faturamento que sobra como lucro depois de todos os custos, despesas e impostos.",
  },
  {
    id: "patrimonio",
    rotulo: "Patrimônio líquido",
    grupo: "Fundamentos",
    ajuda: "Valor contábil dos ativos menos as obrigações da empresa.",
  },
  { id: "lucro", rotulo: "Lucro", grupo: "Fundamentos", ajuda: "Lucro líquido dos últimos 12 meses." },
  { id: "receita", rotulo: "Receita", grupo: "Fundamentos", ajuda: "Receita líquida dos últimos 12 meses." },
  {
    id: "crescReceita5a",
    rotulo: "Cresc. receita 5a",
    grupo: "Crescimento",
    ajuda: "Taxa média de crescimento da receita nos últimos cinco anos.",
  },
  {
    id: "dividaPatrimonio",
    rotulo: "Dívida/Patrimônio",
    grupo: "Estrutura de capital",
    ajuda: "Dívida líquida dividida pelo patrimônio líquido. Quanto menor, menos alavancada é a empresa.",
  },
  {
    id: "liquidez",
    rotulo: "Liquidez diária",
    grupo: "Estrutura de capital",
    ajuda: "Volume financeiro médio negociado por dia nos últimos dois meses.",
  },
  {
    id: "pontuacao",
    rotulo: "Pontuação B&H",
    grupo: "Qualitativo",
    ajuda: "Score de 0 a 100 que combina dividendos, ROE, margem líquida, endividamento, crescimento, valuation e liquidez.",
  },
  { id: "setor", rotulo: "Setor", grupo: "Classificação", ajuda: "Setor macro de atuação da empresa." },
  { id: "subsetor", rotulo: "Subsetor", grupo: "Classificação", ajuda: "Refinamento do setor de atuação." },
  { id: "segmento", rotulo: "Segmento", grupo: "Classificação", ajuda: "Segmento específico dentro do subsetor." },
];

export const GRUPOS_COLUNA: GrupoColuna[] = [
  "Preço",
  "Valuation",
  "Dividendos",
  "Rentabilidade",
  "Fundamentos",
  "Crescimento",
  "Estrutura de capital",
  "Qualitativo",
  "Classificação",
];

export type OrdemColunaAcao = "ticker" | "preco" | "variacaoPercent" | ColunaAcaoId;
export type OrdemAcao = { coluna: OrdemColunaAcao; desc: boolean };

export type PosicaoUsuario = { precoMedio: number; quantidade: number };

type Props = {
  linhas: LinhaAcao[];
  historico: Map<string, HistoricoAcao>;
  colunas: ColunaAcaoId[];
  ordem: OrdemAcao;
  aoOrdenar: (c: OrdemColunaAcao) => void;
  favoritos: string[];
  aoFavoritar: (t: string) => void;
  posicoes: Map<string, PosicaoUsuario>;
  selecionados: string[];
  aoSelecionar: (t: string) => void;
  aoAbrir: (l: LinhaAcao) => void;
  carregando: boolean;
  inicioRanking: number;
  aoVisiveis?: (tickers: string[]) => void;
};

/** Guarda o preço anterior de cada ticker para acionar o flash de atualização. */
function useFlash(linhas: LinhaAcao[]) {
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
  coluna: OrdemColunaAcao;
  ordem: OrdemAcao;
  aoOrdenar: (c: OrdemColunaAcao) => void;
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

export function BadgeSetor({ linha }: { linha: LinhaAcao }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[0.68rem] font-medium whitespace-nowrap ${COR_SETOR[linha.setor]}`}
    >
      {linha.setor}
    </span>
  );
}

function BadgeNeutro({ texto }: { texto: string | null }) {
  if (!texto) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-block max-w-[160px] truncate rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
      {texto}
    </span>
  );
}

/** Valores negativos reais em vermelho; ausência de dado em cinza neutro. */
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

export function celulaAcao(id: ColunaAcaoId, l: LinhaAcao, h: HistoricoAcao | undefined) {
  switch (id) {
    case "var30d":
      return <span className={`tabular-nums ${corVar(h?.var30d)}`}>{fmtPct(h?.var30d ?? null)}</span>;
    case "var12m":
      return <span className={`tabular-nums ${corVar(h?.var12m)}`}>{fmtPct(h?.var12m ?? null)}</span>;
    case "var60m":
      return <span className={`tabular-nums ${corVar(h?.var60m)}`}>{fmtPct(h?.var60m ?? null)}</span>;
    case "valorMercado":
      return <Num valor={l.valorMercado} texto={fmtCompacto(l.valorMercado)} />;
    case "pl":
      return <Num valor={l.pl} casas={2} />;
    case "pvp":
      return <Num valor={l.pvp} casas={2} />;
    case "bazin":
      return <Num valor={l.precoTetoBazin} texto={fmtMoeda(l.precoTetoBazin)} />;
    case "upsideBazin":
      return <span className={`tabular-nums ${corVar(l.upsideBazin)}`}>{fmtPct(l.upsideBazin)}</span>;
    case "graham":
      return <Num valor={l.precoJustoGraham} texto={fmtMoeda(l.precoJustoGraham)} />;
    case "upsideGraham":
      return <span className={`tabular-nums ${corVar(l.upsideGraham)}`}>{fmtPct(l.upsideGraham)}</span>;
    case "dy12":
      return <Num valor={l.dy12} texto={fmtPctSimples(l.dy12, 2)} />;
    case "dy5a":
      return <Num valor={h?.dy5a ?? null} texto={fmtPctSimples(h?.dy5a ?? null, 2)} />;
    case "roe":
      return <Num valor={l.roe} texto={fmtPctSimples(l.roe, 1)} />;
    case "margemLiquida":
      return <Num valor={l.margemLiquida} texto={fmtPctSimples(l.margemLiquida, 1)} />;
    case "patrimonio":
      return <Num valor={l.patrimonio} texto={fmtCompacto(l.patrimonio)} />;
    case "lucro":
      return <Num valor={l.lucro} texto={fmtCompacto(l.lucro)} />;
    case "receita":
      return <Num valor={l.receita} texto={fmtCompacto(l.receita)} />;
    case "crescReceita5a":
      return <Num valor={l.crescReceita5a} texto={fmtPctSimples(l.crescReceita5a, 1)} />;
    case "dividaPatrimonio":
      return <Num valor={l.dividaPatrimonio} casas={2} />;
    case "liquidez":
      return <Num valor={l.liquidez} texto={fmtCompacto(l.liquidez)} />;
    case "pontuacao":
      return (
        <span className={`font-semibold tabular-nums ${corPontuacao(l.pontuacao)}`}>
          {l.pontuacao === null ? "—" : l.pontuacao}
        </span>
      );
    case "setor":
      return <BadgeSetor linha={l} />;
    case "subsetor":
      return <BadgeNeutro texto={l.subsetor} />;
    case "segmento":
      return <BadgeNeutro texto={l.segmento} />;
  }
}

const ALINHA_ESQUERDA: ColunaAcaoId[] = ["setor", "subsetor", "segmento"];

const ALTURA_LINHA = 53;
const ALTURA_CARD = 190;

/** Grade principal de ações: tabela densa no desktop, cards compactos no mobile. */
export function TabelaAcoes({
  linhas,
  historico,
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
  const visiveis = COLUNAS_ACAO.filter((c) => colunas.includes(c.id));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const ehMobile = useEhMobile();
  const janela = useJanelaVirtual(containerRef, linhas.length, ehMobile ? ALTURA_CARD : ALTURA_LINHA);

  const naJanela = useMemo(
    () => linhas.slice(janela.inicio, janela.fim),
    [linhas, janela.inicio, janela.fim],
  );

  // Informa ao painel quais papéis estão realmente na tela para que os
  // indicadores históricos sejam pedidos em um único lote.
  const chaveVisivel = naJanela.map((l) => l.ticker).join(",");
  useEffect(() => {
    aoVisiveis?.(chaveVisivel ? chaveVisivel.split(",") : []);
  }, [chaveVisivel, aoVisiveis]);

  if (carregando) {
    return (
      <div className="space-y-2 p-4">
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
          /* table-fixed + larguras proporcionais: as colunas se comprimem em vez
             de gerar barra de rolagem horizontal. */
          <div className="hidden md:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <tr className="border-b border-border">
                  <th scope="col" className="w-8 px-1 py-2 text-right text-[0.7rem] text-muted-foreground">
                    #
                  </th>

                  <Cabecalho
                    rotulo="Ativo"
                    ajuda="Ticker e nome da empresa. Clique na linha para ver os detalhes."
                    coluna="ticker"
                    ordem={ordem}
                    aoOrdenar={aoOrdenar}
                    alinhamento="left"
                    largura="w-[22%] min-w-0"
                  />
                  <Cabecalho
                    rotulo="Preço atual"
                    ajuda="Última cotação negociada, sincronizada durante o pregão."
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
                      <td className="px-1 py-2 text-right text-xs text-muted-foreground tabular-nums">
                        {inicioRanking + janela.inicio + i + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Estrela
                            ativo={favoritos.includes(l.ticker)}
                            aoClicar={() => aoFavoritar(l.ticker)}
                            ticker={l.ticker}
                          />
                          {l.logo ? (
                            <img
                              src={l.logo}
                              alt=""
                              loading="lazy"
                              className="size-6 rounded bg-muted object-contain"
                            />
                          ) : (
                            <span className="grid size-6 shrink-0 place-items-center rounded bg-primary-soft text-[0.6rem] font-bold">
                              {l.ticker.slice(0, 2)}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block font-display text-[0.9rem] leading-tight">{l.ticker}</span>
                            <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
                              {nomeEmpresa(l)}
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
                                Sincronização ao vivo indisponível para este papel — exibindo o último fechamento.
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
                          {celulaAcao(c.id, l, h)}
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
          <div className="grid gap-2 p-3 md:hidden">
            {espacoTopo > 0 ? <div aria-hidden style={{ height: espacoTopo }} /> : null}
            {naJanela.map((l, i) => {
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
                            {inicioRanking + janela.inicio + i + 1}.
                          </span>
                          {l.ticker}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{nomeEmpresa(l)}</span>
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
                    <Info2 rotulo="P/L" valor={fmtNumero(l.pl, 2)} />
                    <Info2 rotulo="P/VP" valor={fmtNumero(l.pvp, 2)} />
                    <Info2 rotulo="ROE" valor={fmtPctSimples(l.roe, 1)} />
                    <Info2 rotulo="Valor de mercado" valor={fmtCompacto(l.valorMercado)} />
                    <Info2 rotulo="Var. 12m" valor={fmtPct(h?.var12m ?? null)} cor={corVar(h?.var12m)} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <BadgeSetor linha={l} />
                    {l.pontuacao !== null ? (
                      <span
                        className={`rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] font-semibold ${corPontuacao(l.pontuacao)}`}
                      >
                        B&H {l.pontuacao}
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
