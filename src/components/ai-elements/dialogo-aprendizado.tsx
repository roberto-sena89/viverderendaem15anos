import { useState } from "react";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  HABILIDADES_SUGERIDAS,
  useAlternarHabilidade,
  useCriarHabilidade,
  useExcluirHabilidade,
  useIaHabilidades,
} from "@/lib/ia-habilidades";

export function DialogoAprendizado() {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [instrucao, setInstrucao] = useState("");
  const habilidades = useIaHabilidades();
  const criar = useCriarHabilidade();
  const alternar = useAlternarHabilidade();
  const excluir = useExcluirHabilidade();

  const conhecidas = new Set((habilidades.data ?? []).map((h) => h.nome));

  async function ensinar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !instrucao.trim()) {
      toast.error("Preencha o título e o que o Gestor IA deve aprender.");
      return;
    }
    try {
      await criar.mutateAsync({ nome: slug(titulo), titulo, instrucao });
      toast.success("Habilidade ensinada ao Gestor IA.");
      setTitulo("");
      setInstrucao("");
    } catch {
      toast.error("Não foi possível ensinar a habilidade.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-full"
          aria-label="Ensinar novas habilidades ao Gestor IA"
          title="Ensine novas habilidades ao Gestor IA"
        >
          <GraduationCap className="size-4 shrink-0 sm:mr-2" />
          <span className="hidden truncate sm:inline">Aprender</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            Aprendizado do Gestor IA
          </DialogTitle>
          <DialogDescription>
            Ensine novas habilidades ao seu consultor: ele passa a segui-las em todas as conversas
            enquanto estiverem ativas. Você pode ligar, desligar ou excluir cada ensino quando
            quiser.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={ensinar}
          className="grid gap-4 rounded-xl border border-border/60 bg-card/60 p-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="habilidade-titulo">Nome da habilidade</Label>
            <Input
              id="habilidade-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Leitura de notícias em tempo real"
              maxLength={60}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="habilidade-instrucao">O que o Gestor IA deve aprender</Label>
            <Textarea
              id="habilidade-instrucao"
              value={instrucao}
              onChange={(e) => setInstrucao(e.target.value)}
              placeholder="Ex.: Sempre que o usuário perguntar sobre o mercado, busque as notícias mais recentes, resuma as 2-3 principais e conecte com a carteira dele, citando a fonte e a data."
              rows={4}
              maxLength={1000}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={criar.isPending} className="rounded-full">
              <Plus className="mr-2 size-4" />
              Ensinar habilidade
            </Button>
          </div>
        </form>

        <div className="grid gap-3">
          <p className="text-sm font-semibold">
            Habilidades aprendidas ({habilidades.data?.length ?? 0})
          </p>
          {habilidades.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando habilidades...</p>
          ) : (habilidades.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma habilidade ainda. Crie uma acima ou adote uma das sugeridas abaixo.
            </p>
          ) : (
            (habilidades.data ?? []).map((h) => (
              <div
                key={h.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{h.titulo}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${h.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {h.ativo ? "ativa" : "pausada"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{h.instrucao}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={h.ativo}
                    onCheckedChange={(v) =>
                      alternar
                        .mutateAsync({ id: h.id, ativo: v })
                        .then(() =>
                          toast.success(v ? "Habilidade ativada." : "Habilidade pausada."),
                        )
                        .catch(() => toast.error("Não foi possível alterar a habilidade."))
                    }
                    aria-label={`Ativar ${h.titulo}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      excluir
                        .mutateAsync(h.id)
                        .then(() => toast.success("Habilidade esquecida."))
                        .catch(() => toast.error("Não foi possível esquecer a habilidade."))
                    }
                    aria-label={`Esquecer ${h.titulo}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-semibold">Habilidades sugeridas</p>
          <div className="grid gap-2">
            {HABILIDADES_SUGERIDAS.map((s) => {
              const conhecida = conhecidas.has(s.nome);
              return (
                <div
                  key={s.nome}
                  className="flex items-start gap-3 rounded-xl border border-dashed border-border/70 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{s.titulo}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.instrucao}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-full"
                    disabled={conhecida || criar.isPending}
                    onClick={() =>
                      criar
                        .mutateAsync({ nome: s.nome, titulo: s.titulo, instrucao: s.instrucao })
                        .then(() => toast.success("Habilidade adotada."))
                        .catch(() => toast.error("Não foi possível adotar a habilidade."))
                    }
                  >
                    {conhecida ? "Adotada" : "Adotar"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function slug(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9à-úãõç_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}
