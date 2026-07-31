import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  PiggyBank,
  
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/panel";
import { DialogTransacao } from "@/components/dialog-transacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { corCategoria } from "@/lib/cores-ativos";
import { useAportes, useAtivos, useExcluirAporte } from "@/lib/data";
import { brl, type Aporte } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/historico-aportes")({
  head: () => ({
    meta: [
      { title: "Histórico de Aportes · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Consulte mês a mês e ano a ano todos os lançamentos de aportes: ativo, categoria, corretora, quantidade, preço médio, taxas e valor.",
      },
      { property: "og:title", content: "Histórico de Aportes · Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Registre, organize e consulte todos os seus aportes mensais em um só lugar.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/historico-aportes" }],
  }),
  component: HistoricoAportesPage,
});

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const chaveMes = (d: string) => d.slice(0, 7);
const rotuloMes = (chave: string) => {
  const [ano, mes] = chave.split("-");
  const nome = MESES[Number(mes) - 1] ?? "";
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
};
const total = (a: Aporte) => a.quantidade * a.preco + a.taxas;
const num = (v: number, casas = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });

type Coluna = "data" | "ticker" | "categoria" | "corretora" | "quantidade" | "preco" | "taxas" | "valor";

function baixarCsv(nome: string, linhas: (string | number)[][]) {
  const csv = linhas
    .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function HistoricoAportesPage() {
  const { data: aportes = [], isLoading } = useAportes();
  const { data: ativos = [] } = useAtivos();
  const excluir = useExcluirAporte();

  const [modo, setModo] = useState<"mensal" | "anual">("mensal");
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [aberto, setAberto] = useState(true);
  const [ordem, setOrdem] = useState<{ col: Coluna; asc: boolean }>({ col: "data", asc: false });

  const nomePorTicker = useMemo(
    () => new Map(ativos.map((a) => [a.ticker.toUpperCase(), a.nome])),
    [ativos],
  );

  const meses = useMemo(
    () => [...new Set(aportes.map((a) => chaveMes(a.data)))].sort((x, y) => (x < y ? 1 : -1)),
    [aportes],
  );
  const anos = useMemo(
    () => [...new Set(aportes.map((a) => a.data.slice(0, 4)))].sort((x, y) => (x < y ? 1 : -1)),
    [aportes],
  );

  const [mesSel, setMesSel] = useState<string | null>(null);
  const [anoSel, setAnoSel] = useState<string | null>(null);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const mes = mesSel ?? meses[0] ?? new Date().toISOString().slice(0, 7);
  const ano = anoSel ?? anos[0] ?? String(new Date().getFullYear());

  const periodo = modo === "mensal" ? (diaSel ? `${mes}-${diaSel}` : mes) : ano;
  const doPeriodo = useMemo(
    () => aportes.filter((a) => a.data.startsWith(periodo)),
    [aportes, periodo],
  );

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of doPeriodo) m.set(a.categoria, (m.get(a.categoria) ?? 0) + total(a));
    return [...m.entries()].sort((x, y) => y[1] - x[1]);
  }, [doPeriodo]);

  const totalPeriodo = doPeriodo.reduce((s, a) => s + total(a), 0);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = doPeriodo.filter((a) => {
      if (filtroCategoria && a.categoria !== filtroCategoria) return false;
      if (!termo) return true;
      const nome = nomePorTicker.get(a.ticker.toUpperCase()) ?? "";
      return `${a.ticker} ${nome} ${a.categoria} ${a.corretora}`.toLowerCase().includes(termo);
    });
    const dir = ordem.asc ? 1 : -1;
    const valorCol = (a: Aporte): string | number => {
      switch (ordem.col) {
        case "data":
          return a.data;
        case "ticker":
          return a.ticker;
        case "categoria":
          return a.categoria;
        case "corretora":
          return a.corretora;
        case "quantidade":
          return a.quantidade;
        case "preco":
          return a.preco;
        case "taxas":
          return a.taxas;
        default:
          return total(a);
      }
    };
    return [...base].sort((x, y) => {
      const vx = valorCol(x);
      const vy = valorCol(y);
      if (typeof vx === "number" && typeof vy === "number") return (vx - vy) * dir;
      return String(vx).localeCompare(String(vy), "pt-BR") * dir;
    });
  }, [doPeriodo, busca, filtroCategoria, ordem, nomePorTicker]);

  const somaFiltrada = filtrados.reduce((s, a) => s + total(a), 0);
  const somaQtd = filtrados.reduce((s, a) => s + a.quantidade, 0);
  const somaTaxas = filtrados.reduce((s, a) => s + a.taxas, 0);
  const pmPonderado = somaQtd > 0 ? filtrados.reduce((s, a) => s + a.quantidade * a.preco, 0) / somaQtd : 0;
  const ativosDistintos = new Set(filtrados.map((a) => a.ticker)).size;

  // Meta implícita do mês: maior aporte mensal já feito (referência de progresso).
  const totaisPorMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of aportes) m.set(chaveMes(a.data), (m.get(chaveMes(a.data)) ?? 0) + total(a));
    return m;
  }, [aportes]);
  const referencia = Math.max(...[...totaisPorMes.values(), 1]);
  const progresso = modo === "mensal" ? Math.min(100, (totalPeriodo / referencia) * 100) : 100;

  const graficoAno = useMemo(
    () =>
      MESES.map((nome, i) => ({
        mes: nome.slice(0, 3),
        valor: totaisPorMes.get(`${ano}-${String(i + 1).padStart(2, "0")}`) ?? 0,
      })),
    [totaisPorMes, ano],
  );
  const totalAnoAnterior = aportes
    .filter((a) => a.data.startsWith(String(Number(ano) - 1)))
    .reduce((s, a) => s + total(a), 0);
  const variacaoAno = totalAnoAnterior > 0 ? ((totalPeriodo - totalAnoAnterior) / totalAnoAnterior) * 100 : null;

  const navegar = (passo: number) => {
    if (modo === "anual") {
      setAnoSel(String(Number(ano) + passo));
      return;
    }
    const [a, m] = mes.split("-").map(Number);
    const d = new Date(a, m - 1 + passo, 1);
    setMesSel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const exportar = () => {
    if (!filtrados.length) {
      toast.error("Nenhum lançamento no período para exportar.");
      return;
    }
    baixarCsv(`Aportes_${periodo}.csv`, [
      ["Data", "Ativo", "Nome", "Categoria", "Corretora", "Quantidade", "Preço médio", "Taxas", "Valor"],
      ...filtrados.map((a) => [
        a.data.split("-").reverse().join("/"),
        a.ticker,
        nomePorTicker.get(a.ticker.toUpperCase()) ?? "",
        a.categoria,
        a.corretora,
        num(a.quantidade, 8),
        num(a.preco),
        num(a.taxas),
        num(total(a)),
      ]),
      ["", "", "", "", "TOTAL", num(somaQtd, 8), num(pmPonderado), num(somaTaxas), num(somaFiltrada)],
    ]);
    toast.success("Arquivo CSV gerado.");
  };

  const ordenar = (col: Coluna) =>
    setOrdem((o) => ({ col, asc: o.col === col ? !o.asc : col === "data" ? true : false }));

  const Cabecalho = ({ col, children, className }: { col: Coluna; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => ordenar(col)}
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        {children}
        {ordem.col === col ? (
          ordem.asc ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : null}
      </button>
    </TableHead>
  );

  return (
    <AppShell
      title="Histórico de Aportes"
      description="Registre, organize e consulte todos os lançamentos mês a mês ou ano a ano."
    >
      <AbasCarteira />

      {/* Busca de período + modo + ações */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar ativo, categoria ou corretora"
              className="pl-9"
              aria-label="Buscar lançamentos"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => navegar(-1)} aria-label="Período anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <select
              value={modo === "mensal" ? mes : ano}
              onChange={(e) => (modo === "mensal" ? setMesSel(e.target.value) : setAnoSel(e.target.value))}
              aria-label="Selecionar período"
              className="min-w-[10rem] bg-transparent px-2 py-1 text-sm font-semibold text-foreground outline-none"
            >
              {(modo === "mensal"
                ? [...new Set([mes, ...meses])].sort((x, y) => (x < y ? 1 : -1))
                : [...new Set([ano, ...anos])].sort((x, y) => (x < y ? 1 : -1))
              ).map((p) => (
                <option key={p} value={p} className="bg-background">
                  {modo === "mensal" ? `${rotuloMes(p)} · ${p.split("-").reverse().join("/")}` : p}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => navegar(1)} aria-label="Próximo período">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-1">
            {(["mensal", "anual"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                  modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportar}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Cabeçalho do período */}
      <Panel bodyClassName="p-4 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              className="flex items-center gap-2 text-left"
              aria-expanded={aberto}
            >
              <ChevronDown className={cn("size-4 transition-transform", !aberto && "-rotate-90")} />
              <h2 className="truncate font-display text-lg font-bold">
                {modo === "mensal" ? rotuloMes(mes) : `Ano de ${ano}`}
              </h2>
            </button>
            <p className="mt-1 text-xs text-muted-foreground">
              {filtrados.length} lançamento{filtrados.length === 1 ? "" : "s"} · {ativosDistintos} ativo
              {ativosDistintos === 1 ? "" : "s"}
              {modo === "anual" && variacaoAno !== null
                ? ` · ${variacaoAno >= 0 ? "+" : ""}${variacaoAno.toFixed(1)}% vs ${Number(ano) - 1}`
                : ""}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Total aportado
            </p>
            <p className="font-display text-2xl font-bold text-primary sm:text-3xl">{brl(totalPeriodo)}</p>
          </div>
        </div>

        {/* Badges por categoria */}
        {porCategoria.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {porCategoria.map(([cat, valor]) => {
              const ativo = filtroCategoria === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFiltroCategoria(ativo ? null : cat)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    ativo
                      ? "border-primary bg-primary-soft text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="size-2 rounded-full" style={{ background: corCategoria(cat) }} />
                  {cat}
                  <span className="font-semibold text-foreground">
                    {totalPeriodo > 0 ? ((valor / totalPeriodo) * 100).toFixed(1) : "0,0"}%
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Visão anual */}
      {modo === "anual" && aberto && (
        <Panel title={`Evolução mensal · ${ano}`}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficoAno}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => brl(Number(v))} width={80} />
                <Tooltip
                  formatter={(v) => brl(Number(v))}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="valor" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {/* Tabela */}
      {aberto && (
        <Panel
          title="Lançamentos do período"
          hint={filtroCategoria ? `Filtrado por ${filtroCategoria}` : undefined}
          bodyClassName="p-0"
        >
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando lançamentos…</p>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <PiggyBank className="size-10 text-muted-foreground" />
              <p className="font-display text-base font-semibold">Nenhum aporte neste período</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Registre seu primeiro lançamento para acompanhar a evolução do seu patrimônio mês a mês.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <Cabecalho col="data" className="w-[86px]">Data</Cabecalho>
                      <Cabecalho col="ticker">Ativo</Cabecalho>
                      <Cabecalho col="categoria" className="w-[150px]">Categoria</Cabecalho>
                      <Cabecalho col="corretora" className="w-[150px]">Corretora</Cabecalho>
                      <Cabecalho col="quantidade" className="w-[90px] text-right">Qtd.</Cabecalho>
                      <Cabecalho col="preco" className="w-[120px] text-right">Preço médio</Cabecalho>
                      <Cabecalho col="taxas" className="w-[100px] text-right">Taxas</Cabecalho>
                      <Cabecalho col="valor" className="w-[120px] text-right">Valor</Cabecalho>
                      <TableHead className="w-[92px] text-right">Editar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((a) => (
                      <TableRow key={a.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="text-xs text-muted-foreground">
                          {a.data.slice(8, 10)}/{a.data.slice(5, 7)}
                        </TableCell>
                        <TableCell className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ background: corCategoria(a.categoria) }}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{a.ticker}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {nomePorTicker.get(a.ticker.toUpperCase()) ?? "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="truncate text-xs text-muted-foreground">{a.categoria}</TableCell>
                        <TableCell className="truncate text-xs text-muted-foreground">{a.corretora || "—"}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{num(a.quantidade, 8)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{brl(a.preco, 2)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {brl(a.taxas, 2)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">{brl(total(a))}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <DialogTransacao aporte={a}>
                              <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${a.ticker}`}>
                                <Pencil className="size-4" />
                              </Button>
                            </DialogTransacao>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              aria-label={`Excluir lançamento de ${a.ticker}`}
                              onClick={() => {
                                if (!confirm(`Excluir o lançamento de ${a.ticker}?`)) return;
                                excluir.mutate(a.id, {
                                  onSuccess: () => toast.success("Lançamento excluído."),
                                  onError: (e) => toast.error(e.message),
                                });
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-border bg-muted/40 font-semibold">
                      <TableCell colSpan={4} className="text-xs uppercase tracking-wide">
                        Total do período
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{num(somaQtd, 8)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{brl(pmPonderado, 2)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{brl(somaTaxas, 2)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-primary">{brl(somaFiltrada)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards empilhados */}
              <ul className="divide-y divide-border md:hidden">
                {filtrados.map((a) => (
                  <li key={a.id} className="p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: corCategoria(a.categoria) }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{a.ticker}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {nomePorTicker.get(a.ticker.toUpperCase()) ?? a.categoria}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-primary">{brl(total(a))}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.data.slice(8, 10)}/{a.data.slice(5, 7)}
                        </p>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Categoria</dt>
                        <dd className="truncate">{a.categoria}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Corretora</dt>
                        <dd className="truncate">{a.corretora || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Qtd. × preço médio</dt>
                        <dd className="tabular-nums">
                          {num(a.quantidade, 8)} × {brl(a.preco, 2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Taxas</dt>
                        <dd className="tabular-nums">{brl(a.taxas, 2)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex gap-2">
                      <DialogTransacao aporte={a}>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Pencil className="size-4" /> Editar
                        </Button>
                      </DialogTransacao>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (!confirm(`Excluir o lançamento de ${a.ticker}?`)) return;
                          excluir.mutate(a.id, {
                            onSuccess: () => toast.success("Lançamento excluído."),
                            onError: (e) => toast.error(e.message),
                          });
                        }}
                        aria-label={`Excluir lançamento de ${a.ticker}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
                <li className="flex items-center justify-between bg-muted/40 p-4 text-sm font-semibold">
                  <span className="text-xs uppercase tracking-wide">Total do período</span>
                  <span className="text-primary">{brl(somaFiltrada)}</span>
                </li>
              </ul>
            </>
          )}
        </Panel>
      )}
    </AppShell>
  );
}
