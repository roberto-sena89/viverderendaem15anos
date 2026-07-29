import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileDown, GitCompareArrows, Plus, Trash2 } from "lucide-react";
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
  listarCenarios,
  persistirCenarios,
  resumirCenario,
  serieComparativa,
  type Cenario,
} from "@/lib/cenarios";
import { gerarPdfComparativo } from "@/lib/cenarios-pdf";

export function ComparadorCenarios({ input, objetivoRenda }: { input: ProjecaoInput; objetivoRenda: number }) {
  const [cenarios, setCenarios] = useState<Cenario[]>(() => listarCenarios());
  const [nome, setNome] = useState("");
  const [gerando, setGerando] = useState(false);

  const resumos = useMemo(() => cenarios.map(resumirCenario), [cenarios]);
  const serie = useMemo(() => serieComparativa(resumos), [resumos]);

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
        <Button
          variant="outline"
          className="h-9"
          onClick={exportar}
          disabled={!resumos.length || gerando}
        >
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
                    strokeWidth={2}
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
                    <TableHead key={r.cenario.id} className="text-right">
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{ backgroundColor: CORES_CENARIO[i % CORES_CENARIO.length] }}
                        />
                        {r.cenario.nome}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <Linha rotulo="Patrimônio projetado" valores={resumos.map((r) => brl(r.patrimonioFinal))} />
                <Linha rotulo="Em valor de hoje" valores={resumos.map((r) => brl(r.patrimonioReal))} />
                <Linha rotulo="Renda passiva/mês" valores={resumos.map((r) => brl(r.rendaPassiva))} />
                <Linha rotulo="Total aportado" valores={resumos.map((r) => brl(r.totalAportado))} />
                <Linha
                  rotulo="Independência"
                  valores={resumos.map((r) =>
                    r.anoIndependencia ? `${r.anoIndependencia} · ${r.idadeIndependencia} anos` : "Após o período",
                  )}
                />
                <Linha rotulo="Progresso da meta" valores={resumos.map((r) => pct(r.progresso))} />
                <Linha
                  rotulo="Aporte mensal"
                  valores={resumos.map((r) => `${brl(r.cenario.input.aporteMensal)} (+${pct(r.cenario.input.aumentoAnual)}/ano)`)}
                />
                <Linha
                  rotulo="Rentabilidade / inflação"
                  valores={resumos.map((r) => `${pct(r.cenario.input.rentabilidadeAnual)} / ${pct(r.cenario.input.inflacaoAnual)}`)}
                />
                <TableRow>
                  <TableCell className="text-xs uppercase text-muted-foreground">Ações</TableCell>
                  {resumos.map((r) => (
                    <TableCell key={r.cenario.id} className="text-right">
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
        </>
      )}
    </div>
  );
}

function Linha({ rotulo, valores }: { rotulo: string; valores: string[] }) {
  return (
    <TableRow>
      <TableCell className="text-xs uppercase text-muted-foreground">{rotulo}</TableCell>
      {valores.map((v, i) => (
        <TableCell key={i} className="text-right font-medium">
          {v}
        </TableCell>
      ))}
    </TableRow>
  );
}
