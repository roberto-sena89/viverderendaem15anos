import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  CircleCheck,
  CircleSlash,
  MoreHorizontal,
  Pencil,
  Settings2,
  Trash2,
} from "lucide-react";

import { TickerMark } from "@/components/panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { corClasse } from "@/lib/cores-ativos";
import { brl, classeDoAtivo, pct, valorAtual, valorInvestido, type Ativo } from "@/lib/portfolio";

type ColunaId =
  | "quantidade"
  | "precoMedio"
  | "precoAtual"
  | "variacao"
  | "rentabilidade"
  | "saldo"
  | "nota"
  | "participacao"
  | "ideal"
  | "comprar";

const PADRAO: Record<ColunaId, boolean> = {
  quantidade: true,
  precoMedio: true,
  precoAtual: true,
  variacao: true,
  rentabilidade: true,
  saldo: true,
  nota: true,
  participacao: true,
  ideal: true,
  comprar: true,
};

interface Grupo {
  classe: string;
  ativos: Ativo[];
  total: number;
  investido: number;
  rentabilidade: number;
  variacao: number;
  participacao: number;
  ideal: number;
  /** Soma das variações (%) dos ativos do grupo. */
  variacaoPct: number;
}

/** Nota 0–10: aderência ao alvo (70%) + rentabilidade positiva (30%). */
function nota(participacao: number, ideal: number, rentabilidade: number) {
  const desvio = ideal > 0 ? Math.min(1, Math.abs(participacao - ideal) / ideal) : participacao > 0 ? 1 : 0;
  const aderencia = (1 - desvio) * 7;
  const desempenho = Math.max(0, Math.min(3, (rentabilidade / 20) * 3 + 1.5));
  return Math.max(0, Math.min(10, aderencia + desempenho));
}

const num = (v: number, d = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Converte valores possivelmente nulos/strings vindos da API em número finito. */
function numeroSeguro(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const limpo = v.replace(/\s|R\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
    const n = Number(limpo);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Variação percentual de um ativo, tolerante a dados ausentes ou em texto. */
function variacaoAtivo(a: Ativo): number {
  const medio = numeroSeguro(a.precoMedio);
  const atual = numeroSeguro(a.precoAtual);
  if (medio <= 0) return 0;
  return ((atual - medio) / medio) * 100;
}

/**
 * Exibe um valor com sinal explícito (+/-) e arredondamento consistente (2 casas).
 * O sinal é definido a partir do valor JÁ arredondado, evitando "-0,00".
 */
function Variacao({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const arredondado = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
  const seguro = Object.is(arredondado, -0) ? 0 : arredondado;
  const cor = seguro > 0 ? "text-success" : seguro < 0 ? "text-destructive" : "text-muted-foreground";
  const sinal = seguro > 0 ? "+" : seguro < 0 ? "−" : "";
  const corpo = suffix === "%" ? `${num(Math.abs(seguro))}%` : brl(Math.abs(seguro), 2);
  return (
    <span className={`font-semibold tabular-nums ${cor}`}>
      {sinal}
      {corpo}
    </span>
  );
}

export function CarteiraGrupos({
  ativos,
  onEditar,
  onExcluir,
  minimal = false,
}: {
  ativos: Ativo[];
  onEditar?: (a: Ativo) => void;
  onExcluir?: (a: Ativo) => void;
  /** Abre o fluxo de realocação do ativo para outra categoria. */
  /** Modo enxuto: sem barra de ferramentas, densidade compacta e grupos recolhidos. */
  minimal?: boolean;
}) {
  const { alvo } = useAlocacaoAlvo();
  const [fechados, setFechados] = useState<Record<string, boolean>>({});
  const colunas = PADRAO;
  const compacto = minimal;
  const cel = compacto ? "py-1.5 text-xs" : "";

  const { grupos, totalCarteira } = useMemo(() => {
    const totalCarteira = ativos.reduce((s, a) => s + valorAtual(a), 0);
    const mapa = new Map<string, Ativo[]>();
    for (const a of ativos) {
      const classe = classeDoAtivo(a);
      mapa.set(classe, [...(mapa.get(classe) ?? []), a]);
    }
    const grupos: Grupo[] = [...mapa.entries()]
      .map(([classe, lista]) => {
        const total = lista.reduce((s, a) => s + valorAtual(a), 0);
        const investido = lista.reduce((s, a) => s + valorInvestido(a), 0);
        const somaVariacoes = lista.reduce((s, a) => s + variacaoAtivo(a), 0);
        return {
          variacaoPct: somaVariacoes,
          classe,
          ativos: [...lista].sort((x, y) => valorAtual(y) - valorAtual(x)),
          total,
          investido,
          rentabilidade: investido > 0 ? ((total - investido) / investido) * 100 : 0,
          variacao: total - investido,
          participacao: totalCarteira > 0 ? (total / totalCarteira) * 100 : 0,
          ideal: alvo[classe] ?? 0,
        };
      })
      .sort((a, b) => b.total - a.total);
    return { grupos, totalCarteira };
  }, [ativos, alvo]);

  if (grupos.length === 0) {
    return (
      <div className="surface-card p-12 text-center text-sm text-muted-foreground">
        Nenhum ativo cadastrado ainda. Registre um lançamento para começar a acompanhar sua carteira.
      </div>
    );
  }

  return (
    <div className={compacto ? "space-y-2" : "space-y-4"}>
      {grupos.map((g) => {
        const aberto = fechados[g.classe] === undefined ? !minimal : !fechados[g.classe];
        const cor = corClasse(g.classe);
        const idealAtivo = g.ativos.length > 0 ? g.ideal / g.ativos.length : 0;
        return (
          <section key={g.classe} className="surface-card overflow-hidden">
            {minimal ? (
              <header
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-l-[3px] px-3 py-2.5 sm:px-4"
                style={{ borderColor: cor }}
              >
                <button
                  type="button"
                  aria-expanded={aberto}
                  onClick={() => setFechados((f) => ({ ...f, [g.classe]: aberto }))}
                  className="flex min-w-0 items-center gap-2.5 text-left"
                >
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`}
                  />
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold whitespace-pre-line sm:whitespace-normal">
                      {g.classe.replace(/\n/g, " · ")}
                    </span>
                    <span className="block text-[0.82rem] text-muted-foreground">
                      {g.ativos.length} {g.ativos.length === 1 ? "ativo" : "ativos"} ·{" "}
                      <span className="tabular-nums">{pct(g.participacao)}</span> de{" "}
                      <span className="tabular-nums">{pct(g.ideal)}</span>
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 flex-col items-end leading-tight">
                  <span className="text-sm font-semibold tabular-nums">{brl(g.total, 2)}</span>
                  <span className="text-xs">
                    <Variacao value={g.rentabilidade} />
                  </span>
                </div>
              </header>
            ) : (
              <header
                className={`border-l-4 ${compacto ? "px-4 py-3" : "px-4 py-4 sm:px-5"}`}
                style={{ borderColor: cor }}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3">
                  <button
                    type="button"
                    aria-expanded={aberto}
                    onClick={() => setFechados((f) => ({ ...f, [g.classe]: aberto }))}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <span
                      className={`grid shrink-0 place-items-center rounded-xl ${compacto ? "size-8" : "size-10"}`}
                      style={{ backgroundColor: `color-mix(in oklab, ${cor} 16%, transparent)`, color: cor }}
                    >
                      <BarChart3 className={compacto ? "size-4" : "size-5"} />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block truncate font-display leading-tight font-bold ${compacto ? "text-sm" : "text-base lg:text-lg"}`}
                      >
                        {g.classe.replace(/\n/g, " ").split("(")[0].trim()}
                      </span>
                      {g.classe.includes("(") ? (
                        <span className="mt-0.5 block truncate text-[0.78rem] leading-snug text-muted-foreground">
                          {g.classe
                            .replace(/\n/g, " ")
                            .slice(g.classe.replace(/\n/g, " ").indexOf("(") + 1)
                            .replace(/\)/g, "")
                            .replace(/,\s*/g, ", ")
                            .trim()}
                        </span>
                      ) : null}
                    </span>
                    <ChevronDown
                      className={`size-5 shrink-0 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`}
                    />
                  </button>

                  <div className="flex shrink-0 flex-col items-end leading-tight">
                    <span className="text-base font-bold tabular-nums lg:text-lg">{brl(g.total, 2)}</span>
                    <span className="text-xs">
                      <Variacao value={g.variacao} suffix="" /> ·{" "}
                      <Variacao value={g.rentabilidade} />
                    </span>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                  <div className="min-w-0">
                    <dt className="text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Ativos
                    </dt>
                    <dd className="text-sm font-semibold tabular-nums">{g.ativos.length}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Investido
                    </dt>
                    <dd className="text-sm font-semibold tabular-nums">{brl(g.investido, 2)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Variação (%)
                    </dt>
                    <dd className="text-sm">
                      <Variacao value={g.variacaoPct} />
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      % na carteira
                    </dt>
                    <dd className="text-sm font-semibold tabular-nums">
                      {pct(g.participacao)} <span className="text-muted-foreground">/ {pct(g.ideal)}</span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(2, Math.min(100, g.ideal > 0 ? (g.participacao / g.ideal) * 100 : g.participacao))}%`,
                      backgroundColor: cor,
                    }}
                  />
                </div>
              </header>
            )}

            {aberto ? (
              <>
                <div className="border-t">
                <Table wrapperClassName="overflow-x-visible" className="w-full table-fixed [&_th]:px-2 [&_td]:px-2 [&_th]:leading-tight [&_th]:whitespace-normal">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[20%] min-w-0">Ticker / Ativo</TableHead>
                        {colunas.quantidade && <TableHead className="text-right">Quant.</TableHead>}
                        {colunas.precoMedio && <TableHead className="text-right">P. médio</TableHead>}
                        {colunas.precoAtual && <TableHead className="text-right">P. atual</TableHead>}
                        {colunas.variacao && <TableHead className="text-right">Var. (%)</TableHead>}
                        {colunas.rentabilidade && <TableHead className="text-right">Rent. (R$)</TableHead>}
                        {colunas.saldo && <TableHead className="text-right">Saldo</TableHead>}
                        {colunas.nota && <TableHead className="text-center">Nota</TableHead>}
                        {colunas.participacao && <TableHead className="text-right">% Cart.</TableHead>}
                        {colunas.ideal && <TableHead className="text-right">% Ideal</TableHead>}
                        {colunas.comprar && <TableHead className="text-center">Comprar</TableHead>}
                        {onEditar && onExcluir ? <TableHead className="text-center">Opções</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.ativos.map((a) => {
                        const saldo = valorAtual(a);
                        const investido = valorInvestido(a);
                        const variacao = variacaoAtivo(a);
                        const rent = investido > 0 ? ((saldo - investido) / investido) * 100 : 0;
                        const participacao = totalCarteira > 0 ? (saldo / totalCarteira) * 100 : 0;
                        const comprar = participacao < idealAtivo;
                        const n = nota(participacao, idealAtivo, rent);
                        return (
                          <TableRow key={a.id}>
                            <TableCell className={cel}>
                              <div className={`flex items-center ${compacto ? "gap-2" : "gap-3"}`}>
                                {compacto ? null : <TickerMark ticker={a.ticker} />}
                                <div className="min-w-0">
                                  <p className="font-display leading-tight font-bold">{a.ticker}</p>
                                  <p
                                    className={`truncate text-xs text-muted-foreground ${compacto ? "max-w-40" : "max-w-56"}`}
                                    title={a.nome || a.categoria}
                                  >
                                    {a.nome || a.categoria}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            {colunas.quantidade && (
                              <TableCell className={`text-right tabular-nums ${cel}`}>{num(a.quantidade)}</TableCell>
                            )}
                            {colunas.precoMedio && (
                              <TableCell className={`text-right tabular-nums ${cel}`}>{brl(a.precoMedio, 2)}</TableCell>
                            )}
                            {colunas.precoAtual && (
                              <TableCell className={`text-right font-semibold tabular-nums ${cel}`}>
                                {brl(a.precoAtual, 2)}
                              </TableCell>
                            )}
                            {colunas.variacao && (
                              <TableCell className={`text-right ${cel}`}>
                                <Variacao value={variacao} />
                              </TableCell>
                            )}
                            {colunas.rentabilidade && (
                              <TableCell className={`text-right ${cel}`}>
                                <Variacao value={saldo - investido} suffix="" />
                              </TableCell>
                            )}
                            {colunas.saldo && (
                              <TableCell className={`text-right font-semibold tabular-nums ${cel}`}>{brl(saldo, 2)}</TableCell>
                            )}
                            {colunas.nota && (
                              <TableCell className={`text-center ${cel}`}>
                                <span
                                  title="Nota de aderência ao alvo e desempenho"
                                  className={`inline-grid place-items-center rounded-md bg-foreground font-bold text-background tabular-nums ${
                                    compacto ? "size-6 text-xs" : "size-8 text-sm"
                                  }`}
                                >
                                  {n.toFixed(0)}
                                </span>
                              </TableCell>
                            )}
                            {colunas.participacao && (
                              <TableCell className={`text-right tabular-nums ${cel}`}>{pct(participacao)}</TableCell>
                            )}
                            {colunas.ideal && (
                              <TableCell className={`text-right text-muted-foreground tabular-nums ${cel}`}>
                                {pct(idealAtivo)}
                              </TableCell>
                            )}
                            {colunas.comprar && (
                              <TableCell className={`text-center ${cel}`}>
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border text-xs font-semibold ${
                                    compacto ? "px-2 py-0.5" : "px-2.5 py-1"
                                  } ${
                                    comprar
                                      ? "border-success/40 bg-success/10 text-success"
                                      : "border-destructive/40 bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  {comprar ? <CircleCheck className="size-3.5" /> : <CircleSlash className="size-3.5" />}
                                  {comprar ? "Sim" : "Não"}
                                </span>
                              </TableCell>
                            )}
                            {onEditar && onExcluir ? (
                              <TableCell className={`text-center ${cel}`}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      title={`Ações de ${a.ticker}`}
                                      aria-label={`Ações de ${a.ticker}: editar ou excluir`}
                                      className="h-8 gap-1.5 px-2.5 text-xs font-semibold"
                                    >
                                      <Settings2 className="size-3.5" />
                                      <span className="hidden sm:inline">Ações</span>
                                      <ChevronDown className="size-3.5 opacity-60" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                                      {a.ticker}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => onEditar?.(a)}>
                                      <Pencil className="size-4" /> Editar ativo
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onSelect={() => onExcluir?.(a)}
                                    >
                                      <Trash2 className="size-4" /> Excluir ativo
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            ) : null}


                          </TableRow>
                        );
                      })}
                </TableBody>
                </Table>
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 sm:px-6">
                  <p className="text-xs text-muted-foreground">
                    {g.ativos.length} {g.ativos.length === 1 ? "ativo" : "ativos"} · {brl(g.total, 2)} ·{" "}
                    {g.participacao >= g.ideal
                      ? "acima ou no alvo desta classe"
                      : `faltam ${pct(g.ideal - g.participacao)} para o alvo`}
                  </p>
                </footer>
              </>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
