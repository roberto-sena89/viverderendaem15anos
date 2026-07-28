import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cotacaoAtivo, historicoAtivo, painelB3, sincronizarPrecos } from "@/lib/market.functions";
import { lerArquivoB3, type DiagnosticoB3, type ResultadoB3 } from "@/lib/b3-import";
import { useImportarB3 } from "@/lib/data";
import { AvisoSincronizacao } from "@/components/aviso-sincronizacao";

import { brl, pct } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/mercado")({
  head: () => ({
    meta: [
      { title: "Conectar à B3 · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Conecte-se à B3: cotações ao vivo de ações, FIIs e ETFs, histórico de 10 anos e importação do extrato da Área do Investidor.",
      },
      { property: "og:title", content: "Conectar à B3 · Investidor em 15 Anos" },
      {
        property: "og:description",
        content: "Cotações ao vivo da B3, histórico de 10 anos e importação automática da sua carteira.",
      },
    ],
  }),
  component: MercadoPage,
});

function Variacao({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-muted-foreground">—</span>;
  const positivo = valor >= 0;
  const Icon = positivo ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${positivo ? "text-primary" : "text-destructive"}`}>
      <Icon className="size-3.5" />
      {pct(valor, 2)}
    </span>
  );
}

function MercadoPage() {
  return (
    <AppShell title="Conectar à B3" description="Dados de mercado ao vivo e importação do seu extrato da Área do Investidor">
      <Tabs defaultValue="mercado" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mercado">Mercado ao vivo</TabsTrigger>
          <TabsTrigger value="importar">Importar carteira</TabsTrigger>
        </TabsList>
        <TabsContent value="mercado" className="space-y-6">
          <MercadoAoVivo />
        </TabsContent>
        <TabsContent value="importar" className="space-y-6">
          <ImportarB3 />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function MercadoAoVivo() {
  const painelFn = useServerFn(painelB3);
  const cotacaoFn = useServerFn(cotacaoAtivo);
  const historicoFn = useServerFn(historicoAtivo);
  const sincronizarFn = useServerFn(sincronizarPrecos);

  const [busca, setBusca] = useState("");
  const [simbolo, setSimbolo] = useState("PETR4");

  const painel = useQuery({
    queryKey: ["b3", "painel"],
    queryFn: () => painelFn(),
    refetchInterval: 60_000,
  });

  const cotacao = useQuery({
    queryKey: ["b3", "cotacao", simbolo],
    queryFn: () => cotacaoFn({ data: { simbolo } }),
    enabled: !!simbolo,
    retry: false,
  });

  const historico = useQuery({
    queryKey: ["b3", "historico", simbolo],
    queryFn: () => historicoFn({ data: { simbolo, periodo: "10y" } }),
    enabled: !!simbolo,
    retry: false,
  });

  const sync = useMutation({
    mutationFn: () => sincronizarFn(),
    onSuccess: (r) =>
      toast.success(`${r.atualizados} de ${r.total} ativos atualizados com a cotação da B3.`, {
        description: r.falhas.length ? `Sem cotação: ${r.falhas.join(", ")}` : undefined,
      }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(painel.data?.indices ?? []).map((i) => (
          <Card key={i.simbolo}>
            <CardContent className="space-y-1 pt-6">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{i.nome}</p>
              <p className="font-display text-2xl font-semibold">
                {i.preco === null ? "—" : i.preco.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </p>
              <Variacao valor={i.variacaoPercent} />
            </CardContent>
          </Card>
        ))}
        {painel.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-16 animate-pulse rounded-lg bg-muted" />
                </CardContent>
              </Card>
            ))
          : null}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Indicadores do Banco Central</CardTitle>
            <CardDescription>Taxas oficiais usadas nas suas projeções</CardDescription>
          </div>
          <Button onClick={() => sync.mutate()} disabled={sync.isPending} variant="outline">
            <RefreshCw className={`size-4 ${sync.isPending ? "animate-spin" : ""}`} />
            Sincronizar preços da carteira
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(painel.data?.indicadores ?? []).map((ind) => (
            <Badge key={ind.nome} variant="secondary" className="px-3 py-1.5 text-sm">
              {ind.nome}: {ind.valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {ind.unidade}
            </Badge>
          ))}
          {!painel.data?.indicadores.length ? (
            <p className="text-sm text-muted-foreground">Carregando indicadores…</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consultar ativo na B3</CardTitle>
          <CardDescription>Ações, FIIs, ETFs e índices — cotação e histórico de até 10 anos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = busca.trim().toUpperCase();
              if (v) setSimbolo(v);
            }}
          >
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: PETR4, MXRF11, BOVA11, IBOV"
              maxLength={20}
            />
            <Button type="submit">
              <Search className="size-4" />
              Buscar
            </Button>
          </form>

          {cotacao.isError ? (
            <p className="text-sm text-destructive">Não encontramos "{simbolo}" nas fontes de mercado.</p>
          ) : null}

          {cotacao.data ? (
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <p className="font-display text-lg font-semibold">{cotacao.data.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {cotacao.data.simbolo} · {cotacao.data.bolsa ?? "B3"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Preço</p>
                <p className="font-display text-xl font-semibold">
                  {cotacao.data.preco === null ? "—" : brl(cotacao.data.preco, 2)}
                </p>
                <Variacao valor={cotacao.data.variacaoDiaPercent} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Faixa 52 semanas</p>
                <p className="text-sm">
                  {cotacao.data.minima52s ? brl(cotacao.data.minima52s, 2) : "—"} –{" "}
                  {cotacao.data.maxima52s ? brl(cotacao.data.maxima52s, 2) : "—"}
                </p>
              </div>
            </div>
          ) : null}

          {historico.data ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historico.data.serie}>
                    <defs>
                      <linearGradient id="grad-b3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="data" tickFormatter={(v: string) => v.slice(0, 4)} minTickGap={40} fontSize={12} />
                    <YAxis width={60} fontSize={12} tickFormatter={(v: number) => v.toFixed(0)} />
                    <ReTooltip formatter={(v: number) => brl(v, 2)} labelFormatter={(l) => `Data: ${l}`} />
                    <Area
                      type="monotone"
                      dataKey="fechamento"
                      stroke="hsl(var(--primary))"
                      fill="url(#grad-b3)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <Resumo rotulo="Retorno total" valor={historico.data.resumo.retornoTotalPercent} />
                <Resumo rotulo="Retorno anualizado" valor={historico.data.resumo.retornoAnualizadoPercent} />
                <Resumo rotulo="Volatilidade" valor={historico.data.resumo.volatilidadeAnualPercent} />
                <Resumo rotulo="Drawdown máximo" valor={historico.data.resumo.drawdownMaximoPercent} />
              </div>

              <div className="max-h-72 overflow-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ano</TableHead>
                      <TableHead className="text-right">Abertura</TableHead>
                      <TableHead className="text-right">Fechamento</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...historico.data.resumo.anos].reverse().map((a) => (
                      <TableRow key={a.ano}>
                        <TableCell>{a.ano}</TableCell>
                        <TableCell className="text-right">{brl(a.primeiro, 2)}</TableCell>
                        <TableCell className="text-right">{brl(a.ultimo, 2)}</TableCell>
                        <TableCell className="text-right">
                          <span className={a.variacaoPercent >= 0 ? "text-primary" : "text-destructive"}>
                            {pct(a.variacaoPercent, 1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : historico.isLoading ? (
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          ) : historico.isError ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{(historico.error as Error).message}</span>
              <Button size="sm" variant="outline" onClick={() => void historico.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}

        </CardContent>
      </Card>
    </>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground uppercase">{rotulo}</p>
      <p className={`font-display text-lg font-semibold ${valor !== null && valor < 0 ? "text-destructive" : ""}`}>
        {valor === null ? "—" : pct(valor, 1)}
      </p>
    </div>
  );
}

const ROTULO_CAMPO: Record<string, string> = {
  ticker: "Ativo / Código de negociação",
  data: "Data",
  movimento: "Tipo de movimentação",
  quantidade: "Quantidade",
  preco: "Preço unitário",
  valor: "Valor da operação",
  instituicao: "Instituição / Corretora",
  mercado: "Mercado / Tipo",
};

function Diagnosticos({ itens }: { itens: DiagnosticoB3[] }) {
  if (!itens.length) return null;
  const estilo: Record<string, string> = {
    erro: "border-destructive/40 bg-destructive/10 text-destructive",
    aviso: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    info: "border-border bg-muted/40 text-muted-foreground",
  };
  const Icone: Record<DiagnosticoB3["severidade"], typeof XCircle> = {
    erro: XCircle,
    aviso: AlertTriangle,
    info: CheckCircle2,
  };
  return (
    <div className="space-y-2">
      {itens.map((d, i) => {
        const Icon = Icone[d.severidade];
        return (
          <div key={i} className={`flex gap-3 rounded-xl border p-3 text-sm ${estilo[d.severidade]}`}>
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-medium">{d.titulo}</p>
              <p className="text-xs opacity-90">{d.detalhe}</p>
              {d.linhas?.length ? (
                <p className="text-xs opacity-70">Linhas: {d.linhas.join(", ")}{d.linhas.length >= 20 ? "…" : ""}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImportarB3() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<ResultadoB3 | null>(null);
  const [arquivo, setArquivo] = useState<string>("");
  const importar = useImportarB3();

  async function handleArquivo(file: File) {
    try {
      const resultado = await lerArquivoB3(file);
      setArquivo(file.name);
      setPrevia(resultado);
      if (!resultado.podeImportar) toast.error("Encontramos problemas no arquivo. Veja os detalhes abaixo.");
      else if (resultado.diagnosticos.some((d) => d.severidade === "aviso"))
        toast.warning("Arquivo lido com avisos. Revise antes de confirmar.");
    } catch {
      toast.error("Não consegui ler o arquivo. Envie o CSV ou Excel exportado da Área do Investidor da B3.");
    }
  }


  return (
    <>
      <AvisoSincronizacao compacto />
      <Card>
        <CardHeader>
          <CardTitle>Importar extrato da B3 ou da corretora</CardTitle>
          <CardDescription>
            Entre na Área do Investidor da B3 (investidor.b3.com.br) ou no home broker da <strong>Ágora
            Investimentos</strong>, exporte o <strong>Extrato de Negociação</strong>, o{" "}
            <strong>Extrato de Movimentação</strong> ou o relatório de negócios em Excel/CSV e envie o arquivo aqui.
            Detectamos o layout e mapeamos as colunas automaticamente.

          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleArquivo(file);
            }}
            className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-accent-foreground">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <p className="font-medium">Arraste o arquivo ou selecione</p>
              <p className="text-sm text-muted-foreground">Formatos aceitos: .xlsx, .xls e .csv</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleArquivo(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              Escolher arquivo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Seus dados são lidos no navegador e gravados apenas na sua conta. Vendas são ignoradas nesta versão.
          </p>
        </CardContent>
      </Card>

      {previa ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Prévia de {arquivo}</CardTitle>
              <Badge variant={previa.layout === "desconhecido" ? "destructive" : "secondary"}>{previa.layoutRotulo}</Badge>
              <Badge variant={previa.origem === "generico" ? "outline" : "secondary"}>{previa.origemRotulo}</Badge>

            <CardDescription>
              {previa.totalLinhas} linhas lidas · {previa.aportes.length} compras · {previa.dividendos.length} proventos ·{" "}
              {previa.vendas} vendas ignoradas · {previa.ignoradas} não reconhecidas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Diagnosticos itens={previa.diagnosticos} />

            <div>
              <p className="mb-2 text-sm font-medium">Mapeamento automático de colunas</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {previa.mapeamento.map((m) => (
                  <div
                    key={m.campo}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {ROTULO_CAMPO[m.campo] ?? m.campo}
                      {m.obrigatorio ? " *" : ""}
                    </span>
                    {m.coluna ? (
                      <span className="font-medium">{m.coluna}</span>
                    ) : (
                      <span className={m.obrigatorio ? "text-destructive" : "text-muted-foreground"}>não encontrada</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="max-h-80 overflow-auto rounded-xl border border-border">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previa.aportes.slice(0, 100).map((a, i) => (
                    <TableRow key={`${a.ticker}-${a.data}-${i}`}>
                      <TableCell>{a.data.split("-").reverse().join("/")}</TableCell>
                      <TableCell className="font-medium">{a.ticker}</TableCell>
                      <TableCell>{a.categoria}</TableCell>
                      <TableCell className="text-right">{a.quantidade}</TableCell>
                      <TableCell className="text-right">{brl(a.preco, 2)}</TableCell>
                      <TableCell className="text-right">{brl(a.quantidade * a.preco, 2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={importar.isPending || !previa.podeImportar}
                onClick={() =>
                  importar.mutate(
                    { aportes: previa.aportes, dividendos: previa.dividendos },
                    {
                      onSuccess: (r) => {
                        toast.success(`${r.aportes} aportes e ${r.dividendos} proventos importados da B3.`);
                        setPrevia(null);
                      },
                      onError: (e: Error) => toast.error(e.message),
                    },
                  )
                }
              >
                {importar.isPending ? "Importando…" : "Confirmar importação"}
              </Button>
              <Button variant="ghost" onClick={() => setPrevia(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
