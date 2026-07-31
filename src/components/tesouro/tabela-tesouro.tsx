import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtBRL, fmtData, fmtNum } from "@/components/tesouro/resumo-tesouro";
import {
  corIndexador,
  defTipo,
  rotuloIndexador,
  textoTaxa,
  type LinhaTesouro,
} from "@/lib/tesouro-base";
import { cn } from "@/lib/utils";

const anos = (v: number) => (v >= 1 ? `${fmtNum(v, 1)} anos` : `${Math.round(v * 12)} meses`);

/** Grade dos títulos públicos: tabela em telas grandes, cards no mobile. */
export function TabelaTesouro({
  linhas,
  favoritos,
  aoFavoritar,
  aoAbrir,
  posicoes,
}: {
  linhas: LinhaTesouro[];
  favoritos: string[];
  aoFavoritar: (id: string) => void;
  aoAbrir: (linha: LinhaTesouro) => void;
  posicoes: Record<string, number>;
}) {
  if (!linhas.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Nenhum título corresponde aos filtros selecionados.
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-border lg:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="w-[34%] px-3 py-2.5 text-left font-medium">Título</th>
              <th className="w-[16%] px-3 py-2.5 text-right font-medium">Rentabilidade anual</th>
              <th className="w-[13%] px-3 py-2.5 text-right font-medium">Vencimento</th>
              <th className="w-[13%] px-3 py-2.5 text-right font-medium">Preço unitário</th>
              <th className="w-[13%] px-3 py-2.5 text-right font-medium">Mínimo</th>
              <th className="w-[11%] px-3 py-2.5 text-right font-medium">Estimada</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const favorito = favoritos.includes(`TD:${l.id}`);
              const posicao = posicoes[l.id];
              return (
                <tr
                  key={l.id}
                  onClick={() => aoAbrir(l)}
                  className="cursor-pointer border-t border-border/60 transition-colors hover:bg-muted/40"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        aria-pressed={favorito}
                        onClick={(e) => {
                          e.stopPropagation();
                          aoFavoritar(l.id);
                        }}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-amber-400"
                      >
                        <Star className={cn("size-4", favorito && "fill-amber-400 text-amber-400")} />
                      </button>
                      <span
                        className={cn(
                          "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
                          corIndexador(l.indexador),
                        )}
                      >
                        {rotuloIndexador(l.indexador)}
                      </span>
                      <span className="truncate font-medium">{l.nome}</span>
                      {l.jurosSemestrais ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="shrink-0 rounded border border-border px-1 py-0.5 text-[10px] text-muted-foreground">
                              JS
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Paga cupons semestrais</TooltipContent>
                        </Tooltip>
                      ) : null}
                      {posicao ? (
                        <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1 py-0.5 text-[10px] text-primary">
                          Na carteira
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{textoTaxa(l)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    <span className="block">{fmtData(l.vencimento)}</span>
                    <span className="block text-[11px]">{anos(l.anosAteVencimento)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(l.precoCompra)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {fmtBRL(l.investimentoMinimo)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-positive">
                    {l.rentabilidadeEstimada === null ? "—" : `${fmtNum(l.rentabilidadeEstimada)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet */}
      <div className="grid gap-2 lg:hidden">
        {linhas.map((l) => {
          const favorito = favoritos.includes(`TD:${l.id}`);
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => aoAbrir(l)}
              className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                      corIndexador(l.indexador),
                    )}
                  >
                    {rotuloIndexador(l.indexador)}
                  </span>
                  <p className="mt-1 truncate text-sm font-medium">{l.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Vence em {fmtData(l.vencimento)} · {anos(l.anosAteVencimento)}
                  </p>
                </div>
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  onClick={(e) => {
                    e.stopPropagation();
                    aoFavoritar(l.id);
                  }}
                  className="text-muted-foreground"
                >
                  <Star className={cn("size-4", favorito && "fill-amber-400 text-amber-400")} />
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Rentabilidade</p>
                  <p className="font-semibold tabular-nums">{textoTaxa(l)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Preço</p>
                  <p className="tabular-nums">{fmtBRL(l.precoCompra)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mínimo</p>
                  <p className="tabular-nums">{fmtBRL(l.investimentoMinimo)}</p>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{defTipo(l.tipo).sigla}</p>
            </button>
          );
        })}
      </div>
    </>
  );
}
