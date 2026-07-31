import { useEffect, useState } from "react";
import { Bell, BellRing, Clock, RefreshCw, Settings2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { pedirPermissaoPush, permissaoPush } from "@/lib/alertas-historico";
import { INTERVALOS, useCotacoesTempoReal } from "@/lib/cotacoes-tempo-real";


/** Tempo relativo curto ("há 12s", "às 14:32"). */
export function tempoRelativo(ts: number | null): string {
  if (!ts) return "—";
  const seg = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seg < 60) return `há ${seg}s`;
  if (seg < 3600) return `há ${Math.round(seg / 60)}min`;
  return `às ${new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Barra global de status da sincronização de cotações. */
export function StatusCotacoes({ sticky = true }: { sticky?: boolean }) {
  const {
    status,
    atualizadoEm,
    pregaoAberto,
    proximaAbertura,
    atualizarAgora,
    carregando,
    config,
    salvarConfig,
  } = useCotacoesTempoReal();

  // Re-renderiza a cada 10s para manter o "há Xs" vivo.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const [permissao, setPermissao] = useState<NotificationPermission | "indisponivel">("indisponivel");
  useEffect(() => setPermissao(permissaoPush()), []);



  const rotulo =
    status === "atualizando"
      ? "Atualizando cotações…"
      : status === "desatualizado"
        ? "Cotações desatualizadas — verifique sua conexão"
        : status === "manual"
          ? "Sincronização manual"
          : "Sincronizado em tempo real";

  const cor =
    status === "atualizando"
      ? "bg-warning"
      : status === "desatualizado"
        ? "bg-destructive"
        : status === "manual"
          ? "bg-muted-foreground"
          : "bg-success";

  return (
    <div
      className={`${sticky ? "sticky top-0 z-20" : ""} flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-card/95 px-3 py-2 backdrop-blur`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="relative flex size-2.5 shrink-0">
          {status === "ao-vivo" ? (
            <span className={`absolute inline-flex size-full animate-ping rounded-full ${cor} opacity-60`} />
          ) : null}
          <span className={`relative inline-flex size-2.5 rounded-full ${cor}`} />
        </span>
        <span className="truncate text-xs font-semibold sm:text-sm">{rotulo}</span>
      </span>

      <span className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground sm:text-xs">
        <Clock className="size-3.5 shrink-0" />
        {tempoRelativo(atualizadoEm)}
      </span>

      <span
        className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
          pregaoAberto ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        }`}
        title={pregaoAberto ? "Pregão em andamento" : `Abre ${proximaAbertura}`}
      >
        {pregaoAberto ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
        {pregaoAberto ? "Mercado aberto" : `Fechado · abre ${proximaAbertura}`}
      </span>

      <span className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={atualizarAgora}
          disabled={carregando}
          aria-label="Atualizar cotações agora"
          className="h-8 gap-1.5 px-2.5 text-xs"
        >
          <RefreshCw className={`size-3.5 ${carregando ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Atualizar agora</span>
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Configurar sincronização"
              className="h-8 px-2"
            >
              <Settings2 className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="sync-auto" className="text-sm">
                Sincronização automática
              </Label>
              <Switch
                id="sync-auto"
                checked={config.automatico}
                onCheckedChange={(v) => salvarConfig({ automatico: v })}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Intervalo</p>
              <div className="flex flex-wrap gap-1.5">
                {INTERVALOS.map((i) => (
                  <button
                    key={i.ms}
                    type="button"
                    disabled={!config.automatico}
                    onClick={() => salvarConfig({ intervaloMs: i.ms })}
                    aria-pressed={config.intervaloMs === i.ms}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      config.intervaloMs === i.ms
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {i.rotulo}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="sync-alerta" className="flex items-center gap-1.5 text-sm">
                  <Bell className="size-3.5" /> Alertar variação
                </Label>
                <Switch
                  id="sync-alerta"
                  checked={config.alertaAtivo}
                  onCheckedChange={(v) => salvarConfig({ alertaAtivo: v })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="sync-alerta-pct"
                  type="number"
                  min={0.5}
                  step={0.5}
                  disabled={!config.alertaAtivo}
                  value={config.alertaPercent}
                  onChange={(e) => salvarConfig({ alertaPercent: Number(e.target.value) || 5 })}
                  className="h-8 w-20 text-sm"
                  aria-label="Percentual de variação para alerta"
                />
                <span className="text-xs text-muted-foreground">% no dia</span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <Label htmlFor="sync-push" className="flex items-center gap-1.5 text-sm">
                  <BellRing className="size-3.5" /> Notificação push
                </Label>
                <Switch
                  id="sync-push"
                  disabled={!config.alertaAtivo || permissao === "indisponivel"}
                  checked={config.pushAtivo && permissao === "granted"}
                  onCheckedChange={async (v) => {
                    if (!v) {
                      salvarConfig({ pushAtivo: false });
                      return;
                    }
                    const p = await pedirPermissaoPush();
                    setPermissao(p);
                    if (p === "granted") {
                      salvarConfig({ pushAtivo: true });
                      toast.success("Notificações push ativadas neste dispositivo.");
                    } else {
                      salvarConfig({ pushAtivo: false });
                      toast.error("Permissão de notificações bloqueada no navegador.");
                    }
                  }}
                />
              </div>
              <p className="text-[0.7rem] leading-snug text-muted-foreground">
                {permissao === "indisponivel"
                  ? "Este navegador não suporta notificações."
                  : permissao === "denied"
                    ? "Permissão bloqueada — libere nas configurações do navegador."
                    : "Avisos do sistema quando um ativo passar do limite. O histórico fica no sino do cabeçalho."}
              </p>
            </div>

          </PopoverContent>
        </Popover>
      </span>
    </div>
  );
}
