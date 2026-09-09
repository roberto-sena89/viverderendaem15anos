import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellRing, History, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  criarAlertaPreco,
  listarDisparosAlertas,
  sugerirAlertasIA,
  verificarMeusAlertas,
  type DisparoAlerta,
} from "@/lib/alertas-preco.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AlertaPreco {
  id: string;
  ticker: string;
  tipo: "acima" | "abaixo";
  valor_alvo: number;
  ativo: boolean;
  disparado_em: string | null;
  mensagem?: string | null;
  variacao_percent?: number | null;
  frequencia?: string | null;
}

const ROTULO_FREQUENCIA: Record<string, string> = {
  uma_vez: "Uma vez",
  diaria: "No máximo 1x por dia",
  sempre: "Sempre que atingir",
};

function dataBr(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function reais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}


/** Painel de alertas de preço — cria, ativa/desativa, exclui. */
export function PainelAlertasPreco() {
  const [alertas, setAlertas] = useState<AlertaPreco[]>([]);
  const [historico, setHistorico] = useState<DisparoAlerta[]>([]);
  const listarHistorico = useServerFn(listarDisparosAlertas);

  const recarregar = useCallback(async () => {
    const { data } = await supabase
      .from("alertas_preco")
      .select("*")
      .order("criado_em", { ascending: false });
    if (data) setAlertas(data as AlertaPreco[]);
  }, []);

  const recarregarHistorico = useCallback(async () => {
    try {
      setHistorico(await listarHistorico({} as never));
    } catch {
      /* histórico indisponível */
    }
  }, [listarHistorico]);

  // Carrega alertas e histórico ao montar
  useEffect(() => {
    void recarregar();
    void recarregarHistorico();
  }, [recarregar, recarregarHistorico]);

  const sugerir = useServerFn(sugerirAlertasIA);
  const verificar = useServerFn(verificarMeusAlertas);
  const criar = useServerFn(criarAlertaPreco);
  const [ocupado, setOcupado] = useState<"" | "sugerir" | "verificar" | "criar">("");


  /** Pede ao Gestor IA alvos de preço com base na carteira real. */
  async function sugerirComIA() {
    setOcupado("sugerir");
    try {
      const r = await sugerir({ data: {} as never });
      await recarregar();
      toast.success(`${r.criados.length} alertas sugeridos por ${r.provedor}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O assistente não conseguiu sugerir alertas.");
    } finally {
      setOcupado("");
    }
  }

  /** Confere agora os preços e dispara as notificações dos alertas atingidos. */
  async function verificarAgora() {
    setOcupado("verificar");
    try {
      const r = await verificar({ data: {} as never });
      await recarregar();
      await recarregarHistorico();

      toast.success(
        r.disparados > 0
          ? `${r.disparados} alerta(s) atingido(s) — notificação enviada.`
          : `Nenhum alvo atingido agora (${r.verificados} alertas conferidos).`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível verificar os alertas.");
    } finally {
      setOcupado("");
    }
  }

  const [abrirNovo, setAbrirNovo] = useState(false);
  const [ticker, setTicker] = useState("");
  const [tipo, setTipo] = useState<"acima" | "abaixo">("acima");
  const [modo, setModo] = useState<"preco" | "percentual">("preco");
  const [valor, setValor] = useState("");
  const [percentual, setPercentual] = useState("");
  const [frequencia, setFrequencia] = useState<"uma_vez" | "diaria" | "sempre">("uma_vez");

  async function criarAlerta() {
    const t = ticker.trim().toUpperCase();
    const v = Number.parseFloat(valor.replace(",", "."));
    const p = Number.parseFloat(percentual.replace(",", "."));
    if (!t) {
      toast.error("Informe o ticker do ativo.");
      return;
    }
    if (modo === "preco" && (!Number.isFinite(v) || v <= 0)) {
      toast.error("Informe o preço alvo em reais.");
      return;
    }
    if (modo === "percentual" && (!Number.isFinite(p) || p <= 0)) {
      toast.error("Informe a variação em porcentagem.");
      return;
    }
    setOcupado("criar");
    try {
      const r = await criar({
        data: {
          ticker: t,
          tipo,
          frequencia,
          ...(modo === "preco" ? { valor_alvo: v } : { variacao_percent: p }),
        },
      });
      await recarregar();
      setAbrirNovo(false);
      setTicker("");
      setValor("");
      setPercentual("");
      toast.success(
        `Alerta criado: ${t} ${tipo === "acima" ? "acima" : "abaixo"} de ${reais(r.valor_alvo)}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar o alerta.");
    } finally {
      setOcupado("");
    }
  }


  async function toggleAlerta(id: string, ativo: boolean) {
    const { error } = await supabase.from("alertas_preco").update({ ativo }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar alerta.");
      return;
    }
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, ativo } : a)));
  }

  async function excluirAlerta(id: string) {
    const { error } = await supabase.from("alertas_preco").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir alerta.");
      return;
    }
    setAlertas((prev) => prev.filter((a) => a.id !== id));
    toast.success("Alerta excluído.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4 text-primary" />
          Alertas de Preço
        </CardTitle>
        <CardDescription>
          Receba notificações push quando um ativo atingir o preço alvo. As verificações ocorrem a
          cada atualização de preço no servidor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Criar alerta */}
        <Dialog open={abrirNovo} onOpenChange={setAbrirNovo}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-3.5" /> Criar alerta de preço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo alerta de preço</DialogTitle>
              <DialogDescription>
                Escolha o ativo, o alvo em reais ou em porcentagem e com que frequência você quer
                ser avisado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Ticker</Label>
                  <Input
                    placeholder="PETR4"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    maxLength={12}
                  />
                </div>
                <div>
                  <Label className="text-xs">Direção</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as "acima" | "abaixo")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acima">Acima de</SelectItem>
                      <SelectItem value="abaixo">Abaixo de</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Tipo de alvo</Label>
                <Select value={modo} onValueChange={(v) => setModo(v as "preco" | "percentual")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preco">Preço em reais</SelectItem>
                    <SelectItem value="percentual">Variação em porcentagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {modo === "preco" ? (
                <div>
                  <Label className="text-xs">Preço alvo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="35,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Variação (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="10"
                    value={percentual}
                    onChange={(e) => setPercentual(e.target.value)}
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Calculamos o preço alvo a partir da cotação atual do ativo.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs">Frequência do aviso</Label>
                <Select
                  value={frequencia}
                  onValueChange={(v) => setFrequencia(v as "uma_vez" | "diaria" | "sempre")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uma_vez">Uma vez</SelectItem>
                    <SelectItem value="diaria">No máximo 1x por dia</SelectItem>
                    <SelectItem value="sempre">Sempre que atingir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setAbrirNovo(false)}>
                Cancelar
              </Button>
              <Button onClick={criarAlerta} disabled={ocupado === "criar"}>
                {ocupado === "criar" && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                Criar alerta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={sugerirComIA}
            disabled={ocupado !== ""}
          >
            {ocupado === "sugerir" ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-3.5" />
            )}
            Sugerir alertas com o Gestor IA
          </Button>
          <Button size="sm" variant="outline" onClick={verificarAgora} disabled={ocupado !== ""}>
            {ocupado === "verificar" ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : (
              <BellRing className="mr-1 size-3.5" />
            )}
            Verificar agora
          </Button>
        </div>

        {/* Lista de alertas */}
        {alertas.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum alerta criado. Adicione um acima para começar.
          </p>
        )}
        <div className="space-y-2">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{alerta.ticker}</span>
                <Badge
                  variant={alerta.tipo === "acima" ? "default" : "destructive"}
                  className="text-[10px]"
                >
                  {alerta.tipo === "acima" ? "🔼" : "🔽"} {reais(Number(alerta.valor_alvo))}
                </Badge>
                {alerta.variacao_percent != null && (
                  <Badge variant="outline" className="text-[10px]">
                    {Number(alerta.variacao_percent).toLocaleString("pt-BR")}%
                  </Badge>
                )}
                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                  {ROTULO_FREQUENCIA[alerta.frequencia ?? "uma_vez"]}
                </Badge>
                {alerta.disparado_em && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Disparado
                  </Badge>
                )}

                {alerta.mensagem && (
                  <span className="text-muted-foreground w-full text-xs sm:w-auto">
                    {alerta.mensagem}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={alerta.ativo}
                  onCheckedChange={(v) => toggleAlerta(alerta.id, v)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => excluirAlerta(alerta.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Histórico de alertas disparados */}
        <div className="border-border/60 space-y-2 border-t pt-4">
          <div className="flex items-center gap-2">
            <History className="text-primary size-4" />
            <p className="text-foreground text-sm font-semibold">Histórico de alertas</p>
          </div>
          {historico.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Nenhum alerta disparou ainda. Quando um alvo for atingido, o registro aparece aqui com
              a data, a cotação do momento e o alvo.
            </p>
          ) : (
            <ul className="space-y-2">
              {historico.map((d) => (
                <li
                  key={d.id}
                  className="border-border/50 bg-background/40 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{d.ticker}</span>
                      <Badge
                        variant={d.tipo === "acima" ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {d.tipo === "acima" ? "🔼" : "🔽"} {reais(d.valor_alvo)}
                      </Badge>
                      {d.variacao_percent != null && (
                        <Badge variant="outline" className="text-[10px]">
                          {d.variacao_percent.toLocaleString("pt-BR")}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {dataBr(d.criado_em)} · cotação {reais(d.preco)} ·{" "}
                      {ROTULO_FREQUENCIA[d.frequencia] ?? d.frequencia}
                      {d.mensagem ? ` · ${d.mensagem}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

    </Card>
  );
}
