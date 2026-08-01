import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, AlertTriangle, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { Sparkline } from "@/components/cotacoes/sparkline";
import { BadgeCategoria } from "@/components/cripto/badge-categoria";
import { corVar, fmtCompacto, fmtPct, fmtPreco } from "@/components/cripto/formatos-cripto";
import { CelulaVariacao, useDirecaoVariacoes } from "@/components/cripto/variacao-cripto";
import { ehStablecoin, type LinhaCripto } from "@/lib/cripto-base";

export type ColunaOrdem =
  | "rank"
  | "ticker"
  | "precoUsd"
  | "capitalizacao"
  | "volume24h"
  | "variacao1h"
  | "variacao24h"
  | "variacao7d"
  | "variacao30d"
  | "variacao6m"
  | "variacao12m";

export type OrdemCripto = { coluna: ColunaOrdem; desc: boolean };

export type PosicaoCarteira = { precoMedio: number; quantidade: number };

/** Flash sutil de cotação: verde ao subir, vermelho ao cair (some em ~1,6s). */
export function useFlashPrecos(linhas: LinhaCripto[]) {
  const [flash, setFlash] = useState<Record<string, "alta" | "baixa">>({});
  const anteriores = useRef<Record<string, number>>({});

  useEffect(() => {
    const novos: Record<string, "alta" | "baixa"> = {};
    for (const l of linhas) {
      if (l.precoUsd === null) continue;
      const anterior = anteriores.current[l.id];
      if (anterior !== undefined && anterior !== l.precoUsd) {
        novos[l.id] = l.precoUsd > anterior ? "alta" : "baixa";
      }
      anteriores.current[l.id] = l.precoUsd;
    }
    if (!Object.keys(novos).length) return;
    setFlash((f) => ({ ...f, ...novos }));
    const id = window.setTimeout(() => {
      setFlash((f) => {
        const copia = { ...f };
        for (const k of Object.keys(novos)) delete copia[k];
        return copia;
      });
    }, 1600);
    return () => window.clearTimeout(id);
  }, [linhas]);

  return flash;
}

/** Variações acompanhadas em tempo real (seta pisca quando o valor muda). */
const CAMPOS_AO_VIVO = ["variacao1h", "variacao24h", "variacao7d"] as const;

const COLUNAS_VAR: {
  id: ColunaOrdem;
  rotulo: string;
  campo: keyof LinhaCripto;
  classe?: string;
}[] = [
  { id: "variacao1h", rotulo: "1h", campo: "variacao1h" },
  { id: "variacao24h", rotulo: "24h", campo: "variacao24h" },
  { id: "variacao7d", rotulo: "7D", campo: "variacao7d" },
  { id: "variacao30d", rotulo: "30D", campo: "variacao30d", classe: "hidden xl:table-cell" },
  { id: "variacao6m", rotulo: "6M", campo: "variacao6m", classe: "hidden 2xl:table-cell" },
  { id: "variacao12m", rotulo: "12M", campo: "variacao12m", classe: "hidden 2xl:table-cell" },
];


export function TabelaCripto({
  linhas,
  usdBrl,
  ordem,
  aoOrdenar,
  favoritos,
  aoFavoritar,
  posicoes,
  aoAbrir,
}: {
  linhas: LinhaCripto[];
  usdBrl: number;
  ordem: OrdemCripto;
  aoOrdenar: (c: ColunaOrdem) => void;
  favoritos: string[];
  aoFavoritar: (ticker: string) => void;
  posicoes: Map<string, PosicaoCarteira>;

  aoAbrir: (l: LinhaCripto) => void;
}) {
  const flash = useFlashPrecos(linhas);
  const direcao = useDirecaoVariacoes(linhas, CAMPOS_AO_VIVO);

  // Rolagem horizontal: sombra na coluna fixa quando há conteúdo escondido à esquerda
  const rolagem = useRef<HTMLDivElement>(null);
  const [inicio, setInicio] = useState(true);
  const [fim, setFim] = useState(false);

  const aoRolar = () => {
    const el = rolagem.current;
    if (!el) return;
    setInicio(el.scrollLeft <= 4);
    setFim(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    aoRolar();
  }, [linhas.length]);

  const sombra = inicio ? "" : "shadow-[8px_0_12px_-8px_rgba(0,0,0,0.55)]";


  const Cabecalho = ({
    coluna,
    children,
    className,
  }: {
    coluna?: ColunaOrdem;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={`px-2 py-2 leading-tight break-words hyphens-auto ${className ?? ""}`}>
      {coluna ? (
        <button
          type="button"
          onClick={() => aoOrdenar(coluna)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {children}
          {ordem.coluna === coluna ? (
            ordem.desc ? (
              <ArrowDown className="size-3" />
            ) : (
              <ArrowUp className="size-3" />
            )
          ) : null}
        </button>
      ) : (
        children
      )}
    </th>
  );

  return (
    <div className="relative w-full">
      {/* Véu à direita: indica que há mais colunas para rolar (some no fim) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-200 ${
          fim ? "opacity-0" : "opacity-100"
        }`}
      />
      <div
        ref={rolagem}
        onScroll={aoRolar}
        tabIndex={0}
        role="region"
        aria-label="Tabela de criptomoedas — role na horizontal para ver mais colunas"
        className="w-full overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] focus:outline-none [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
      >
        <table className="w-full min-w-[880px] table-fixed border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-30 text-[0.68rem] tracking-[0.08em] text-muted-foreground uppercase">
          <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-muted [&>th]:backdrop-blur">
            <Cabecalho
              coluna="rank"
              className="sticky left-0 z-40 w-9 px-1.5 text-center text-[0.6rem] sm:w-11 sm:px-2"
            >
              #
            </Cabecalho>
            <Cabecalho
              coluna="ticker"
              className={`sticky left-9 z-40 w-[152px] px-2 text-left text-[0.62rem] after:absolute after:top-0 after:right-0 after:h-full after:w-px after:bg-border sm:left-11 sm:w-[196px] sm:text-[0.68rem] ${sombra}`}
            >
              Ativo
            </Cabecalho>
            <Cabecalho coluna="precoUsd" className="w-[104px] text-right">
              Preço (US$)
            </Cabecalho>
            <Cabecalho className="w-[104px] text-right">Preço (R$)</Cabecalho>
            {COLUNAS_VAR.map((c, i) => (
              <Cabecalho
                key={c.id}
                coluna={c.id}
                className={`w-[72px] text-center ${i === 0 ? "border-l border-border/70" : ""} ${c.classe ?? ""}`}
              >
                {c.rotulo}
              </Cabecalho>
            ))}
            <Cabecalho coluna="capitalizacao" className="w-[104px] border-l border-border/70 text-center">
              Cap. mercado
            </Cabecalho>
            <Cabecalho coluna="volume24h" className="hidden w-[96px] text-center md:table-cell">
              Vol. 24h
            </Cabecalho>
            <th className="hidden w-[80px] border-b border-border bg-muted px-2 py-2 text-center backdrop-blur sm:table-cell">
              7 dias
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const stable = ehStablecoin(l);
            const brl = l.precoUsd === null ? null : l.precoUsd * usdBrl;
            const favorito = favoritos.includes(l.ticker);
            const posicao = posicoes.get(l.ticker);
            const rentabilidade =
              posicao && posicao.precoMedio > 0 && brl !== null
                ? (brl / posicao.precoMedio - 1) * 100
                : null;

            return (
              <tr
                key={l.id}
                onClick={() => aoAbrir(l)}
                className={`group cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/30 ${
                  posicao ? "bg-primary/[0.04]" : ""
                }`}
              >
                <td
                  className={`sticky left-0 z-10 bg-background px-1.5 py-2.5 text-center text-[0.7rem] text-muted-foreground tabular-nums group-hover:bg-muted/30 sm:px-2 sm:text-xs ${posicao ? "border-l-2 border-l-primary" : ""}`}
                >
                  {l.rank ?? "—"}
                </td>
                <td className={`sticky left-9 z-10 bg-background px-2 py-2.5 after:absolute after:top-0 after:right-0 after:h-full after:w-px after:bg-border/60 group-hover:bg-muted/30 sm:left-11 ${sombra}`}>
                  <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      aria-label={favorito ? `Remover ${l.ticker} dos favoritos` : `Favoritar ${l.ticker}`}
                      aria-pressed={favorito}
                      onClick={(e) => {
                        e.stopPropagation();
                        aoFavoritar(l.ticker);
                      }}
                      className="grid size-5 shrink-0 place-items-center rounded-md hover:bg-muted sm:size-6"
                    >
                      <Star
                        className={`size-3.5 transition-all duration-200 ${
                          favorito ? "scale-110 fill-primary text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                    {l.imagem ? (
                      <img src={l.imagem} alt="" className="size-5 shrink-0 rounded-full sm:size-6" loading="lazy" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-baseline gap-1.5 text-[0.78rem] leading-tight font-semibold sm:text-sm">
                        <span className="truncate">{l.nome}</span>
                        <span className="shrink-0 text-[0.62rem] font-medium tracking-wide text-muted-foreground uppercase sm:text-[0.68rem]">
                          {l.ticker}
                        </span>
                      </p>
                      <div className="mt-0.5 flex items-center gap-1">
                        <BadgeCategoria categoria={l.categoria} rede={l.rede} compacta />
                        {rentabilidade !== null ? (
                          <span className={`text-[0.62rem] tabular-nums ${corVar(rentabilidade)}`}>
                            sua posição {fmtPct(rentabilidade)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  className={`px-2 py-2.5 text-right font-semibold tabular-nums ${
                    flash[l.id] === "alta" ? "flash-alta" : flash[l.id] === "baixa" ? "flash-baixa" : ""
                  }`}
                >
                  {l.precoUsd === null ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <AlertTriangle className="size-3.5 text-amber-400" /> —
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        Sincronização falhou para este ativo.
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    fmtPreco(l.precoUsd, "US$")
                  )}
                </td>
                <td className="px-2 py-2.5 text-right text-muted-foreground tabular-nums">
                  {fmtPreco(brl, "R$")}
                </td>
                {COLUNAS_VAR.map((c, i) => {
                  const v = l[c.campo] as number | null;
                  return (
                    <td
                      key={c.id}
                      className={`px-2 py-2.5 text-center font-medium ${i === 0 ? "border-l border-border/50" : ""} ${c.classe ?? ""}`}
                    >
                      <CelulaVariacao valor={v} stable={stable} movimento={direcao[`${l.id}:${c.id}`]} />
                    </td>
                  );
                })}
                <td className="border-l border-border/50 px-2 py-2.5 text-center text-muted-foreground tabular-nums">
                  {fmtCompacto(l.capitalizacao)}
                </td>
                <td className="hidden px-2 py-2.5 text-center text-muted-foreground tabular-nums md:table-cell">
                  {fmtCompacto(l.volume24h)}
                </td>
                <td className="hidden px-2 py-2.5 text-center sm:table-cell">
                  <div className="flex justify-center">
                    <Sparkline serie={l.spark} positivo={(l.variacao7d ?? 0) >= 0} largura={80} altura={24} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>

  );
}

