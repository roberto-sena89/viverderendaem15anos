import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Eye,
  Loader2,
  RefreshCw,
  Sparkles,
  Radio,
  RadioTower,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { isNovaOportunidade, type VereditoObservador } from "@/lib/observador-mercado-base";
import {
  executarObservadorMercado,
  lerObservadorMercado,
} from "@/lib/observador-mercado.functions";

const CORES_VEREDITO: Record<VereditoObservador, string> = {
  comprar: "border-emerald-600/40 bg-emerald-600/10 text-emerald-600",
  observar: "border-amber-600/40 bg-amber-600/10 text-amber-600",
  manter: "border-sky-600/40 bg-sky-600/10 text-sky-600",
  vender: "border-red-600/40 bg-red-600/10 text-red-600",
};

const ROTULO_VEREDITO: Record<VereditoObservador, string> = {
  comprar: "Comprar",
  observar: "Observar",
  manter: "Manter",
  vender: "Vender",
};

function haQuantoTempo(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h}h${min % 60 ? ` ${min % 60}min` : ""}`;
}

/** Card do Observador de Mercado no Radar: estado da varredura + briefing. */
export function ObservadorMercado({ aoSelecionar }: { aoSelecionar?: (ticker: string) => void }) {
  const queryClient = useQueryClient();
  const executar = useServerFn(executarObservadorMercado);

  const {
    data: estado,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["radar", "observador"],
    queryFn: () => lerObservadorMercado({ data: undefined }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const [aoVivo, setAoVivo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const varredura = estado?.atual ?? null;
  const novas = useMemo(
    () =>
      estado
        ? isNovaOportunidade(
            estado.atual?.oportunidades ?? [],
            estado.anterior?.oportunidades ?? [],
          )
        : new Set<string>(),
    [estado],
  );

  useEffect(() => {
    if (aoVivo) {
      timerRef.current = setInterval(() => {
        void refetch();
      }, 30_000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [aoVivo, refetch]);

  async function observarAgora() {
    try {
      const r = await executar({ data: undefined });
      void queryClient.invalidateQueries({ queryKey: ["radar", "observador"] });
      void refetch();
      if (r.ignorado) {
        const espera = r.proximaEmMin ?? 10;
        toast.info(`O Observador já varreu há pouco — próxima varredura em ~${espera} min.`);
        return;
      }
      if (r.erro) {
        toast.error("Observador não conseguiu varrer o mercado", { description: r.erro });
        return;
      }
      toast.success("Varredura concluída — novas oportunidades observadas.");
    } catch (error) {
      toast.error("Não foi possível executar a varredura", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <section
      aria-label="Observador de Mercado"
      className="w-full max-w-full overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="text-primary size-4" aria-hidden />
            Observador de Mercado
          </h2>
          {varredura?.erro ? (
            <Badge
              variant="secondary"
              className="gap-1 border-red-600/40 bg-red-600/10 text-red-600"
            >
              <AlertTriangle className="size-3" aria-hidden /> Falhou agora
            </Badge>
          ) : varredura ? (
            <Badge
              variant="secondary"
              className="gap-1 border-emerald-600/40 bg-emerald-600/10 text-emerald-600"
            >
              <Sparkles className="size-3" aria-hidden /> Varredura{" "}
              {haQuantoTempo(varredura.executadaEm)}
            </Badge>
          ) : (
            <Badge variant="secondary">Sem varredura ainda</Badge>
          )}
          {aoVivo ? (
            <Badge variant="secondary" className="gap-1 border-sky-600/40 bg-sky-600/10 text-sky-600">
              <RadioTower className="size-3 animate-pulse" aria-hidden /> Sincronizando com Kilo
            </Badge>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant={aoVivo ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setAoVivo((v) => !v)}
              title={
                aoVivo
                  ? "Desativar sincronização em tempo real com o Kilo"
                  : "Ativar sincronização em tempo real com o Kilo"
              }
            >
              {aoVivo ? (
                <RadioTower className="size-3.5 shrink-0 animate-pulse" aria-hidden />
              ) : (
                <Radio className="size-3.5 shrink-0" aria-hidden />
              )}
              {aoVivo ? "Ao vivo" : "Sincronizar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => void observarAgora()}
              disabled={isFetching}
              title="Executa uma varredura agora (mínimo 10 min entre execuções)"
            >
              {isFetching ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5 shrink-0" aria-hidden />
              )}
              Observar agora
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-muted-foreground text-xs">
            Não foi possível ler o estado do Observador agora.
          </p>
        ) : varredura?.erro ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
            {varredura.erro}
          </p>
        ) : varredura ? (
          <>
            {varredura.resumo ? (
              <p className="max-w-3xl text-sm leading-relaxed">{varredura.resumo}</p>
            ) : null}

            {varredura.oportunidades.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {varredura.oportunidades.map((op) => (
                  <button
                    key={op.ticker}
                    type="button"
                    onClick={() => aoSelecionar?.(op.ticker)}
                    title={`${op.motivo}${op.gatilho ? ` — Gatilho: ${op.gatilho}` : ""}`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:opacity-80 ${CORES_VEREDITO[op.veredito]}`}
                  >
                    {novas.has(op.ticker) ? (
                      <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-bold text-primary-foreground">
                        NOVO
                      </span>
                    ) : null}
                    {op.ticker}
                    <span className="opacity-80">· {ROTULO_VEREDITO[op.veredito]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Nenhuma oportunidade relevante nesta varredura.
              </p>
            )}

            {varredura.alertas.length > 0 ? (
              <ul className="space-y-1">
                {varredura.alertas.map((a) => (
                  <li key={a} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-px size-3 shrink-0 text-red-600" aria-hidden />
                    {a}
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
              {varredura.provedor ? `${varredura.provedor} · ${varredura.modelo}` : "Sem provedor"}{" "}
              · {varredura.totalCandidatos} candidatos · {varredura.duracaoMs / 1000}s
              {varredura.macro.selic !== null || varredura.macro.ipca !== null
                ? ` · Selic ${varredura.macro.selic !== null ? `${varredura.macro.selic}%` : "—"} · IPCA ${varredura.macro.ipca !== null ? `${varredura.macro.ipca}%` : "—"}`
                : ""}{" "}
              · clique em um ativo para abrir a ficha completa
            </p>
          </>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
            O Observador de Mercado ainda não varreu o radar. Configure a chave de um provedor
            gratuito nas variáveis de ambiente e clique em "Observar agora" — depois disso a
            varredura acontece sozinha a cada 10–30 minutos.
          </p>
        )}
      </div>
    </section>
  );
}
