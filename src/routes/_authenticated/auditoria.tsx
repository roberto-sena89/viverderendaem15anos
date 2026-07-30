import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria de dados · Investidor em 15 Anos" },
      {
        name: "description",
        content: "Histórico das sincronizações de preços por fonte: Tesouro Transparente e Yahoo Finance / brapi.dev.",
      },
      { property: "og:title", content: "Auditoria de dados · Investidor em 15 Anos" },
      { property: "og:description", content: "Acompanhe quando cada fonte sincronizou e quais erros ocorreram." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://viverderendaem15anos.lovable.app/auditoria" }],
  }),
  component: Auditoria,
});

type Sincronizacao = {
  id: string;
  escopo: string;
  fonte: string;
  status: string;
  dentro_do_pregao: boolean;
  total_tickers: number;
  atualizados: number;
  historico_gravado: number;
  falhas: string[];
  erro: string | null;
  duracao_ms: number;
  created_at: string;
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" });

function desde(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)} d`;
}

const ESTILO_STATUS: Record<string, { rotulo: string; classe: string; Icone: typeof CheckCircle2 }> = {
  ok: { rotulo: "Sucesso", classe: "border-primary/40 bg-primary/10 text-primary", Icone: CheckCircle2 },
  parcial: {
    rotulo: "Parcial",
    classe: "border-amber-500/40 bg-amber-500/10 text-amber-500",
    Icone: AlertTriangle,
  },
  erro: {
    rotulo: "Falha",
    classe: "border-destructive/40 bg-destructive/10 text-destructive",
    Icone: XCircle,
  },
};

function StatusBadge({ status }: { status: string }) {
  const e = ESTILO_STATUS[status] ?? ESTILO_STATUS.ok;
  return (
    <Badge variant="outline" className={`gap-1.5 font-semibold uppercase ${e.classe}`}>
      <e.Icone className="size-3.5" aria-hidden />
      {e.rotulo}
    </Badge>
  );
}

function useSincronizacoes() {
  return useQuery({
    queryKey: ["sincronizacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sincronizacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Sincronizacao[];
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

function CartaoFonte({ fonte, execucoes }: { fonte: string; execucoes: Sincronizacao[] }) {
  const ultima = execucoes[0];
  const falhasRecentes = execucoes.slice(0, 10).reduce((s, e) => s + e.falhas.length, 0);

  return (
    <Panel title={fonte}>
      {ultima ? (
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={ultima.status} />
            <span className="text-sm text-muted-foreground">
              Última sincronização {desde(ultima.created_at)} · {dataHora(ultima.created_at)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Ativos consultados", ultima.total_tickers],
              ["Atualizados", ultima.atualizados],
              ["Histórico gravado", ultima.historico_gravado],
              ["Falhas (10 últimas execuções)", falhasRecentes],
            ].map(([rotulo, valor]) => (
              <div key={String(rotulo)} className="rounded-lg border bg-muted/30 p-3">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>
          {ultima.erro ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {ultima.erro}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">Nenhuma sincronização registrada para esta fonte ainda.</p>
      )}
    </Panel>
  );
}

function Auditoria() {
  const { data: execucoes = [], isLoading, isFetching, refetch } = useSincronizacoes();

  const fontes = ["Tesouro Transparente", "Yahoo Finance / brapi.dev"];

  return (
    <AppShell
      title="Auditoria de dados"
      description="Acompanhe quando cada fonte de mercado sincronizou, quantos ativos foram atualizados e quais erros ocorreram. Ações, FIIs e ETFs atualizam a cada 15 min durante o pregão; o Tesouro Direto, uma vez por dia."
    >
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-end gap-4">
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
            Atualizar
          </Button>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          {fontes.map((fonte) => (
            <CartaoFonte key={fonte} fonte={fonte} execucoes={execucoes.filter((e) => e.fonte === fonte)} />
          ))}
        </div>

        <Panel title="Histórico de execuções">
          <div
            className="overflow-x-auto"
            data-scroll-region
            tabIndex={0}
            role="region"
            aria-label="Histórico de execuções de sincronização (rolável)"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 text-left font-semibold">Quando</th>
                  <th className="p-3 text-left font-semibold">Fonte</th>
                  <th className="p-3 text-left font-semibold">Status</th>
                  <th className="p-3 text-right font-semibold">Consultados</th>
                  <th className="p-3 text-right font-semibold">Atualizados</th>
                  <th className="p-3 text-right font-semibold">Histórico</th>
                  <th className="p-3 text-right font-semibold">Duração</th>
                  <th className="p-3 text-left font-semibold">Erros</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      Carregando execuções…
                    </td>
                  </tr>
                ) : execucoes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      Nenhuma sincronização registrada até o momento. A próxima execução automática aparecerá aqui.
                    </td>
                  </tr>
                ) : (
                  execucoes.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 align-top">
                      <td className="whitespace-nowrap p-3 tabular-nums">
                        {dataHora(e.created_at)}
                        <span className="block text-xs text-muted-foreground">
                          {desde(e.created_at)}
                          {e.dentro_do_pregao ? " · pregão aberto" : ""}
                        </span>
                      </td>
                      <td className="p-3">{e.fonte}</td>
                      <td className="p-3">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="p-3 text-right tabular-nums">{e.total_tickers}</td>
                      <td className="p-3 text-right tabular-nums">{e.atualizados}</td>
                      <td className="p-3 text-right tabular-nums">{e.historico_gravado}</td>
                      <td className="p-3 text-right tabular-nums">{(e.duracao_ms / 1000).toFixed(1)}s</td>
                      <td className="max-w-[22rem] p-3 text-xs text-muted-foreground">
                        {e.erro ? <span className="block text-destructive">{e.erro}</span> : null}
                        {e.falhas.length > 0 ? e.falhas.join(", ") : e.erro ? null : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
