import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Info,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AbasCarteira } from "@/components/abas-carteira";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { lerArquivoB3 } from "@/lib/b3-import";
import type { DiagnosticoB3, ResultadoB3 } from "@/lib/b3-import";
import { useImportarB3 } from "@/lib/data";
import { brl } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar B3 · Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Importe automaticamente o Extrato de Negociação ou de Movimentação da B3 (CSV ou Excel) e registre compras e proventos na carteira.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/importar" }],
  }),
  component: ImportarPage,
});

function ImportarPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoB3 | null>(null);
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const importar = useImportarB3();

  const aoSelecionar = async (arquivo: File | null) => {
    if (!arquivo) return;
    setProcessando(true);
    setResultado(null);
    setArquivoNome(arquivo.name);
    try {
      const res = await lerArquivoB3(arquivo);
      setResultado(res);
      if (res.diagnosticos.some((d) => d.severidade === "erro")) {
        toast.error("O arquivo precisa de ajustes — veja os avisos abaixo.");
      } else if (res.podeImportar) {
        toast.success(
          `${res.aportes.length} compra(s) e ${res.dividendos.length} provento(s) lidos.`,
        );
      } else {
        toast.warning("Nada importável neste arquivo.");
      }
    } catch {
      toast.error(
        "Não conseguimos ler este arquivo. Envie um CSV ou Excel exportado da Área do Investidor.",
      );
    } finally {
      setProcessando(false);
    }
  };

  const importarTudo = () => {
    if (!resultado) return;
    importar.mutate(
      {
        aportes: resultado.aportes.map((a) => ({
          data: a.data,
          corretora: a.corretora,
          ticker: a.ticker,
          categoria: a.categoria,
          quantidade: a.quantidade,
          preco: a.preco,
          taxas: a.taxas,
          observacoes: a.observacoes,
        })),
        dividendos: resultado.dividendos.map((d) => ({ ...d })),
      },
      {
        onSuccess: (res) => {
          toast.success(`${res.aportes} compra(s) e ${res.dividendos} provento(s) importados.`);
          setResultado(null);
          setArquivoNome(null);
          if (inputRef.current) inputRef.current.value = "";
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <AppShell
      title="Importar B3"
      description="Importe extratos da B3 e registre compras e proventos em lote."
    >
      <AbasCarteira />

      <Panel
        title="Envie o extrato"
        hint="CSV ou Excel exportados da Área do Investidor (Extrato de Negociação ou de Movimentação)."
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          aria-label="Arquivo do extrato B3"
          onChange={(e) => aoSelecionar(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processando || importar.isPending}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-60"
        >
          {processando ? (
            <Loader2 className="size-10 animate-spin text-primary" />
          ) : (
            <FileSpreadsheet className="size-10 text-primary" />
          )}
          <div>
            <p className="font-display text-sm font-bold">
              {processando ? "Lendo arquivo…" : "Clique para escolher o arquivo"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {arquivoNome ?? "Extrato de Negociação / Movimentação da B3, em CSV ou Excel"}
            </p>
          </div>
        </button>

        <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <ItemAjuda icone={FileUp} texto="Compras são registradas como aportes com preço médio." />
          <ItemAjuda
            icone={CheckCircle2}
            texto="Proventos (dividendos, JCP, rendimentos) entram no histórico."
          />
          <ItemAjuda icone={AlertTriangle} texto="Vendas ainda não são importadas nesta versão." />
        </div>
      </Panel>

      {resultado ? (
        <>
          <Panel title="Diagnóstico do arquivo" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {resultado.diagnosticos.map((d, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <IconeDiagnostico severidade={d.severidade} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{d.titulo}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.detalhe}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Prévia"
            hint={`${resultado.layoutRotulo} · ${resultado.origemRotulo} · ${resultado.totalLinhas} linha(s) lidas`}
            action={
              <Badge variant="secondary">
                {resultado.aportes.length} compra(s) · {resultado.dividendos.length} provento(s)
              </Badge>
            }
            bodyClassName="p-0"
          >
            {resultado.aportes.length === 0 && resultado.dividendos.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Nenhuma linha importável encontrada.
              </p>
            ) : (
              <div className="max-h-[26rem] overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Data</th>
                      <th className="px-3 py-2 font-semibold">Ticker</th>
                      <th className="px-3 py-2 font-semibold">Tipo</th>
                      <th className="px-3 py-2 text-right font-semibold">Qtd.</th>
                      <th className="px-3 py-2 text-right font-semibold">Preço</th>
                      <th className="px-3 py-2 text-right font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {resultado.aportes.slice(0, 50).map((a, i) => (
                      <tr key={`c-${i}`} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">
                          {a.data.split("-").reverse().join("/")}
                        </td>
                        <td className="px-3 py-2 font-semibold">{a.ticker}</td>
                        <td className="px-3 py-2 text-muted-foreground">Compra</td>
                        <td className="px-3 py-2 text-right tabular-nums">{a.quantidade}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{brl(a.preco, 4)}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {brl(a.quantidade * a.preco + a.taxas, 2)}
                        </td>
                      </tr>
                    ))}
                    {resultado.dividendos.slice(0, 30).map((d, i) => (
                      <tr key={`p-${i}`} className="bg-success/5 hover:bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">
                          {d.data.split("-").reverse().join("/")}
                        </td>
                        <td className="px-3 py-2 font-semibold">{d.ticker}</td>
                        <td className="px-3 py-2 text-success">{d.tipo}</td>
                        <td className="px-3 py-2 text-right tabular-nums">—</td>
                        <td className="px-3 py-2 text-right tabular-nums">—</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {brl(d.valor, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(resultado.aportes.length > 50 || resultado.dividendos.length > 30) && (
                  <p className="border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
                    Prévia truncada — a importação registra todas as{" "}
                    {resultado.aportes.length + resultado.dividendos.length} linha(s).
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                <Info className="mr-1 inline size-3.5" />
                Duplicados são ignorados pelo banco (mesma data + ativo + valor).
              </p>
              <Button
                onClick={importarTudo}
                disabled={!resultado.podeImportar || importar.isPending}
              >
                {importar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Importar {resultado.aportes.length + resultado.dividendos.length} lançamento(s)
              </Button>
            </div>
          </Panel>
        </>
      ) : null}
    </AppShell>
  );
}

function ItemAjuda({ icone: Icone, texto }: { icone: typeof Info; texto: string }) {
  return (
    <p className="flex items-start gap-2">
      <Icone className="mt-0.5 size-4 shrink-0 text-primary" />
      {texto}
    </p>
  );
}

const COR_SEVERIDADE: Record<DiagnosticoB3["severidade"], string> = {
  erro: "bg-destructive/10 text-destructive",
  aviso: "bg-warning/10 text-warning",
  info: "bg-primary/10 text-primary",
};

function IconeDiagnostico({ severidade }: { severidade: DiagnosticoB3["severidade"] }) {
  const Icone =
    severidade === "erro" ? AlertTriangle : severidade === "aviso" ? Info : CheckCircle2;
  return (
    <span
      className={cn(
        "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
        COR_SEVERIDADE[severidade],
      )}
    >
      <Icone className="size-4" />
    </span>
  );
}
