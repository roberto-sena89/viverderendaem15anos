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

  const [ticker, setTicker] = useState("");
  const [tipo, setTipo] = useState<"acima" | "abaixo">("acima");
  const [valor, setValor] = useState("");

  async function criarAlerta() {
    const t = ticker.trim().toUpperCase();
    const v = Number.parseFloat(valor);
    if (!t || !Number.isFinite(v) || v <= 0) {
      toast.error("Informe ticker e valor alvo.");
      return;
    }
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session?.user?.id) {
      toast.error("Faça login para criar alertas.");
      return;
    }
    const { data, error } = await supabase
      .from("alertas_preco")
      .insert({ user_id: sessao.session.user.id, ticker: t, tipo, valor_alvo: v })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar alerta: " + error.message);
      return;
    }
    setAlertas((prev) => [data as AlertaPreco, ...prev]);
    setTicker("");
    setValor("");
    toast.success(`Alerta criado: ${t} ${tipo === "acima" ? "🔼" : "🔽"} R$ ${v.toFixed(2)}`);
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
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-24 flex-1">
            <Label className="text-xs">Ticker</Label>
            <Input
              placeholder="PETR4"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              maxLength={10}
            />
          </div>
          <div className="min-w-28">
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
          <div className="min-w-24 flex-1">
            <Label className="text-xs">Valor alvo (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="35,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={criarAlerta}>
            <Plus className="mr-1 size-3.5" /> Criar
          </Button>
        </div>

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
                  {alerta.tipo === "acima" ? "🔼" : "🔽"} R$ {alerta.valor_alvo.toFixed(2)}
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
      </CardContent>
    </Card>
  );
}
