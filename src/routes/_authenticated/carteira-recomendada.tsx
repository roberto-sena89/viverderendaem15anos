import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties } from "react";
import { History, Lock, Plus, Save, Search, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/panel";
import { RebalanceamentoSugerido } from "@/components/rebalanceamento-sugerido";
import { DialogBuscarRecomendacao } from "@/components/dialog-buscar-recomendacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { corClasse } from "@/lib/cores-ativos";
import { useAtivos } from "@/lib/data";
import {
  modeloDoPerfil,
  novoId,
  PERFIS,
  useCarteiraRecomendadaStore,
  type LinhaRec,
  type Perfil,
} from "@/lib/carteira-recomendada-store";
import { alocacaoIdeal, CLASSE_POS_FIXADO, classeDoAtivo, valorAtual } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/carteira-recomendada")({
  head: () => ({
    meta: [
      { title: "Carteira Recomendada · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Monte, edite e salve sua alocação-alvo por classe de ativo, com sugestões geradas por IA ou por assessorias certificadas.",
      },
      { property: "og:title", content: "Carteira Recomendada · Investidor em 15 Anos" },
      { property: "og:description", content: "Alocação-alvo por classe de ativo com sugestões de IA e assessorias." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/carteira-recomendada" }],
  }),
  component: CarteiraRecomendadaPage,
});

/** Converte a classe informada nas linhas para a chave usada na alocação-alvo. */
function chaveClasse(classe: string) {
  return classe === "Renda Fixa" ? CLASSE_POS_FIXADO : classe;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function CarteiraRecomendadaPage() {
  const { perfil, trocarPerfil, linhas, setLinhas, notas, setNotas, versoes, salvarVersao, restaurarVersao } =
    useCarteiraRecomendadaStore();
  const { salvar } = useAlocacaoAlvo();
  const { data: carteira = [] } = useAtivos();

  const [buscar, setBuscar] = useState(false);
  const [remover, setRemover] = useState<LinhaRec | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [verOrdens, setVerOrdens] = useState(false);

  const total = linhas.reduce((s, l) => s + l.alvo, 0);
  const ok = Math.abs(total - 100) < 0.05;

  const grupos = useMemo(() => {
    const mapa = new Map<string, LinhaRec[]>();
    for (const l of linhas) mapa.set(l.grupo, [...(mapa.get(l.grupo) ?? []), l]);
    return [...mapa.entries()];
  }, [linhas]);

  const comparativo = useMemo(() => {
    const patrimonio = carteira.reduce((s, a) => s + valorAtual(a), 0);
    const atual: Record<string, number> = {};
    for (const a of carteira) {
      const c = classeDoAtivo(a);
      atual[c] = (atual[c] ?? 0) + valorAtual(a);
    }
    const alvoPorClasse: Record<string, number> = {};
    for (const l of linhas) {
      const k = chaveClasse(l.classe);
      alvoPorClasse[k] = (alvoPorClasse[k] ?? 0) + l.alvo;
    }
    const chaves = new Set([...Object.keys(alvoPorClasse), ...Object.keys(atual)]);
    return [...chaves]
      .map((classe) => {
        const atualPct = patrimonio > 0 ? ((atual[classe] ?? 0) / patrimonio) * 100 : 0;
        const alvoPct = alvoPorClasse[classe] ?? 0;
        return { classe, atualPct, alvoPct, desvio: atualPct - alvoPct };
      })
      .filter((l) => l.alvoPct > 0 || l.atualPct > 0)
      .sort((a, b) => b.alvoPct - a.alvoPct);
  }, [carteira, linhas]);

  function atualizar(id: string, patch: Partial<LinhaRec>) {
    setLinhas(linhas.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function adicionar(grupo: string, risco: string) {
    setLinhas([
      ...linhas,
      {
        id: novoId(),
        grupo,
        risco,
        indexador: "Nova linha",
        prazo: "",
        classe: grupo === "Renda Fixa" ? "Renda Fixa" : "Ações",
        alvo: 0,
      },
    ]);
  }

  // Ordem travada: linhas não podem ser reordenadas por arrastar.


  function aplicarNaCarteira() {
    const novo: Record<string, number> = {};
    for (const k of Object.keys(alocacaoIdeal)) novo[k] = 0;
    for (const l of linhas) {
      const k = chaveClasse(l.classe);
      novo[k] = (novo[k] ?? 0) + l.alvo;
    }
    salvar(novo);
    toast.success("Alocação-alvo da carteira atualizada com as recomendações.");
  }

  return (
    <AppShell
      title="Carteira Recomendada"
      description={`Perfil ${perfil.toLowerCase()} · referência de alocação-alvo por classe de ativo`}
    >
      <AbasCarteira />

      <Panel
        title={
          <span className="flex items-center gap-2">
            <span className="inline-block h-5 w-1 rounded-full bg-primary" aria-hidden />
            Carteira Recomendada
          </span>
        }
        hint={`Perfil ${perfil.toLowerCase()} · referência de alocação-alvo por classe de ativo`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge
              className={
                ok
                  ? "bg-success text-success-foreground"
                  : total > 100
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-amber-500 text-black"
              }
            >
              Total {fmt(total)}%
            </Badge>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setBuscar(true)}>
              <Search className="size-4" /> Buscar recomendação
            </Button>
            <Button size="sm" className="hidden h-9 sm:inline-flex" onClick={aplicarNaCarteira}>
              <Wand2 className="size-4" /> Aplicar recomendações
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Perfil de investidor">
          {PERFIS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === perfil}
              onClick={() => trocarPerfil(p as Perfil)}
              className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                p === perfil
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-xs"
            onClick={() => setLinhas(modeloDoPerfil(perfil))}
          >
            Restaurar modelo do perfil
          </Button>
        </div>

        <div className="grid gap-4">
          {grupos.map(([grupo, itens]) => (
            <section key={grupo} className="overflow-hidden rounded-xl border border-border">
              <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-primary-soft/70 px-4 py-2.5 backdrop-blur">
                <div>
                  <p className="font-display text-sm font-bold text-accent-foreground">{grupo}</p>
                  <p className="text-xs text-muted-foreground">
                    Risco {itens[0]?.risco ?? "—"} · {fmt(itens.reduce((s, l) => s + l.alvo, 0))}% da carteira
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => adicionar(grupo, itens[0]?.risco ?? "Médio")}>
                  <Plus className="size-4" /> Adicionar linha
                </Button>
              </header>

              <ul className="divide-y divide-border">
                {itens.map((l) => (
                  <li
                    key={l.id}
                    className="grid gap-3 px-3 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,14rem)_auto] sm:items-center"
                  >
                    <span className="hidden text-muted-foreground/50 sm:block" aria-hidden>
                      <Lock className="size-3.5" />
                    </span>


                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: corClasse(chaveClasse(l.classe)) }}
                      />
                      <Input
                        aria-label="Indexador"
                        value={l.indexador}
                        onChange={(e) => atualizar(l.id, { indexador: e.target.value })}
                        className="h-9 font-medium"
                      />
                    </div>

                    <Input
                      aria-label="Prazo ou veículo"
                      value={l.prazo}
                      placeholder="Prazo / veículo de referência"
                      onChange={(e) => atualizar(l.id, { prazo: e.target.value })}
                      className="h-9 text-muted-foreground"
                    />

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.1}
                        value={l.alvo}
                        aria-label={`Alocação de ${l.indexador}`}
                        onChange={(e) => atualizar(l.id, { alvo: Number(e.target.value) })}
                        className="range-alocacao flex-1"
                        style={
                          {
                            "--range-progress": `${Math.min(100, Math.max(0, l.alvo))}%`,
                          } as CSSProperties
                        }
                      />

                      <Input
                        aria-label={`Percentual de ${l.indexador}`}
                        inputMode="decimal"
                        value={String(l.alvo).replace(".", ",")}
                        onChange={(e) => {
                          const v = Number(e.target.value.replace(",", "."));
                          atualizar(l.id, { alvo: Number.isFinite(v) ? Math.min(Math.max(v, 0), 100) : 0 });
                        }}
                        className="h-9 w-20 text-right font-display font-bold tabular-nums"
                      />
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remover ${l.indexador}`}
                      onClick={() => setRemover(l)}
                      className="justify-self-end text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
          <p className="text-sm text-muted-foreground">
            Somatório atual:{" "}
            <strong className={ok ? "text-success" : "text-destructive"}>{fmt(total)}%</strong>
            {ok ? "" : " · ajuste para 100%"}
          </p>
          <Button
            size="sm"
            onClick={() => {
              salvarVersao();
              toast.success("Carteira recomendada salva.");
            }}
          >
            <Save className="size-4" /> Salvar como minha carteira recomendada
          </Button>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Observações da estratégia">
          <Label htmlFor="notas" className="sr-only">
            Observações
          </Label>
          <Textarea
            id="notas"
            rows={6}
            maxLength={1000}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas do cliente ou do assessor sobre a estratégia definida…"
          />
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <History className="size-4" /> Histórico de versões
            </span>
          }
        >
          {versoes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma versão salva ainda. Use “Salvar como minha carteira recomendada”.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {versoes.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {new Date(v.data).toLocaleString("pt-BR")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Perfil {v.perfil} · {v.linhas.length} linhas
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      restaurarVersao(v);
                      toast.success("Versão restaurada.");
                    }}
                  >
                    Restaurar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Alocação-alvo vs. carteira atual"
        action={
          <Button size="sm" variant="outline" className="h-9" onClick={() => setVerOrdens((v) => !v)}>
            {verOrdens ? "Ocultar sugestão" : "Ver sugestão de rebalanceamento"}
          </Button>
        }
      >
        {comparativo.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Cadastre ativos na carteira para comparar com a alocação recomendada.
          </p>
        ) : (
          <ul className="grid gap-3">
            {comparativo.map((l) => {
              const abs = Math.abs(l.desvio);
              const cor = abs <= 2 ? "bg-success" : abs <= 5 ? "bg-amber-500" : "bg-destructive";
              const rotulo = abs <= 2 ? "Dentro da margem" : abs <= 5 ? "Atenção" : "Rebalancear";
              return (
                <li key={l.classe} className="grid gap-2 rounded-lg border border-border bg-primary-soft/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: corClasse(l.classe) }}
                      />
                      <span className="truncate">{l.classe}</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold text-background ${cor}`}>
                      {rotulo} · {l.desvio >= 0 ? "+" : ""}
                      {fmt(l.desvio)}%
                    </span>
                  </div>
                  <div className="grid gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-xs text-muted-foreground">Recomendado</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-gradient-brand" style={{ width: `${Math.min(100, l.alvoPct)}%` }} />
                      </span>
                      <span className="w-14 text-right text-xs font-semibold tabular-nums">{fmt(l.alvoPct)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-xs text-muted-foreground">Atual</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-foreground/40" style={{ width: `${Math.min(100, l.atualPct)}%` }} />
                      </span>
                      <span className="w-14 text-right text-xs font-semibold tabular-nums">{fmt(l.atualPct)}%</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {verOrdens ? <RebalanceamentoSugerido carteira={carteira} /> : null}

      {/* Barra de ações fixa no mobile */}
      <div className="sticky bottom-0 z-20 -mx-4 flex gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:hidden">
        <Button className="flex-1" onClick={aplicarNaCarteira}>
          <Wand2 className="size-4" /> Aplicar
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setBuscar(true)}>
          <Search className="size-4" /> Buscar
        </Button>
      </div>

      <DialogBuscarRecomendacao
        open={buscar}
        onOpenChange={setBuscar}
        perfil={perfil}
        onAplicar={(novas) => setLinhas(novas)}
      />

      <AlertDialog open={!!remover} onOpenChange={(v) => !v && setRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover linha?</AlertDialogTitle>
            <AlertDialogDescription>
              A linha “{remover?.indexador}” será removida da carteira recomendada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLinhas(linhas.filter((l) => l.id !== remover?.id));
                setRemover(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
