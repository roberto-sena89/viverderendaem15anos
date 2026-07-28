import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, Sparkles, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, pct, projetar, totalAtual, type ProjecaoInput } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/planejador")({
  head: () => ({
    meta: [
      { title: "Planejador da Independência Financeira · Investidor em 15 Anos" },
      { name: "description", content: "Projete seu patrimônio ano a ano, estime sua renda passiva e descubra a data da sua independência financeira." },
      { property: "og:title", content: "Planejador da Independência Financeira" },
      { property: "og:description", content: "Cenários otimista, base e conservador com inflação, aportes crescentes e taxa de retirada." },
    ],
  }),
  component: Planejador,
});

function Planejador() {
  const [input, setInput] = useState<ProjecaoInput>({
    idadeAtual: 32,
    idadeAposentadoria: 47,
    patrimonioAtual: Math.round(totalAtual),
    aporteMensal: 14000,
    aumentoAnual: 8,
    rentabilidadeAnual: 11,
    inflacaoAnual: 4.5,
    taxaRetirada: 4,
  });
  const [objetivoRenda, setObjetivoRenda] = useState(25000);

  const base = useMemo(() => projetar(input), [input]);
  const otimista = useMemo(() => projetar(input, 2), [input]);
  const conservador = useMemo(() => projetar(input, -3), [input]);

  const final = base[base.length - 1];
  const patrimonioNecessario = (objetivoRenda * 12) / (input.taxaRetirada / 100);
  const anoIndependencia = base.find((l) => l.patrimonio >= patrimonioNecessario);
  const primeiroMilhao = base.find((l) => l.patrimonio >= 1_000_000);
  const progresso = Math.min(100, (final.patrimonio / patrimonioNecessario) * 100);

  const chartData = base.map((l, i) => ({
    ano: l.ano,
    base: Math.round(l.patrimonio),
    otimista: Math.round(otimista[i].patrimonio),
    conservador: Math.round(conservador[i].patrimonio),
  }));

  const set = (k: keyof ProjecaoInput) => (v: number) => setInput((p) => ({ ...p, [k]: v }));

  return (
    <AppShell title="Planejador da Independência Financeira" description="Simule cenários e descubra sua data de liberdade">
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="surface-card space-y-5 p-6">
          <NumberField label="Idade atual" value={input.idadeAtual} onChange={set("idadeAtual")} />
          <NumberField label="Idade da aposentadoria" value={input.idadeAposentadoria} onChange={set("idadeAposentadoria")} />
          <NumberField label="Patrimônio atual (R$)" value={input.patrimonioAtual} onChange={set("patrimonioAtual")} step={1000} />
          <NumberField label="Aporte mensal (R$)" value={input.aporteMensal} onChange={set("aporteMensal")} step={500} />
          <SliderField label="Aumento anual dos aportes" value={input.aumentoAnual} onChange={set("aumentoAnual")} max={20} suffix="%" />
          <SliderField label="Rentabilidade esperada" value={input.rentabilidadeAnual} onChange={set("rentabilidadeAnual")} max={20} suffix="% a.a." />
          <SliderField label="Inflação esperada" value={input.inflacaoAnual} onChange={set("inflacaoAnual")} max={12} suffix="% a.a." />
          <SliderField label="Taxa de retirada" value={input.taxaRetirada} onChange={set("taxaRetirada")} max={8} min={2} suffix="%" />
          <NumberField label="Renda passiva desejada (R$/mês)" value={objetivoRenda} onChange={setObjetivoRenda} step={500} />
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Patrimônio projetado" value={brl(final.patrimonio)} icon={Wallet} />
            <StatCard label="Renda passiva estimada" value={`${brl(final.rendaPassivaMensal)}/mês`} tone="positive" />
            <StatCard label="Patrimônio em valor de hoje" value={brl(final.patrimonioReal)} />
            <StatCard
              label="Independência financeira"
              value={anoIndependencia ? `${anoIndependencia.ano} · ${anoIndependencia.idade} anos` : "Após o período"}
              icon={CalendarClock}
            />
          </div>

          <div className="surface-card p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Meta de independência</p>
                <p className="text-xs text-muted-foreground">
                  Necessário {brl(patrimonioNecessario)} para {brl(objetivoRenda)}/mês a {pct(input.taxaRetirada)} ao ano
                </p>
              </div>
              <p className="font-display text-xl font-semibold text-primary">{pct(progresso)}</p>
            </div>
            <Progress value={progresso} className="mt-4 h-2.5" />
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent p-3 text-xs text-accent-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0" />
              {progresso >= 100
                ? "Você atinge a meta dentro do período simulado. Aumentar a taxa de retirada ou antecipar a aposentadoria são cenários viáveis."
                : `Aumente o aporte mensal para cerca de ${brl(
                    input.aporteMensal * (patrimonioNecessario / final.patrimonio),
                  )} para atingir a meta no prazo definido.`}
              {primeiroMilhao ? ` Primeiro milhão estimado em ${primeiroMilhao.ano}.` : ""}
            </p>
          </div>

          <div className="surface-card p-6">
            <p className="text-sm font-medium">Cenários de evolução</p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cenario" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="ano" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    stroke="var(--color-muted-foreground)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => brl(v)}
                  />
                  <Area type="monotone" dataKey="base" name="Base" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#cenario)" />
                  <Line type="monotone" dataKey="otimista" name="Otimista" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="conservador" name="Conservador" stroke="var(--color-chart-5)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface-card max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead className="text-right">Patrimônio</TableHead>
                  <TableHead className="text-right">Valor de hoje</TableHead>
                  <TableHead className="text-right">Total aportado</TableHead>
                  <TableHead className="text-right">Renda passiva</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {base.map((l) => (
                  <TableRow key={l.ano}>
                    <TableCell className="font-medium">{l.ano}</TableCell>
                    <TableCell>{l.idade}</TableCell>
                    <TableCell className="text-right">{brl(l.patrimonio)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{brl(l.patrimonioReal)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{brl(l.aportado)}</TableCell>
                    <TableCell className="text-right text-success">{brl(l.rendaPassivaMensal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs font-medium text-primary">
          {value.toLocaleString("pt-BR")}
          {suffix}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={0.5} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
