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
import { TextoTruncado } from "@/components/texto-truncado";
import { EstadoVazio } from "@/components/estado-vazio";
import { TabelaResponsiva } from "@/components/tabela-responsiva";
import type { ColunaResponsiva } from "@/lib/colunas-responsivas";

const anos = (v: number) => (v >= 1 ? `${fmtNum(v, 1)} anos` : `${Math.round(v * 12)} meses`);

/**
 * Layout dinâmico de colunas: no tablet (≥769px) a tabela mostra as colunas
 * essenciais; no desktop (≥1024px) entram Mínimo e Estimada.
 */
const COLUNAS_TESOURO: ColunaResponsiva[] = [
  { id: "titulo", rotulo: "Título", alinhamento: "left", peso: 3, essencial: true },
  { id: "rentabilidade", rotulo: "Rentabilidade anual", peso: 2, essencial: true },
  { id: "vencimento", rotulo: "Vencimento", peso: 1.5, essencial: true },
  { id: "preco", rotulo: "Preço unitário", peso: 1.5, essencial: true },
  { id: "minimo", rotulo: "Mínimo", peso: 1.5, visivelDe: "desktop" },
  { id: "estimada", rotulo: "Estimada", peso: 1.5, visivelDe: "desktop" },
];

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
      <EstadoVazio
        titulo="Nenhum título encontrado"
        descricao="Nenhum título do Tesouro corresponde aos filtros selecionados."
      />
    );
  }

  return (
    <>
      {/* Tablet e desktop: tabela com layout de colunas dinâmico */}
      <div className="hidden md:block">
        <TabelaResponsiva
          ariaLabel="Títulos do Tesouro Direto"
          linhas={linhas}
          colunas={COLUNAS_TESOURO}
          chave={(l) => l.id}
          aoClicarLinha={aoAbrir}
          renderizarCelula={(l, coluna) => {
            const favorito = favoritos.includes(`TD:${l.id}`);
            const posicao = posicoes[l.id];
            switch (coluna.id) {
              case "titulo":
                return (
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
                    <TextoTruncado as="span" className="truncate font-medium">
                      {l.nome}
                    </TextoTruncado>
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
                );
              case "rentabilidade":
                return <span className="font-semibold tabular-nums">{textoTaxa(l)}</span>;
              case "vencimento":
                return (
                  <>
                    <span className="block tabular-nums text-muted-foreground">
                      {fmtData(l.vencimento)}
                    </span>
                    <span className="block text-[11px]">{anos(l.anosAteVencimento)}</span>
                  </>
                );
              case "preco":
                return <span className="tabular-nums">{fmtBRL(l.precoCompra)}</span>;
              case "minimo":
                return (
                  <span className="tabular-nums text-muted-foreground">
                    {fmtBRL(l.investimentoMinimo)}
                  </span>
                );
              case "estimada":
                return (
                  <span className="tabular-nums text-positive">
                    {l.rentabilidadeEstimada === null ? "—" : `${fmtNum(l.rentabilidadeEstimada)}%`}
                  </span>
                );
            }
          }}
          className="rounded-xl"
        />
      </div>

      {/* Mobile: cards */}
      <div className="grid gap-bloco md:hidden">
        {linhas.map((l) => {
          const favorito = favoritos.includes(`TD:${l.id}`);
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => aoAbrir(l)}
              className="rounded-xl border border-border bg-card p-cartao text-left transition-colors hover:bg-muted/40"
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
                  <TextoTruncado as="p" className="mt-1 truncate text-sm font-medium block">
                    {l.nome}
                  </TextoTruncado>
                  <p className="t-caption">
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
              <div className="mt-bloco grid grid-cols-3 gap-2 text-xs">
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
              <p className="mt-1.5 t-caption">{defTipo(l.tipo).sigla}</p>
            </button>
          );
        })}
      </div>
    </>
  );
}
