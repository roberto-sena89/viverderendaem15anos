import { useState } from "react";
import { BadgeCheck, Loader2, Search, Sparkles, Star, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gerarRecomendacao } from "@/lib/recomendacao-ia.functions";
import { novoId, type LinhaRec, type Perfil } from "@/lib/carteira-recomendada-store";
import type { LinhaSugerida } from "@/lib/recomendacao-ia.server";

type Profissional = {
  nome: string;
  certificacao: string;
  especialidade: string;
  atendimento: "Online" | "Presencial";
  nota: number;
  verificado: boolean;
};

const PROFISSIONAIS: Profissional[] = [
  { nome: "Marina Alves", certificacao: "CFP®", especialidade: "Planejamento de aposentadoria", atendimento: "Online", nota: 4.9, verificado: true },
  { nome: "Rafael Nogueira", certificacao: "CEA", especialidade: "Renda fixa", atendimento: "Online", nota: 4.7, verificado: true },
  { nome: "Bianca Ferraz", certificacao: "CGA", especialidade: "Fundos imobiliários", atendimento: "Presencial", nota: 4.8, verificado: true },
  { nome: "Diego Martins", certificacao: "CEA", especialidade: "Renda variável", atendimento: "Online", nota: 4.5, verificado: false },
  { nome: "Ana Paula Reis", certificacao: "CFP®", especialidade: "Renda variável", atendimento: "Presencial", nota: 4.6, verificado: true },
  { nome: "Consultoria Vértice", certificacao: "AAI", especialidade: "Renda fixa", atendimento: "Online", nota: 4.4, verificado: false },
];

const ESPECIALIDADES = ["Todas", "Renda fixa", "Renda variável", "Fundos imobiliários", "Planejamento de aposentadoria"];
const ATENDIMENTOS = ["Todos", "Online", "Presencial"];
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
  const [valor, setValor] = useState("10000");
  const [sugestao, setSugestao] = useState<{ resumo: string; linhas: LinhaSugerida[] } | null>(null);

  const [especialidade, setEspecialidade] = useState("Todas");
  const [atendimento, setAtendimento] = useState("Todos");
  const [contato, setContato] = useState<Profissional | null>(null);

  const lista = PROFISSIONAIS.filter(
    (p) =>
      (especialidade === "Todas" || p.especialidade === especialidade) &&
      (atendimento === "Todos" || p.atendimento === atendimento),
  );

  async function gerar() {
    setCarregando(true);
    try {
      const r = await chamarIA({
        data: { perfil, horizonte, objetivo, valor: Number(valor.replace(/\D/g, "")) },
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
            Gere uma sugestão com Inteligência Artificial ou fale com um profissional certificado.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ia" className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-5 py-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ia" className="gap-2">
                <Sparkles className="size-4" /> Inteligência Artificial
              </TabsTrigger>
              <TabsTrigger value="pro" className="gap-2">
                <UserRound className="size-4" /> Assessoria certificada
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="ia" className="mt-0 grid gap-4">
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
            </TabsContent>

            <TabsContent value="pro" className="mt-0 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="esp">Especialidade</Label>
                  <select
                    id="esp"
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {ESPECIALIDADES.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="atd">Tipo de atendimento</Label>
                  <select
                    id="atd"
                    value={atendimento}
                    onChange={(e) => setAtendimento(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {ATENDIMENTOS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2">
                {lista.map((p) => (
                  <li key={p.nome} className="grid gap-2 rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-display text-sm font-bold">
                          <span className="truncate">{p.nome}</span>
                          {p.verificado ? <BadgeCheck className="size-4 shrink-0 text-primary" /> : null}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.especialidade}</p>
                      </div>
                      <Badge variant="secondary">{p.certificacao}</Badge>
                    </div>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="size-3.5 fill-primary text-primary" /> {p.nota.toFixed(1)} · {p.atendimento}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setContato(p)}>
                      Solicitar contato
                    </Button>
                  </li>
                ))}
                {lista.length === 0 ? (
                  <li className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    Nenhum profissional encontrado com esses filtros.
                  </li>
                ) : null}
              </ul>

              {contato ? (
                <form
                  className="grid gap-3 rounded-lg border bg-muted/30 p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContato(null);
                    toast.success(`Solicitação enviada para ${contato.nome}.`);
                  }}
                >
                  <p className="font-display text-sm font-bold">Solicitar contato · {contato.nome}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input name="nome" placeholder="Seu nome" required maxLength={100} />
                    <Input name="email" type="email" placeholder="E-mail" required maxLength={255} />
                    <Input name="telefone" placeholder="Telefone" maxLength={20} />
                  </div>
                  <Textarea name="mensagem" placeholder="Mensagem (opcional)" maxLength={1000} rows={3} />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      Enviar solicitação
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setContato(null)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : null}
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center gap-2 border-t px-5 py-3 text-xs text-muted-foreground">
          <Search className="size-3.5" /> As sugestões são referências educativas e não substituem assessoria formal.
        </div>
      </DialogContent>
    </Dialog>
  );
}
