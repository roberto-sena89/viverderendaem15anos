import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, AlertTriangle, Star } from "lucide-react";
import { Tooltip as _T0 } from "@/components/ui/tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkline } from "@/components/cotacoes/sparkline";
import { BadgeCategoria } from "@/components/cripto/badge-categoria";
import { corVar, fmtCompacto, fmtPct, fmtPreco } from "@/components/cripto/formatos-cripto";
import { ehStablecoin, type LinhaCripto } from "@/lib/cripto-base";

export type ColunaOrdem =
  | "rank"
  | "ticker"
  | "precoUsd"
  | "capitalizacao"
  | "volume24h"
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

const COLUNAS_VAR: { id: ColunaOrdem; rotulo: string; campo: keyof LinhaCripto }[] = [
  { id: "variacao7d", rotulo: "Var. 7D", campo: "variacao7d" },
  { id: "variacao30d", rotulo: "Var. 30D", campo: "variacao30d" },
  { id: "variacao6m", rotulo: "Var. 6M", campo: "variacao6m" },
  { id: "variacao12m", rotulo: "Var. 12M", campo: "variacao12m" },
];

export function TabelaCripto({
  linhas,
  usdBrl,
  ordem,
  aoOrdenar,
  favoritos,
  aoFavoritar,
  selecionados,
  aoSelecionar,
  posicoes,
  aoAbrir,
}: {
  linhas: LinhaCripto[];
  usdBrl: number;
  ordem: OrdemCripto;
  aoOrdenar: (c: ColunaOrdem) => void;
  favoritos: string[];
  aoFavoritar: (ticker: string) => void;
  selecionados: string[];
  aoSelecionar: (id: string) => void;
  posicoes: Map<string, PosicaoCarteira>;
  aoAbrir: (l: LinhaCripto) => void;
}) {
  const flash = useFlashPrecos(linhas);

  const Cabecalho = ({
    coluna,
    children,
    className,
  }: {
    coluna?: ColunaOrdem;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={`px-2 py-2 whitespace-nowrap ${className ?? ""}`}>
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-sm">
        <thead className="text-[0.68rem] tracking-[0.08em] text-muted-foreground uppercase">
          <tr>
            <Cabecalho coluna="rank" className="sticky left-0 z-20 w-12 bg-muted/60 text-left backdrop-blur">
              #
            </Cabecalho>
            <Cabecalho
              coluna="ticker"
              className="sticky left-12 z-20 min-w-[210px] bg-muted/60 text-left backdrop-blur"
            >
              Ativo
            </Cabecalho>
            <Cabecalho coluna="precoUsd" className="bg-muted/60 text-right">
              Cotação (USD)
            </Cabecalho>
            <Cabecalho className="bg-muted/60 text-right">Cotação (R$)</Cabecalho>

            <Cabecalho coluna="variacao24h" className="bg-muted/60 text-right">
              Var. 24h
            </Cabecalho>
            <Cabecalho coluna="capitalizacao" className="bg-muted/60 text-right">
              Capitalização
            </Cabecalho>
            <Cabecalho coluna="volume24h" className="bg-muted/60 text-right">
              Vol. 24h
            </Cabecalho>
            {COLUNAS_VAR.map((c) => (
              <Cabecalho key={c.id} coluna={c.id} className="bg-muted/60 text-right">
                {c.rotulo}
              </Cabecalho>
            ))}
            <th className="bg-muted/60 px-2 py-2 text-right">7 dias</th>
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
                className={`cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/30 ${
                  posicao ? "bg-primary/[0.04]" : ""
                }`}
              >
                <td
                  className={`sticky left-0 z-10 bg-background px-2 py-2 text-xs text-muted-foreground tabular-nums ${posicao ? "border-l-2 border-l-primary" : ""}`}
                >
                  {l.rank ?? "—"}
                </td>
                <td className="sticky left-12 z-10 min-w-[210px] bg-background px-2 py-2">

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={favorito ? `Remover ${l.ticker} dos favoritos` : `Favoritar ${l.ticker}`}
                      aria-pressed={favorito}
                      onClick={(e) => {
                        e.stopPropagation();
                        aoFavoritar(l.ticker);
                      }}
                      className="grid size-6 shrink-0 place-items-center rounded-md hover:bg-muted"
                    >
                      <Star
                        className={`size-3.5 transition-all duration-200 ${
                          favorito ? "scale-110 fill-primary text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                    {l.imagem ? (
                      <img src={l.imagem} alt="" className="size-6 shrink-0 rounded-full" loading="lazy" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {l.nome} <span className="text-muted-foreground">— {l.ticker}</span>
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
                  className={`px-2 py-2 text-right font-medium tabular-nums ${
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
                <td className="px-2 py-2 text-right tabular-nums">{fmtPreco(brl, "R$")}</td>
                <td className={`px-2 py-2 text-right font-medium tabular-nums ${corVar(l.variacao24h, stable)}`}>
                  {fmtPct(l.variacao24h)}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground tabular-nums">
                  {fmtCompacto(l.capitalizacao)}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground tabular-nums">
                  {fmtCompacto(l.volume24h)}
                </td>
                {COLUNAS_VAR.map((c) => {
                  const v = l[c.campo] as number | null;
                  return (
                    <td key={c.id} className={`px-2 py-2 text-right tabular-nums ${corVar(v, stable)}`}>
                      {fmtPct(v)}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right">
                  <div className="flex justify-end">
                    <Sparkline serie={l.spark} positivo={(l.variacao7d ?? 0) >= 0} largura={80} altura={24} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
