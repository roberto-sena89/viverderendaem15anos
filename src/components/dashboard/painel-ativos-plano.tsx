import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Info, Plus, Target } from "lucide-react";
import { useAtivosAoVivo, useCotacoesTempoReal, chaveTicker } from "@/lib/cotacoes-tempo-real";
import { useMetas } from "@/lib/data";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { brl, pct, valorAtual, arredondar, classeDoAtivo } from "@/lib/portfolio";
import { corCategoria } from "@/lib/cores-ativos";
import { getIconeCategoria } from "@/lib/icones-categorias";
import { cn } from "@/lib/utils";
import { Panel, DeltaChip } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Ordenacao = "patrimonio" | "variacao" | "ticker";

/**
 * Painel analítico por ativo: preço ao vivo, variação do dia, peso no
 * patrimônio e comparação com a meta de alocação (alvo por categoria).
 */
export function PainelAtivosPlano() {
  const { data: ativos = [] } = useAtivosAoVivo();
  const { mapa } = useCotacoesTempoReal();
  const { data: metas = [] } = useMetas();
  const { alvo } = useAlocacaoAlvo();
  const [ordem, setOrdem] = useState<Ordenacao>("patrimonio");

  const linhas = useMemo(() => {
    const totalPatrimonio = ativos.reduce((s, a) => s + valorAtual(a), 0);
    // Peso atual de cada classe da estratégia (a meta é definida por classe).
    const porClasse = new Map<string, number>();
    for (const a of ativos) {
      const classe = classeDoAtivo(a);
      porClasse.set(classe, (porClasse.get(classe) ?? 0) + valorAtual(a));
    }
    return ativos
      .map((a) => {
        const cot = mapa.get(chaveTicker(a.ticker));
        const valor = arredondar(valorAtual(a));
        const peso = totalPatrimonio > 0 ? (valor / totalPatrimonio) * 100 : 0;
        const variacao = cot?.variacaoPercent ?? null;
        const preco = cot?.preco && cot.preco > 0 ? cot.preco : a.precoAtual;
        const classe = classeDoAtivo(a);
        const valorClasse = porClasse.get(classe) ?? 0;
        return {
          id: a.id,
          ticker: a.ticker,
          nome: a.nome,
          categoria: a.categoria,
          classe,
          preco,
          variacao,
          valor,
          peso,
          pesoClasse: totalPatrimonio > 0 ? (valorClasse / totalPatrimonio) * 100 : 0,
          metaAlvo: Number(alvo[classe] ?? 0),
        };
      })
      .sort((a, b) => {
        if (ordem === "variacao") return (b.variacao ?? -Infinity) - (a.variacao ?? -Infinity);
        if (ordem === "ticker") return a.ticker.localeCompare(b.ticker);
        return b.valor - a.valor;
      });
  }, [ativos, mapa, alvo, ordem]);

  const proximaMeta = useMemo(() => {
    const total = ativos.reduce((s, a) => s + valorAtual(a), 0);
    return metas.find((m) => m.alvo > total) ?? null;
  }, [metas, ativos]);

  if (ativos.length === 0) {
    return (
      <Panel title="Ativos do plano" className="mb-10">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Target className="size-6 text-primary" />
          </div>
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-foreground">
            Nenhum ativo no plano
          </h3>
          <p className="mb-6 max-w-[300px] text-xs text-muted-foreground">
            Cadastre seus ativos para acompanhar preço, variação e peso de cada um no patrimônio.
          </p>
          <Button
            asChild
            size="sm"
            className="h-8 bg-primary text-[0.7rem] font-bold uppercase tracking-wider hover:bg-primary/90"
          >
            <Link to="/carteira" search={{ openAdd: true }}>
              <Plus className="mr-2 size-3" />
              Adicionar ativo
            </Link>
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Ativos do plano"
      className="mb-10"
      hint={
        proximaMeta
          ? `Próxima meta: ${proximaMeta.nome} (${brl(proximaMeta.alvo, 0)})`
          : "Todas as metas de patrimônio atingidas"
      }
      action={
        <TooltipProvider>
          <div className="flex items-center gap-1.5">
            {(
              [
                ["patrimonio", "Patrimônio"],
                ["variacao", "Variação"],
                ["ticker", "A–Z"],
              ] as [Ordenacao, string][]
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setOrdem(valor)}
                aria-pressed={ordem === valor}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider transition-colors",
                  ordem === valor
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground/60 hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                {rotulo}
              </button>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info
                  tabIndex={0}
                  aria-label="Sobre o painel de ativos"
                  className="size-3.5 cursor-help text-muted-foreground/50 hover:text-muted-foreground"
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] border-border/50 bg-background/95 text-[0.7rem] backdrop-blur-xl">
                <p>
                  Preço e variação ao vivo de cada ativo, peso no patrimônio total e comparação com
                  a meta de alocação definida para a categoria.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      }
    >
      {/* Tabela em desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-[0.6rem] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
              <th className="px-3 py-2">Ativo</th>
              <th className="px-3 py-2 text-right">Preço</th>
              <th className="px-3 py-2 text-right">Variação</th>
              <th className="px-3 py-2 text-right">% Patrimônio</th>
              <th className="px-3 py-2 text-right">Meta da classe</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const Icone = getIconeCategoria(l.categoria);
              const acimaDaMeta = l.pesoClasse > l.metaAlvo && l.metaAlvo > 0;
              return (
                <tr
                  key={l.id}
                  className="border-b border-border/20 transition-colors last:border-0 hover:bg-foreground/[0.02]"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${corCategoria(l.categoria)}1a`, color: corCategoria(l.categoria) }}
                      >
                        <Icone className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold leading-tight text-foreground">{l.ticker}</p>
                        <p className="max-w-[180px] truncate text-[0.65rem] text-muted-foreground/70">
                          {l.categoria}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                    {brl(l.preco, 2)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {l.variacao === null ? (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    ) : (
                      <DeltaChip value={l.variacao} />
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums text-foreground">
                        {pct(l.peso, 1)}
                      </span>
                      <span className="text-[0.65rem] tabular-nums text-muted-foreground/60">
                        {brl(l.valor, 2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="ml-auto flex w-28 flex-col items-end gap-1">
                      <span
                        className={cn(
                          "text-[0.65rem] font-bold tabular-nums",
                          l.metaAlvo === 0
                            ? "text-muted-foreground/50"
                            : acimaDaMeta
                              ? "text-positive"
                              : "text-negative",
                        )}
                      >
                        {l.metaAlvo > 0
                          ? `${acimaDaMeta ? "+" : ""}${(l.pesoClasse - l.metaAlvo).toFixed(1)} p.p.`
                          : "sem meta"}
                      </span>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, l.metaAlvo > 0 ? (l.pesoClasse / l.metaAlvo) * 100 : 0)}%`,
                            backgroundColor: corCategoria(l.categoria),
                          }}
                        />
                      </div>
                      <span className="text-[0.6rem] text-muted-foreground/50">
                        classe {pct(l.pesoClasse, 1)} · alvo {pct(l.metaAlvo, 0)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cartões em mobile */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {linhas.map((l) => {
          const Icone = getIconeCategoria(l.categoria);
          const acimaDaMeta = l.pesoClasse > l.metaAlvo && l.metaAlvo > 0;
          return (
            <div
              key={l.id}
              className="rounded-xl border border-border/40 bg-foreground/[0.02] p-3.5"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${corCategoria(l.categoria)}1a`, color: corCategoria(l.categoria) }}
                  >
                    <Icone className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold leading-tight text-foreground">{l.ticker}</p>
                    <p className="truncate text-[0.65rem] text-muted-foreground/70">{l.categoria}</p>
                  </div>
                </div>
                {l.variacao === null ? (
                  <span className="text-xs text-muted-foreground/50">—</span>
                ) : (
                  <DeltaChip value={l.variacao} />
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Preço
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {brl(l.preco, 2)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground/60">
                    % Patrimônio
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {pct(l.peso, 1)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Meta
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      l.metaAlvo === 0
                        ? "text-muted-foreground/50"
                        : acimaDaMeta
                          ? "text-positive"
                          : "text-negative",
                    )}
                  >
                    {l.metaAlvo > 0 ? `${pct(l.pesoClasse, 1)} / ${pct(l.metaAlvo, 0)}` : "—"}
                  </p>
                </div>
              </div>
              {l.metaAlvo > 0 && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (l.pesoClasse / l.metaAlvo) * 100)}%`,
                      backgroundColor: corCategoria(l.categoria),
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
