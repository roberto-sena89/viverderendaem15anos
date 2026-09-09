/**
 * Painel de auditorias da carteira: solicita uma auditoria real (dados do
 * banco + análise do Gestor IA) e lista o histórico com status e resposta.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  ClipboardCheck,
  Loader2,
  MessageSquarePlus,
  RotateCcw,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  atualizarStatusAuditoria,
  excluirAuditoria,
  listarAuditorias,
  responderAuditoria,
  solicitarAuditoria,
  type AuditoriaRegistro,
  type ValorResumo,
} from "@/lib/auditoria-ia.functions";
import { brl } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

const ROTULO_STATUS: Record<string, { texto: string; classe: string }> = {
  concluida: { texto: "Concluída", classe: "bg-primary/15 text-primary border-primary/30" },
  em_andamento: {
    texto: "Em andamento",
    classe: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
  pendente: {
    texto: "Pendente",
    classe: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  cancelada: {
    texto: "Cancelada",
    classe: "bg-muted text-muted-foreground border-border",
  },
  parcial: {
    texto: "Parcial (sem resposta da IA)",
    classe: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  falhou: {
    texto: "Falhou",
    classe: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

function dataBr(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}


export function PainelAuditorias() {
  const queryClient = useQueryClient();
  const listar = useServerFn(listarAuditorias);
  const solicitar = useServerFn(solicitarAuditoria);
  const excluir = useServerFn(excluirAuditoria);
  const [aberta, setAberta] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["auditorias"],
    queryFn: () => listar({} as never),
  });

  const nova = useMutation({
    mutationFn: () => solicitar({ data: {} }),
    onSuccess: (registro: AuditoriaRegistro) => {
      void queryClient.invalidateQueries({ queryKey: ["auditorias"] });
      setAberta(registro.id);
      toast.success(
        registro.status === "concluida"
          ? `Auditoria concluída pelo ${registro.provedor_ia ?? "Gestor IA"}.`
          : "Auditoria registrada com os números da carteira (a IA não respondeu agora).",
      );
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar a auditoria."),
  });

  const remover = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["auditorias"] }),
  });

  const auditorias = data ?? [];

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-xl">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="text-primary size-4" />
            Auditorias da carteira
          </CardTitle>
          <CardDescription>
            Cada auditoria usa os dados reais da sua carteira, do seu plano e das suas metas, e
            guarda a resposta do Gestor IA.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => nova.mutate()} disabled={nova.isPending}>
          {nova.isPending ? (
            <Loader2 className="mr-1 size-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1 size-3.5" />
          )}
          {nova.isPending ? "Analisando…" : "Solicitar auditoria"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-muted-foreground py-4 text-center text-sm">Carregando histórico…</p>
        )}

        {!isLoading && auditorias.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nenhuma auditoria ainda. Clique em “Solicitar auditoria” para gerar a primeira com os
            números atuais da sua carteira.
          </p>
        )}

        {auditorias.map((a) => {
          const status = ROTULO_STATUS[a.status] ?? ROTULO_STATUS["concluida"]!;
          const expandida = aberta === a.id;
          return (
            <div key={a.id} className="border-border/60 bg-background/40 rounded-xl border">
              <button
                type="button"
                onClick={() => setAberta(expandida ? null : a.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground text-sm font-semibold">{a.titulo}</span>
                    <Badge variant="outline" className={cn("text-[10px]", status.classe)}>
                      {status.texto}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {dataBr(a.created_at)} · Patrimônio {brl(a.patrimonio_total ?? 0)} · Score{" "}
                    {Math.round(a.score_diversificacao ?? 0)}/100
                    {a.provedor_ia ? ` · ${a.provedor_ia}` : ""}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "text-muted-foreground size-4 shrink-0 transition-transform",
                    expandida && "rotate-180",
                  )}
                />
              </button>

              {expandida && (
                <div className="border-border/60 space-y-3 border-t px-4 py-3">
                  {a.analise_ia ? (
                    <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-line">
                      {a.analise_ia}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      A análise escrita não foi gerada nesta solicitação. Os números abaixo são
                      reais e ficaram salvos.
                    </p>
                  )}
                  {a.resumo && (
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      {[
                        ["Investido", brl(Number(a.resumo["total_investido"] ?? 0))],
                        ["Lucro", brl(Number(a.resumo["lucro_total"] ?? 0))],
                        [
                          "Rentabilidade",
                          `${Number(a.resumo["rentabilidade_pct"] ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`,
                        ],
                        [
                          "DY carteira",
                          `${Number(a.resumo["dy_carteira_pct"] ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`,
                        ],
                      ].map(([rotulo, valor]) => (
                        <div
                          key={rotulo}
                          className="border-border/50 bg-card/60 rounded-lg border p-2"
                        >
                          <p className="text-muted-foreground">{rotulo}</p>
                          <p className="text-foreground font-semibold">{valor}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {a.resumo && <BlocoPlanoMetas resumo={a.resumo} score={a.score_diversificacao} />}

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => remover.mutate(a.id)}
                    >
                      <Trash2 className="mr-1 size-3.5" /> Excluir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Plano de independência, projeção e progresso das metas salvos na auditoria. */
function BlocoPlanoMetas({
  resumo,
  score,
}: {
  resumo: Record<string, ValorResumo>;
  score: number | null;
}) {
  const plano = (resumo["plano"] ?? {}) as Record<string, number>;
  const projecao = (resumo["projecao_final"] ?? {}) as Record<string, number>;
  const metas = (resumo["metas"] ?? []) as Array<{
    nome: string;
    alvo: number;
    progresso_pct: number;
  }>;
  const num = (v: unknown) => Number(v ?? 0);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="border-border/50 bg-card/60 space-y-2 rounded-lg border p-3">
        <p className="text-foreground text-xs font-semibold">Score e plano</p>
        <dl className="space-y-1 text-xs">
          {[
            ["Score do investidor", `${Math.round(score ?? 0)}/100`],
            ["Idade atual → aposentadoria", `${num(plano["idadeAtual"])} → ${num(plano["idadeAposentadoria"])} anos`],
            ["Aporte mensal", brl(num(plano["aporteMensal"]))],
            ["Rentabilidade anual", `${num(plano["rentabilidadeAnual"]).toLocaleString("pt-BR")}%`],
            ["Taxa de retirada", `${num(plano["taxaRetirada"]).toLocaleString("pt-BR")}%`],
            ["Patrimônio projetado", brl(num(projecao["patrimonio"]))],
            ["Renda passiva estimada", `${brl(num(projecao["renda_passiva_mensal"]))} /mês`],
          ].map(([r, v]) => (
            <div key={r} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{r}</dt>
              <dd className="text-foreground font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-border/50 bg-card/60 space-y-2 rounded-lg border p-3">
        <p className="text-foreground text-xs font-semibold">Metas</p>
        {metas.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nenhuma meta cadastrada.</p>
        ) : (
          <ul className="space-y-2">
            {metas.map((m) => (
              <li key={m.nome} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground truncate">{m.nome}</span>
                  <span className="text-foreground font-semibold">
                    {brl(m.alvo)} ·{" "}
                    {m.progresso_pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                  </span>
                </div>
                <div className="bg-muted/40 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, m.progresso_pct))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
