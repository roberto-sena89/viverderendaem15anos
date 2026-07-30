import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, ChevronUp, FileDown, GitCompareArrows, Plus, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, pct, type ProjecaoInput } from "@/lib/portfolio";
import {
  CORES_CENARIO,
  LIMITE_CENARIOS,
  criarCenario,
  evolucaoAnoAAno,
  indiceVencedor,
  listarCenarios,
  persistirCenarios,
  resumirCenario,
  serieComparativa,
  variacao,
  type Cenario,
} from "@/lib/cenarios";
import { gerarPdfComparativo } from "@/lib/cenarios-pdf";
import { cn } from "@/lib/utils";

/** Formata uma diferença percentual com sinal (ex.: +12,4%). */
function delta(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${pct(v)}`;
}

function corDelta(v: number | null) {
  if (v === null || !Number.isFinite(v) || Math.abs(v) < 0.05) return "text-muted-foreground";
  return v > 0 ? "text-primary" : "text-destructive";
}

export function ComparadorCenarios({ input, objetivoRenda }: { input: ProjecaoInput; objetivoRenda: number }) {
  const [cenarios, setCenarios] = useState<Cenario[]>(() => listarCenarios());
  const [nome, setNome] = useState("");
  const [gerando, setGerando] = useState(false);
  const [mostrarAnos, setMostrarAnos] = useState(false);

  const resumos = useMemo(() => cenarios.map(resumirCenario), [cenarios]);
  const serie = useMemo(() => serieComparativa(resumos), [resumos]);
  const vencedor = useMemo(() => indiceVencedor(resumos), [resumos]);
  const anoAAno = useMemo(() => evolucaoAnoAAno(resumos, 0), [resumos]);
  const base = resumos[0];
  const comparando = resumos.length > 1;

  function atualizar(lista: Cenario[]) {
    setCenarios(lista);
    persistirCenarios(lista);
  }

  function salvarCenario() {
    if (cenarios.length >= LIMITE_CENARIOS) {
      toast.error(`Limite de ${LIMITE_CENARIOS} cenários. Remova um para adicionar outro.`);
      return;
    }
    const novo = criarCenario(nome || `Cenário ${cenarios.length + 1}`, input, objetivoRenda);
    atualizar([...cenarios, novo]);
    setNome("");
    toast.success(`"${novo.nome}" adicionado à comparação.`);
  }

  async function exportar() {
    if (!resumos.length) return;
    setGerando(true);
    try {
      await gerarPdfComparativo(resumos);
      toast.success("Resumo em PDF gerado.");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
  }

  /** Célula de indicador: valor + diferença % contra o primeiro cenário (base). */
  function celulas(valor: (i: number) => string, numero?: (i: number) => number) {
    return resumos.map((r, i) => {
      const diff = comparando && numero && i > 0 ? variacao(numero(i), numero(0)) : null;
      return (
        <TableCell key={r.cenario.id} className={cn("text-right", i === vencedor && comparando && "bg-primary/5")}>
          <span className="font-medium">{valor(i)}</span>
          {comparando && numero ? (
            <span className={cn("block text-[13px] font-semibold", i === 0 ? "text-muted-foreground" : corDelta(diff))}>
              {i === 0 ? "base" : delta(diff)}
            </span>
          ) : null}
        </TableCell>
      );
    });
  }

  return (
    <div className="surface-card space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="panel-title flex items-center gap-2">
            <GitCompareArrows className="size-4! text-primary" /> Comparador de cenários
          </h2>
          <p className="text-xs text-muted-foreground">
            Salve a simulação atual e compare até {LIMITE_CENARIOS} casos lado a lado.
          </p>
        </div>
        <Button variant="outline" className="h-9" onClick={exportar} disabled={!resumos.length || gerando}>
          <FileDown className="size-4!" /> Exportar resumo em PDF
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 flex-1 gap-2">
          <Label htmlFor="nome-cenario">Nome do cenário</Label>
          <Input
            id="nome-cenario"
            value={nome}
            maxLength={40}
            placeholder={`Cenário ${cenarios.length + 1}`}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvarCenario()}
          />
        </div>
        <Button className="h-9" onClick={salvarCenario}>
          <Plus className="size-4!" /> Adicionar simulação atual
        </Button>
      </div>

      {resumos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Ajuste as premissas ao lado e adicione a simulação para começar a comparar.
        </p>
      ) : (
        <>
          {comparando ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Trophy className="size-5! text-primary" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">
                  Melhor cenário: {resumos[vencedor].cenario.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {resumos[vencedor].anoIndependencia
                    ? `Independência em ${resumos[vencedor].anoIndependencia} (${resumos[vencedor].idadeIndependencia} anos)`
                    : "Nenhum cenário atinge a meta no período — maior patrimônio em valor de hoje"}
                  {vencedor > 0 && base
                    ? ` · ${delta(variacao(resumos[vencedor].patrimonioReal, base.patrimonioReal))} vs ${base.cenario.nome}`
                    : ""}
                </p>
              </div>
            </div>
          ) : null}

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie}>
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
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {resumos.map((r, i) => (
                  <Line
                    key={r.cenario.id}
                    type="monotone"
                    dataKey={r.cenario.id}
                    name={r.cenario.nome}
                    stroke={CORES_CENARIO[i % CORES_CENARIO.length]}
                    strokeWidth={i === vencedor && comparando ? 3 : 2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="uppercase">Indicador</TableHead>
                  {resumos.map((r, i) => (
                    <TableHead
                      key={r.cenario.id}
                      className={cn("text-right", i === vencedor && comparando && "bg-primary/5")}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{ backgroundColor: CORES_CENARIO[i % CORES_CENARIO.length] }}
                        />
                        {r.cenario.nome}
                        {i === vencedor && comparando ? (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[12px] font-bold uppercase text-primary-foreground">
                            Vencedor
                          </span>
                        ) : null}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Patrimônio projetado</TableCell>
                  {celulas((i) => brl(resumos[i].patrimonioFinal), (i) => resumos[i].patrimonioFinal)}
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Em valor de hoje</TableCell>
                  {celulas((i) => brl(resumos[i].patrimonioReal), (i) => resumos[i].patrimonioReal)}
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Renda passiva/mês</TableCell>
                  {celulas((i) => brl(resumos[i].rendaPassiva), (i) => resumos[i].rendaPassiva)}
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Total aportado</TableCell>
                  {celulas((i) => brl(resumos[i].totalAportado), (i) => resumos[i].totalAportado)}
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Independência</TableCell>
                  {celulas((i) =>
                    resumos[i].anoIndependencia
                      ? `${resumos[i].anoIndependencia} · ${resumos[i].idadeIndependencia} anos`
                      : "Após o período",
                  )}
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Progresso da meta</TableCell>
                  {celulas((i) => pct(resumos[i].progresso), (i) => resumos[i].progresso)}
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Aporte mensal</TableCell>
                  {celulas(
                    (i) => `${brl(resumos[i].cenario.input.aporteMensal)} (+${pct(resumos[i].cenario.input.aumentoAnual)}/ano)`,
                    (i) => resumos[i].cenario.input.aporteMensal,
                  )}
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Rentabilidade / inflação</TableCell>
                  {celulas(
                    (i) =>
                      `${pct(resumos[i].cenario.input.rentabilidadeAnual)} / ${pct(resumos[i].cenario.input.inflacaoAnual)}`,
                  )}
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Ações</TableCell>
                  {resumos.map((r, i) => (
                    <TableCell key={r.cenario.id} className={cn("text-right", i === vencedor && comparando && "bg-primary/5")}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => atualizar(cenarios.filter((c) => c.id !== r.cenario.id))}
                      >
                        <Trash2 className="size-4!" /> Remover
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold uppercase">Evolução ano a ano</p>
                <p className="text-xs text-muted-foreground">
                  {comparando
                    ? `Patrimônio por ano, diferença % vs "${base?.cenario.nome}" e crescimento sobre o ano anterior.`
                    : "Patrimônio por ano e crescimento sobre o ano anterior."}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setMostrarAnos((v) => !v)}>
                {mostrarAnos ? <ChevronUp className="size-4!" /> : <ChevronDown className="size-4!" />}
                {mostrarAnos ? "Ocultar" : "Ver detalhes"}
              </Button>
            </div>

            {mostrarAnos ? (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase">Ano</TableHead>
                      {resumos.map((r, i) => (
                        <TableHead
                          key={r.cenario.id}
                          className={cn("text-right", i === vencedor && comparando && "bg-primary/5")}
                        >
                          {r.cenario.nome}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anoAAno.map((linha) => (
                      <TableRow key={linha.ano}>
                        <TableCell className="text-xs text-muted-foreground">
                          {linha.ano}
                          {linha.idade !== null ? ` · ${linha.idade} anos` : ""}
                        </TableCell>
                        {linha.valores.map((v, i) => (
                          <TableCell
                            key={v.id}
                            className={cn("text-right", i === vencedor && comparando && "bg-primary/5")}
                          >
                            <span className="font-medium">{v.patrimonio === null ? "—" : brl(v.patrimonio)}</span>
                            <span className="block text-[13px]">
                              {comparando ? (
                                <span className={cn("font-semibold", i === 0 ? "text-muted-foreground" : corDelta(v.variacao))}>
                                  {i === 0 ? "base" : delta(v.variacao)}
                                </span>
                              ) : null}
                              <span className="text-muted-foreground">
                                {comparando ? " · " : ""}
                                {v.crescimento === null ? "—" : `${delta(v.crescimento)} a/a`}
                              </span>
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
