import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  CircleCheck,
  CircleSlash,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { TickerMark } from "@/components/panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useAlocacaoAlvo } from "@/lib/alocacao-alvo";
import { corClasse } from "@/lib/cores-ativos";
import { brl, classeDoAtivo, pct, valorAtual, valorInvestido, type Ativo } from "@/lib/portfolio";

interface Grupo {
  classe: string;
  ativos: Ativo[];
  total: number;
  investido: number;
  rentabilidade: number;
  variacao: number;
  participacao: number;
  ideal: number;
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

function Variacao({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const cor = value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={`font-semibold tabular-nums ${cor}`}>
      {value > 0 ? "+" : ""}
      {num(value)}
      {suffix}
    </span>
  );
}

export function CarteiraGrupos({
  ativos,
  onEditar,
  onExcluir,
}: {
  ativos: Ativo[];
  onEditar: (a: Ativo) => void;
  onExcluir: (a: Ativo) => void;
}) {
  const { alvo } = useAlocacaoAlvo();
  const [fechados, setFechados] = useState<Record<string, boolean>>({});

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
        return {
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
    <div className="space-y-4">
      {grupos.map((g) => {
        const aberto = !fechados[g.classe];
        const cor = corClasse(g.classe);
        const idealAtivo = g.ativos.length > 0 ? g.ideal / g.ativos.length : 0;
        return (
          <section key={g.classe} className="surface-card overflow-hidden">
            <header className="flex flex-wrap items-center gap-4 border-l-4 px-4 py-4 sm:px-6" style={{ borderColor: cor }}>
              <div className="flex min-w-48 flex-1 items-center gap-3">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: `color-mix(in oklab, ${cor} 16%, transparent)`, color: cor }}
                >
                  <BarChart3 className="size-5" />
                </span>
                <h2 className="font-display text-lg leading-tight font-bold whitespace-pre-line">{g.classe}</h2>
              </div>

              <dl className="grid flex-[3] grid-cols-2 gap-x-6 gap-y-3 text-right sm:grid-cols-5">
                <div>
                  <dt className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">Ativos</dt>
                  <dd className="font-semibold tabular-nums">{g.ativos.length}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">Valor total</dt>
                  <dd className="font-semibold tabular-nums">{brl(g.total)}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">Variação</dt>
                  <dd>
                    <Variacao value={g.variacao} suffix="" />
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">Rentabilidade</dt>
                  <dd>
                    <Variacao value={g.rentabilidade} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">% na carteira</dt>
                  <dd className="font-semibold tabular-nums">
                    {pct(g.participacao)} <span className="text-muted-foreground">/ {pct(g.ideal)}</span>
                  </dd>
                </div>
              </dl>

              <Button
                size="icon"
                variant="ghost"
                aria-expanded={aberto}
                aria-label={`${aberto ? "Recolher" : "Expandir"} ${g.classe.replace(/\n/g, " ")}`}
                onClick={() => setFechados((f) => ({ ...f, [g.classe]: aberto }))}
              >
                <ChevronDown className={`size-5 transition-transform ${aberto ? "rotate-180" : ""}`} />
              </Button>
            </header>

            {aberto ? (
              <div className="overflow-x-auto border-t">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-56">Ativo</TableHead>
                        <TableHead className="text-right">Quant.</TableHead>
                        <TableHead className="text-right">Preço médio</TableHead>
                        <TableHead className="text-right">Preço atual</TableHead>
                        <TableHead className="text-right">Variação</TableHead>
                        <TableHead className="text-right">Rentabilidade</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-center">Nota</TableHead>
                        <TableHead className="text-right">% Carteira</TableHead>
                        <TableHead className="text-right">% Ideal</TableHead>
                        <TableHead className="text-center">Comprar?</TableHead>
                        <TableHead className="text-center">Opções</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.ativos.map((a) => {
                        const saldo = valorAtual(a);
                        const investido = valorInvestido(a);
                        const variacao = a.precoMedio > 0 ? ((a.precoAtual - a.precoMedio) / a.precoMedio) * 100 : 0;
                        const rent = investido > 0 ? ((saldo - investido) / investido) * 100 : 0;
                        const participacao = totalCarteira > 0 ? (saldo / totalCarteira) * 100 : 0;
                        const comprar = participacao < idealAtivo;
                        const n = nota(participacao, idealAtivo, rent);
                        return (
                          <TableRow key={a.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <TickerMark ticker={a.ticker} />
                                <div className="min-w-0">
                                  <p className="font-display leading-tight font-bold">{a.ticker}</p>
                                  <p className="max-w-48 truncate text-xs text-muted-foreground">{a.nome || a.categoria}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{num(a.quantidade)}</TableCell>
                            <TableCell className="text-right tabular-nums">{brl(a.precoMedio, 2)}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{brl(a.precoAtual, 2)}</TableCell>
                            <TableCell className="text-right">
                              <Variacao value={variacao} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Variacao value={rent} />
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{brl(saldo)}</TableCell>
                            <TableCell className="text-center">
                              <span
                                title="Nota de aderência ao alvo e desempenho"
                                className="inline-grid size-8 place-items-center rounded-md bg-foreground text-sm font-bold text-background tabular-nums"
                              >
                                {n.toFixed(0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{pct(participacao)}</TableCell>
                            <TableCell className="text-right text-muted-foreground tabular-nums">{pct(idealAtivo)}</TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  comprar
                                    ? "border-success/40 bg-success/10 text-success"
                                    : "border-destructive/40 bg-destructive/10 text-destructive"
                                }`}
                              >
                                {comprar ? <CircleCheck className="size-3.5" /> : <CircleSlash className="size-3.5" />}
                                {comprar ? "Sim" : "Não"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label={`Opções de ${a.ticker}`}>
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => onEditar(a)}>
                                    <Pencil className="size-4" /> Editar ativo
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onSelect={() => onExcluir(a)}>
                                    <Trash2 className="size-4" /> Excluir ativo
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
                </Table>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
