import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAtivos, useCriarDividendo, useDividendos, useExcluir } from "@/lib/data";
import type { Ativo, Dividendo } from "@/lib/portfolio";
import { brl, dividendos12m, dividendosMensais, pct, resumoCarteira, valorInvestido } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/dividendos")({
  head: () => ({
    meta: [
      { title: "Proventos · Investidor em 15 Anos" },
      { name: "description", content: "Dividendos mensais e anuais, yield on cost, dividend yield e histórico de proventos." },
      { property: "og:title", content: "Proventos · Investidor em 15 Anos" },
      { property: "og:description", content: "Acompanhe sua renda passiva mês a mês e o yield on cost da carteira." },
    ],
  }),
  component: DividendosPage,
});

const tipos = ["Dividendo", "JCP", "Rendimento"];

function DividendosPage() {
  const [open, setOpen] = useState(false);
  const { data: proventos = [], isLoading } = useDividendos();
  const { data: carteira = [] } = useAtivos();
  const criar = useCriarDividendo();
  const excluir = useExcluir("dividendos");

  const resumo = resumoCarteira(carteira);
  const recebidos12m = dividendos12m(proventos);
  const grafico = dividendosMensais(proventos);
  const investidoTotal = carteira.reduce((s, a) => s + valorInvestido(a), 0);
  const yieldOnCost = investidoTotal > 0 ? (recebidos12m / investidoTotal) * 100 : 0;

  const porAtivo = Object.entries(
    proventos.reduce<Record<string, number>>((acc, d) => {
      acc[d.ticker] = (acc[d.ticker] ?? 0) + d.valor;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const novo = {
      data: String(form.get("data")),
      ticker: String(form.get("ticker")).toUpperCase(),
      tipo: String(form.get("tipo")),
      valor: Number(form.get("valor")),
    };
    if (!novo.data || !novo.ticker || !novo.valor) {
      toast.error("Preencha data, ativo e valor.");
      return;
    }
    try {
      await criar.mutateAsync(novo);
      setOpen(false);
      toast.success("Provento registrado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <AppShell title="Proventos" description="Sua renda passiva em construção">
      <AbasCarteira />

      <PainelProventos proventos={proventos} carteira={carteira} totalCarteira={resumo.totalAtual} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recebidos 12m" value={brl(recebidos12m)} />
        <StatCard label="Média mensal" value={brl(recebidos12m / 12)} />
        <StatCard label="DY estimado da carteira" value={pct(resumo.dyCarteira)} tone="positive" />
        <StatCard label="Yield on cost" value={pct(yieldOnCost)} tone="positive" />
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Novo provento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo provento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="data">Data</Label>
                <Input id="data" name="data" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ticker">Ativo</Label>
                <Input id="ticker" name="ticker" placeholder="HGLG11" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select id="tipo" name="tipo" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  {tipos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input id="valor" name="valor" type="number" step="any" min="0" required />
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={criar.isPending}>
                  Salvar provento
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <HistoricoMensal proventos={proventos} carteira={carteira} />

      <MeusProventos proventos={proventos} carteira={carteira} />


      <div className="surface-card p-6">
        <p className="panel-title">Calendário de proventos (12 meses)</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(v: number) => brl(v)}
              />
              <Bar dataKey="valor" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Total recebido</TableHead>
                <TableHead className="text-right">Média mensal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porAtivo.map(([ticker, total]) => (
                <TableRow key={ticker}>
                  <TableCell className="font-medium">{ticker}</TableCell>
                  <TableCell className="text-right">{brl(total)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{brl(total / 12)}</TableCell>
                </TableRow>
              ))}
              {!isLoading && porAtivo.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum provento registrado ainda.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {proventos.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{new Date(`${d.data}T12:00`).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{d.ticker}</TableCell>
                  <TableCell className="text-muted-foreground">{d.tipo}</TableCell>
                  <TableCell className="text-right">{brl(d.valor, 2)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir provento"
                      onClick={() =>
                        excluir.mutate(d.id, {
                          onSuccess: () => toast.success("Provento excluído."),
                          onError: () => toast.error("Não foi possível excluir."),
                        })
                      }
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}

const META_MENSAL = 500;

const ANO_ATUAL = new Date().getFullYear();

const FILTROS_RAPIDOS = [
  { valor: "ano-atual", rotulo: "Ano atual", chip: String(ANO_ATUAL) },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "12m", rotulo: "Últimos 12 meses" },
  { valor: "5anos", rotulo: "Últimos 5 anos" },
  { valor: "mes-atual", rotulo: "Mês atual" },
  { valor: "proximo-mes", rotulo: "Próximo mês" },
  { valor: "futuros", rotulo: "Futuros" },
  { valor: "recebidos", rotulo: "Recebidos" },
  { valor: "todos", rotulo: "Todos", chip: "Recebidos e Futuros" },
];

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function chaveMes(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rotuloPeriodo(valor: string) {
  if (valor.startsWith("ano:")) return valor.slice(4);
  if (valor.startsWith("mes:")) {
    const [ano, mes] = valor.slice(4).split("-");
    return `${MESES[Number(mes) - 1]} ${ano}`;
  }
  const f = FILTROS_RAPIDOS.find((o) => o.valor === valor);
  return f ? (f.valor === "ano-atual" ? `Ano ${ANO_ATUAL}` : f.rotulo) : "Período";
}

function dentroDoPeriodo(dataISO: string, valor: string) {
  const data = new Date(`${dataISO}T12:00`);
  const hoje = new Date();
  if (valor.startsWith("ano:")) return dataISO.startsWith(valor.slice(4));
  if (valor.startsWith("mes:")) return dataISO.startsWith(valor.slice(4));
  switch (valor) {
    case "ano-atual":
      return dataISO.startsWith(String(ANO_ATUAL));
    case "30d": {
      const limite = new Date();
      limite.setDate(limite.getDate() - 30);
      return data >= limite && data <= hoje;
    }
    case "12m": {
      const limite = new Date();
      limite.setMonth(limite.getMonth() - 12);
      return data >= limite && data <= hoje;
    }
    case "5anos": {
      const limite = new Date();
      limite.setFullYear(limite.getFullYear() - 5);
      return data >= limite && data <= hoje;
    }
    case "mes-atual":
      return dataISO.startsWith(chaveMes(hoje));
    case "proximo-mes": {
      const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      return dataISO.startsWith(chaveMes(prox));
    }
    case "futuros":
      return data > hoje;
    case "recebidos":
      return data <= hoje;
    default:
      return true;
  }
}


function FiltroPeriodo({
  valor,
  onChange,
  anos,
  mensal = false,
}: {
  valor: string;
  onChange: (v: string) => void;
  anos: string[];
  mensal?: boolean;
}) {
  const anoSelecionado = valor.startsWith("mes:") ? Number(valor.slice(4, 8)) : ANO_ATUAL;
  const [anoNav, setAnoNav] = useState(anoSelecionado);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-xs font-normal" aria-label="Período dos proventos">
          <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
          {rotuloPeriodo(valor)}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[28rem] w-72 overflow-y-auto p-0">
        <div className="p-4">
          <p className="font-display text-sm font-semibold">Período</p>
          <p className="mt-3 text-xs text-muted-foreground">Filtros rápidos</p>
          <RadioGroup value={valor} onValueChange={onChange} className="mt-2 gap-2">
            {FILTROS_RAPIDOS.map((o) => (
              <Label
                key={o.valor}
                htmlFor={`periodo-${o.valor}`}
                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
              >
                <RadioGroupItem value={o.valor} id={`periodo-${o.valor}`} />
                {o.rotulo}
                {o.chip ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{o.chip}</span>
                ) : null}
              </Label>
            ))}
          </RadioGroup>
        </div>
        {mensal ? (
          <div className="border-t border-border p-4">
            <p className="text-xs text-muted-foreground">Filtro mensal</p>
            <div className="mt-2 flex items-center justify-between rounded-md bg-muted px-2 py-1.5">
              <button
                type="button"
                aria-label="Ano anterior"
                onClick={() => setAnoNav((a) => a - 1)}
                className="rounded p-1 text-muted-foreground hover:bg-background"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-medium tabular-nums">{anoNav}</span>
              <button
                type="button"
                aria-label="Próximo ano"
                onClick={() => setAnoNav((a) => a + 1)}
                className="rounded p-1 text-muted-foreground hover:bg-background"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {MESES.map((nome, i) => {
                const chave = `mes:${anoNav}-${String(i + 1).padStart(2, "0")}`;
                return (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => onChange(chave)}
                    className="flex items-center gap-2 text-left text-sm"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        valor === chave ? "border-primary" : "border-border"
                      }`}
                    >
                      {valor === chave ? <span className="size-2 rounded-full bg-primary" /> : null}
                    </span>
                    {nome}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {anos.length ? (
          <div className="border-t border-border p-4">
            <p className="text-xs text-muted-foreground">Filtro anual</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {anos.map((ano) => (
                <button
                  key={ano}
                  type="button"
                  onClick={() => onChange(`ano:${ano}`)}
                  className={`rounded-md border px-2 py-1 text-xs tabular-nums ${
                    valor === `ano:${ano}`
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {ano}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}


function FiltroAtivos({
  valor,
  onChange,
  ativos,
}: {
  valor: string;
  onChange: (v: string) => void;
  ativos: string[];
}) {
  const [busca, setBusca] = useState("");
  const lista = ativos.filter((a) => a.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-xs font-normal" aria-label="Ativos">
          <CircleDollarSign className="size-3.5 shrink-0 text-muted-foreground" />
          {valor === "todos" ? "Ativos" : valor}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="relative p-2">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder=""
            aria-label="Buscar ativo"
            className="h-9 pr-8 text-sm"
          />
          <Search className="pointer-events-none absolute right-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="max-h-64 overflow-y-auto border-t border-border py-1">
          <OpcaoAtivo rotulo="Todos os ativos" ativo={valor === "todos"} onClick={() => onChange("todos")} />
          {lista.map((a) => (
            <OpcaoAtivo key={a} rotulo={a} ativo={valor === a} onClick={() => onChange(a)} />
          ))}
          {lista.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum ativo encontrado.</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OpcaoAtivo({ rotulo, ativo, onClick }: { rotulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
    >
      {rotulo}
      {ativo ? <Check className="size-4 text-primary" /> : null}
    </button>
  );
}

function HistoricoMensal({ proventos, carteira }: { proventos: Dividendo[]; carteira: Ativo[] }) {
  const [periodo, setPeriodo] = useState("recebidos");
  const [tipoAtivo, setTipoAtivo] = useState("todos");
  const [ativoSel, setAtivoSel] = useState("todos");

  const categoriaPorTicker = new Map(carteira.map((a) => [a.ticker, a.categoria as string]));

  const filtrados = proventos.filter((d) => {
    if (tipoAtivo !== "todos" && categoriaPorTicker.get(d.ticker) !== tipoAtivo) return false;
    if (ativoSel !== "todos" && d.ticker !== ativoSel) return false;
    return dentroDoPeriodo(d.data, periodo);
  });

  const total = filtrados.reduce((s, d) => s + d.valor, 0);
  const linhas = Object.entries(
    filtrados.reduce<Record<string, number>>((acc, d) => {
      const mes = d.data.slice(0, 7);
      acc[mes] = (acc[mes] ?? 0) + d.valor;
      return acc;
    }, {}),
  ).sort((a, b) => b[0].localeCompare(a[0]));

  const opcoesTipo = [
    { valor: "todos", rotulo: "Tipo de ativo" },
    ...Array.from(new Set(carteira.map((a) => a.categoria as string))).map((c) => ({ valor: c, rotulo: c })),
  ];

  return (
    <div className="surface-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <p className="panel-title">Histórico mensal</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-md bg-muted px-3 text-xs">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums text-primary">{brl(total, 2)}</span>
          </div>
          <FiltroPeriodo
            valor={periodo}
            onChange={setPeriodo}
            anos={Array.from(new Set(proventos.map((d) => d.data.slice(0, 4)))).sort((a, b) => b.localeCompare(a))}
          />
          <SeletorFiltro
            valor={tipoAtivo}
            onChange={setTipoAtivo}
            icone={CircleDollarSign}
            opcoes={opcoesTipo}
            rotuloAcessivel="Tipo de ativo"
          />
          <FiltroAtivos
            valor={ativoSel}
            onChange={setAtivoSel}
            ativos={Array.from(new Set(proventos.map((d) => d.ticker))).sort()}
          />
        </div>
      </div>
      {linhas.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map(([mes, valor]) => (
              <TableRow key={mes}>
                <TableCell className="font-medium tabular-nums">
                  {new Date(`${mes}-01T12:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </TableCell>
                <TableCell className="text-right tabular-nums">{brl(valor, 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
          <p className="font-display text-lg font-semibold">Nenhum resultado encontrado</p>
          <p className="text-sm text-muted-foreground">Ainda não há dados disponíveis para exibição.</p>
        </div>
      )}
    </div>
  );
}

function MeusProventos({ proventos, carteira }: { proventos: Dividendo[]; carteira: Ativo[] }) {
  const anos = Array.from(new Set(proventos.map((d) => d.data.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
  const [periodo, setPeriodo] = useState("ano-atual");
  const [tipoAtivo, setTipoAtivo] = useState("todos");
  const [ativoSel, setAtivoSel] = useState("todos");

  const categoriaPorTicker = new Map(carteira.map((a) => [a.ticker, a.categoria as string]));

  const filtrados = proventos
    .filter((d) => {
      if (!dentroDoPeriodo(d.data, periodo)) return false;
      if (tipoAtivo !== "todos" && categoriaPorTicker.get(d.ticker) !== tipoAtivo) return false;
      if (ativoSel !== "todos" && d.ticker !== ativoSel) return false;
      return true;
    })
    .sort((a, b) => b.data.localeCompare(a.data));

  const total = filtrados.reduce((s, d) => s + d.valor, 0);

  const opcoesTipo = [
    { valor: "todos", rotulo: "Tipo de ativo" },
    ...Array.from(new Set(carteira.map((a) => a.categoria as string))).map((c) => ({ valor: c, rotulo: c })),
  ];

  return (
    <div className="surface-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <p className="panel-title">Meus proventos</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-md bg-muted px-3 text-xs">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums text-primary">{brl(total, 2)}</span>
          </div>
          <FiltroPeriodo valor={periodo} onChange={setPeriodo} anos={anos} mensal />

          <SeletorFiltro
            valor={tipoAtivo}
            onChange={setTipoAtivo}
            icone={CircleDollarSign}
            opcoes={opcoesTipo}
            rotuloAcessivel="Tipo de ativo"
          />
          <FiltroAtivos
            valor={ativoSel}
            onChange={setAtivoSel}
            ativos={Array.from(new Set(proventos.map((d) => d.ticker))).sort()}
          />
        </div>
      </div>
      {filtrados.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="tabular-nums">
                  {new Date(`${d.data}T12:00`).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="font-medium">{d.ticker}</TableCell>
                <TableCell className="text-right tabular-nums">{brl(d.valor, 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
          <p className="font-display text-lg font-semibold">Nenhum resultado encontrado</p>
          <p className="text-sm text-muted-foreground">Ainda não há dados disponíveis para exibição.</p>
        </div>
      )}
    </div>
  );
}



const ESCOPOS_TOTAL = [
  { valor: "mes", rotulo: "Total do mês" },
  { valor: "ano", rotulo: "Total do ano" },
  { valor: "12m", rotulo: "Total últimos 12 meses" },
];

function SeletorFiltro({
  valor,
  onChange,
  icone: Icone,
  opcoes,
  rotuloAcessivel,
}: {
  valor: string;
  onChange: (v: string) => void;
  icone: typeof Calendar;
  opcoes: { valor: string; rotulo: string }[];
  rotuloAcessivel: string;
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger aria-label={rotuloAcessivel} className="h-9 w-[10.5rem] gap-2 text-xs">
        <Icone className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor} className="text-xs">
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PainelProventos({
  proventos,
  carteira,
  totalCarteira,
}: {
  proventos: Dividendo[];
  carteira: Ativo[];
  totalCarteira: number;
}) {
  const [modo, setModo] = useState<"mensal" | "anual">("mensal");
  const [periodo, setPeriodo] = useState("12m");
  const [tipoAtivo, setTipoAtivo] = useState("todos");
  const [ativoSel, setAtivoSel] = useState("todos");
  const [escopoTotal, setEscopoTotal] = useState("12m");

  const categoriaPorTicker = new Map(carteira.map((a) => [a.ticker, a.categoria as string]));

  const filtrados = proventos.filter((d) => {
    if (tipoAtivo !== "todos" && categoriaPorTicker.get(d.ticker) !== tipoAtivo) return false;
    if (ativoSel !== "todos" && d.ticker !== ativoSel) return false;
    return dentroDoPeriodo(d.data, periodo);
  });

  const serie =
    modo === "mensal"
      ? dividendosMensais(filtrados)
      : Object.entries(
          filtrados.reduce<Record<string, number>>((acc, d) => {
            const ano = d.data.slice(0, 4);
            acc[ano] = (acc[ano] ?? 0) + d.valor;
            return acc;
          }, {}),
        )
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([mes, valor]) => ({ mes, valor }));

  const temDados = serie.some((s) => s.valor > 0);
  const total12m = dividendos12m(filtrados);
  const media = total12m / 12;
  const progresso = Math.min(100, (media / META_MENSAL) * 100);

  const hoje = new Date();
  const chaveMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const totalMes = filtrados.filter((d) => d.data.startsWith(chaveMes)).reduce((s, d) => s + d.valor, 0);
  const totalAno = filtrados
    .filter((d) => d.data.startsWith(String(hoje.getFullYear())))
    .reduce((s, d) => s + d.valor, 0);
  const totalEscopo = escopoTotal === "mes" ? totalMes : escopoTotal === "ano" ? totalAno : total12m;

  const opcoesTipo = [
    { valor: "todos", rotulo: "Tipo de ativo" },
    ...Array.from(new Set(carteira.map((a) => a.categoria as string))).map((c) => ({ valor: c, rotulo: c })),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="surface-card divide-y divide-border">
        <div className="p-5">
          <p className="font-display text-lg font-semibold">Resumo</p>
          <p className="mt-3 text-xs text-muted-foreground">Média Mensal (últ. 12 meses)</p>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="text-2xl font-semibold tabular-nums">
              {brl(media, 2)}{" "}
              <span className="text-sm font-normal text-muted-foreground">/ {brl(META_MENSAL, 2)}</span>
            </p>
            <span className="text-sm tabular-nums text-muted-foreground">{Math.round(progresso)}%</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progresso}%` }} />
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{ESCOPOS_TOTAL.find((e) => e.valor === escopoTotal)?.rotulo}</p>
            <Select value={escopoTotal} onValueChange={setEscopoTotal}>
              <SelectTrigger
                aria-label="Escopo do total de proventos"
                className="h-6 w-6 justify-center border-0 bg-transparent p-0 shadow-none [&>svg]:size-4"
              />
              <SelectContent align="end">
                {ESCOPOS_TOTAL.map((e) => (
                  <SelectItem key={e.valor} value={e.valor} className="text-xs">
                    {e.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{brl(totalEscopo, 2)}</p>
        </div>
        <div className="p-5">
          <p className="text-xs text-muted-foreground">Total da carteira</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{brl(totalCarteira, 2)}</p>
        </div>
        <div className="flex min-h-40 items-center justify-center p-5 text-sm text-muted-foreground">
          {temDados ? `${serie.filter((s) => s.valor > 0).length} períodos com proventos` : "Sem dados para exibir"}
        </div>
      </div>

      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-lg font-semibold">Evolução de Proventos</p>
          <div className="flex rounded-md bg-muted p-1">
            {(["mensal", "anual"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={`rounded px-3 py-1 text-xs capitalize ${
                  modo === m ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <FiltroPeriodo
              valor={periodo}
              onChange={setPeriodo}
              anos={Array.from(new Set(proventos.map((d) => d.data.slice(0, 4)))).sort((a, b) => b.localeCompare(a))}
            />
            <SeletorFiltro
              valor={tipoAtivo}
              onChange={setTipoAtivo}
              icone={CircleDollarSign}
              opcoes={opcoesTipo}
              rotuloAcessivel="Tipo de ativo"
            />
            <FiltroAtivos
              valor={ativoSel}
              onChange={setAtivoSel}
              ativos={Array.from(new Set(proventos.map((d) => d.ticker))).sort()}
            />
          </div>
        </div>

        <div className="mt-4 h-72">
          {temDados ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => brl(v, 2)}
                />
                <Bar dataKey="valor" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
              <p className="font-display text-lg font-semibold">Nenhum resultado encontrado</p>
              <p className="text-sm text-muted-foreground">Ainda não há dados disponíveis para exibição.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
