import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, Loader2, Plus, ScanSearch, Trash2 } from "lucide-react";
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
import {
  executarScanMercado,
  lerConhecimentoMercado,
  type ConhecimentoItem,
} from "@/lib/conhecimento.functions";

const CORES_CATEGORIA: Record<ConhecimentoItem["categoria"], string> = {
  macro: "bg-sky-600/10 text-sky-600 border-sky-600/30",
  mercado: "bg-violet-600/10 text-violet-600 border-violet-600/30",
  setor: "bg-orange-600/10 text-orange-600 border-orange-600/30",
  educacao: "bg-emerald-600/10 text-emerald-600 border-emerald-600/30",
  noticias: "bg-amber-600/10 text-amber-600 border-amber-600/30",
  painel: "bg-rose-600/10 text-rose-600 border-rose-600/30",
};

const ROTULO_CATEGORIA: Record<ConhecimentoItem["categoria"], string> = {
  macro: "Macro",
  mercado: "Mercado",
  setor: "Setor",
  educacao: "Educação",
  noticias: "Notícias",
  painel: "Painel",
};

export function DialogoAprendizado() {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [instrucao, setInstrucao] = useState("");
  const habilidades = useIaHabilidades();
  const criar = useCriarHabilidade();
  const alternar = useAlternarHabilidade();
  const excluir = useExcluirHabilidade();
  const queryClient = useQueryClient();
  const lerConhecimento = useServerFn(lerConhecimentoMercado);
  const scanear = useServerFn(executarScanMercado);

  const conhecidas = new Set((habilidades.data ?? []).map((h) => h.nome));

  const conhecimento = useQuery({
    queryKey: ["gestor-conhecimento"],
    enabled: open,
    queryFn: () => lerConhecimento({ data: undefined }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const scan = useMutation({
    mutationFn: () => scanear({ data: undefined }),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["gestor-conhecimento"] });
      if (r.ignorado) {
        toast.info("O scan de conhecimento foi feito há pouco — os dados já estão atualizados.");
      } else {
        toast.success(`Scan concluído: ${r.base.itens.length} itens de conhecimento.`);
      }
    },
    onError: (e) =>
      toast.error("Não foi possível executar o scan agora", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  function haQuantoTempo(iso: string): string {
    const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    return `há ${h}h${min % 60 ? ` ${min % 60}min` : ""}`;
  }

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
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-1.5rem)] overflow-y-auto overflow-x-hidden sm:max-w-3xl lg:max-w-4xl p-5 sm:p-6 gap-5 border-border/50 shadow-xl sm:rounded-2xl">
        <DialogHeader className="space-y-2 pr-6 text-left">
          <DialogTitle className="font-display text-lg font-bold tracking-tight">
            Aprendizado do Gestor IA
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed break-words">
            Ensine novas habilidades ao seu consultor: ele passa a segui-las em todas as conversas
            enquanto estiverem ativas. Você pode ligar, desligar ou excluir cada ensino quando
            quiser.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={ensinar}
          className="grid w-full max-w-full gap-4 rounded-xl border border-border/60 bg-card/60 p-4 overflow-hidden"
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

        <div className="grid w-full max-w-full gap-3 overflow-hidden">
          <p className="text-sm font-semibold tracking-tight">
            Habilidades aprendidas ({habilidades.data?.length ?? 0})
          </p>
          {habilidades.isLoading ? (
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Carregando habilidades...
              </div>
              <span className="sr-only" role="status" aria-live="polite">
                Carregando habilidades
              </span>
            </div>
          ) : (habilidades.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground break-words">
              Nenhuma habilidade ainda. Crie uma acima ou adote uma das sugeridas abaixo.
            </p>
          ) : (
            <div className="grid gap-2 w-full max-w-full">
              {/* Header estilo tabela - apenas desktop */}
              <div className="hidden sm:grid grid-cols-[1fr_140px] gap-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border border-border/40">
                <span>Habilidade</span>
                <span className="text-right">Ações</span>
              </div>
              {(habilidades.data ?? []).map((h) => (
                <div
                  key={h.id}
                  className="flex w-full max-w-full items-start gap-3 overflow-hidden rounded-xl border border-border/60 bg-card/60 p-3 shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold break-words">
                        {h.titulo}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${h.ativo ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border/50"}`}
                      >
                        {h.ativo ? "ativa" : "pausada"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground break-words break-all sm:break-words">
                      {h.instrucao}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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
                      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() =>
                        excluir
                          .mutateAsync(h.id)
                          .then(() => toast.success("Habilidade esquecida."))
                          .catch(() => toast.error("Não foi possível esquecer a habilidade."))
                      }
                      aria-label={`Esquecer ${h.titulo}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid w-full max-w-full gap-3 overflow-hidden">
          <p className="text-sm font-semibold tracking-tight">Habilidades sugeridas</p>
          <div className="grid w-full max-w-full gap-2 overflow-hidden">
            {HABILIDADES_SUGERIDAS.map((s) => {
              const conhecida = conhecidas.has(s.nome);
              return (
                <div
                  key={s.nome}
                  className="flex w-full max-w-full items-start gap-3 overflow-hidden rounded-xl border border-dashed border-border/70 bg-card/30 p-3 transition-colors hover:bg-card/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-sm font-semibold break-words">{s.titulo}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground break-words">
                      {s.instrucao}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    disabled={conhecida || criar.isPending}
                    aria-label={conhecida ? `${s.titulo} já adotada` : `Adotar ${s.titulo}`}
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

        <div className="grid w-full max-w-full gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 min-w-0 w-full max-w-full">
            <p className="text-sm font-semibold tracking-tight min-w-0 break-words">
              Conhecimento de mercado ({conhecimento.data?.itens.length ?? 0} itens)
            </p>
            {conhecimento.data?.atualizadoEm ? (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/40">
                scan {haQuantoTempo(conhecimento.data.atualizadoEm)}
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={scan.isPending}
              aria-label="Scanear conhecimento de mercado"
              aria-busy={scan.isPending}
              onClick={() => scan.mutate()}
              title="Varre a internet (Banco Central, notícias e Google News) e atualiza a base do Gestor IA"
            >
              {scan.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <ScanSearch className="mr-1.5 size-3.5" aria-hidden="true" />
              )}
              Scanear agora
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed break-words">
            O scanner varre a internet (Banco Central, feeds de notícias e Google News) e estrutura
            o conhecimento que o Gestor IA usa nas conversas — ele escolhe os itens mais relevantes
            para cada pergunta automaticamente.
          </p>
          {conhecimento.isLoading ? (
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Carregando conhecimento...
              </div>
              <span className="sr-only" role="status" aria-live="polite">
                Carregando conhecimento de mercado
              </span>
            </div>
          ) : (
            <>
              {/* Tabela responsiva - desktop */}
              <div className="hidden sm:block w-full max-w-full overflow-hidden rounded-xl border border-border/60 bg-card/20">
                <div className="overflow-x-auto overscroll-x-contain">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    <thead className="bg-muted/40 border-b border-border/40">
                      <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2.5 w-[96px]">Categoria</th>
                        <th className="px-3 py-2.5">Conhecimento</th>
                        <th className="px-3 py-2.5 w-[140px] text-right">Fonte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {(conhecimento.data?.itens ?? []).slice(0, 12).map((i) => (
                        <tr
                          key={`${i.categoria}-${i.titulo}`}
                          className="hover:bg-muted/20 transition-colors focus-within:bg-muted/30"
                          tabIndex={0}
                        >
                          <td className="px-3 py-2.5 align-top">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CORES_CATEGORIA[i.categoria]}`}
                            >
                              {ROTULO_CATEGORIA[i.categoria]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-top min-w-0">
                            <p className="font-semibold leading-snug break-words">{i.titulo}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground break-words">
                              {i.conteudo}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 align-top text-right">
                            <p className="text-[11px] text-muted-foreground/80 break-words">
                              {i.fonte}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60">
                              {new Date(i.atualizadoEm).toLocaleDateString("pt-BR")}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Cards - mobile */}
              <div className="grid gap-2 sm:hidden w-full max-w-full">
                {(conhecimento.data?.itens ?? []).slice(0, 12).map((i) => (
                  <div
                    key={`${i.categoria}-${i.titulo}-m`}
                    className="flex w-full max-w-full items-start gap-3 overflow-hidden rounded-xl border border-border/60 bg-card/60 p-3 shadow-sm focus-within:ring-2 focus-within:ring-ring"
                    tabIndex={0}
                    role="article"
                    aria-label={`${ROTULO_CATEGORIA[i.categoria]}: ${i.titulo}`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CORES_CATEGORIA[i.categoria]}`}
                    >
                      {ROTULO_CATEGORIA[i.categoria]}
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="text-sm font-semibold leading-snug break-words">{i.titulo}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground break-words">
                        {i.conteudo}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/80 break-words">
                        {i.fonte} · {new Date(i.atualizadoEm).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {(conhecimento.data?.itens.length ?? 0) === 0 && !conhecimento.isLoading ? (
                <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground break-words">
                  Base vazia. Clique em "Scanear agora" para montar o conhecimento de mercado.
                </p>
              ) : null}
            </>
          )}
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
