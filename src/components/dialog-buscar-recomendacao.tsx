import { useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gerarRecomendacao } from "@/lib/recomendacao-ia.functions";
import { novoId, type LinhaRec, type Perfil } from "@/lib/carteira-recomendada-store";
import type { LinhaSugerida } from "@/lib/recomendacao-ia.server";

const HORIZONTES = ["Até 2 anos", "2 a 5 anos", "5 a 10 anos", "Mais de 10 anos"];
const OBJETIVOS = ["Aposentadoria", "Reserva de emergência", "Crescimento", "Renda passiva"];

export function DialogBuscarRecomendacao({
  open,
  onOpenChange,
  perfil,
  onAplicar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  perfil: Perfil;
  onAplicar: (linhas: LinhaRec[]) => void;
}) {
  const chamarIA = useServerFn(gerarRecomendacao);
  const [carregando, setCarregando] = useState(false);
  const [horizonte, setHorizonte] = useState(HORIZONTES[2]);
  const [objetivo, setObjetivo] = useState(OBJETIVOS[0]);
  const [centavos, setCentavos] = useState(1_000_000);
  const [sugestao, setSugestao] = useState<{ resumo: string; linhas: LinhaSugerida[] } | null>(null);

  const valorFormatado = (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  async function gerar() {
    setCarregando(true);
    try {
      const r = await chamarIA({
        data: { perfil, horizonte, objetivo, valor: centavos / 100 },
      });
      setSugestao(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a recomendação.");
    } finally {
      setCarregando(false);
    }
  }

  function aceitar() {
    if (!sugestao) return;
    onAplicar(sugestao.linhas.map((l) => ({ ...l, id: novoId() })));
    setSugestao(null);
    onOpenChange(false);
    toast.success("Sugestão aplicada à tabela de alocação.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="font-display text-lg font-bold">Buscar recomendação</DialogTitle>
          <DialogDescription>
            Gere uma sugestão de alocação com Inteligência Artificial.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Perfil de risco</Label>
                <Input value={perfil} readOnly className="bg-muted/40" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="horizonte">Horizonte de investimento</Label>
                <select
                  id="horizonte"
                  value={horizonte}
                  onChange={(e) => setHorizonte(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {HORIZONTES.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="objetivo">Objetivo</Label>
                <select
                  id="objetivo"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {OBJETIVOS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valor">Valor disponível (R$)</Label>
                <Input
                  id="valor"
                  inputMode="numeric"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={gerar} disabled={carregando} className="w-full sm:w-auto">
              {carregando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {carregando ? "Gerando…" : "Gerar recomendação com IA"}
            </Button>

            {sugestao ? (
              <div className="grid gap-3 rounded-lg border bg-primary-soft/40 p-4">
                <p className="text-sm">{sugestao.resumo}</p>
                <ul className="grid gap-1.5">
                  {sugestao.linhas.map((l, i) => (
                    <li
                      key={`${l.indexador}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-md bg-background/60 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{l.indexador}</span>
                        <span className="block truncate text-xs text-muted-foreground">{l.prazo}</span>
                      </span>
                      <span className="font-display font-bold tabular-nums">{l.alvo.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Sugestão gerada por IA com base nas informações fornecidas. Não constitui recomendação de
                  investimento formal. Consulte um profissional certificado antes de investir.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={aceitar}>Aceitar sugestão</Button>
                  <Button variant="outline" onClick={() => setSugestao(null)}>
                    Descartar
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t px-5 py-3 text-xs text-muted-foreground">
          <Search className="size-3.5" /> As sugestões são referências educativas e não substituem assessoria formal.
        </div>
      </DialogContent>
    </Dialog>
  );
}
