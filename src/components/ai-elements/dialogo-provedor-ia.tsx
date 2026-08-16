import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plug,
  PlugZap,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONFIG_PADRAO,
  PRESETS_PROVEDOR,
  provedorAtivo,
  useProvedorIA,
  limparHistoricoTestes,
  lerHistoricoTestes,
  registrarTeste,
  type ConfigProvedorIA,
  type RegistroTesteConexao,
} from "@/lib/provedor-ia";
import {
  testarProvedorIA,
  type ResultadoTesteProvedor,
} from "@/lib/testar-provedor.functions";

export function DialogoProvedorIA() {
  const { config, salvar, limpar, ativo } = useProvedorIA();
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<ConfigProvedorIA>(config);
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState<ResultadoTesteProvedor | null>(null);
  const [historico, setHistorico] = useState<RegistroTesteConexao[]>([]);
  const executarTeste = useServerFn(testarProvedorIA);

  useEffect(() => {
    if (aberto) {
      setRascunho(config);
      setTeste(null);
      setHistorico(lerHistoricoTestes());
    }
  }, [aberto, config]);

  async function testarConexao() {
    setTestando(true);
    setTeste(null);
    try {
      const resultado = await executarTeste({
        data: { baseUrl: rascunho.baseUrl.trim(), chave: rascunho.chave.trim() },
      });
      setTeste(resultado);
      const nomeProvedor =
        PRESETS_PROVEDOR.find((p) => p.id === rascunho.preset)?.nome ?? "Personalizado";
      registrarTeste({
        provedor: nomeProvedor,
        ok: resultado.ok,
        status: resultado.status,
        resumo: resultado.mensagem,
      });
      setHistorico(lerHistoricoTestes());
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error("Falha na conexão", { description: resultado.mensagem });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Erro inesperado no teste";
      const fallback: ResultadoTesteProvedor = {
        ok: false,
        status: 0,
        mensagem,
        modelos: [],
      };
      setTeste(fallback);
      const nomeProvedor =
        PRESETS_PROVEDOR.find((p) => p.id === rascunho.preset)?.nome ?? "Personalizado";
      registrarTeste({
        provedor: nomeProvedor,
        ok: false,
        status: 0,
        resumo: mensagem,
      });
      setHistorico(lerHistoricoTestes());
      toast.error("Falha ao testar conexão", { description: mensagem });
    } finally {
      setTestando(false);
    }
  }


  const preset = PRESETS_PROVEDOR.find((p) => p.id === rascunho.preset);

  function escolherPreset(id: string) {
    if (id === "lovable") {
      setRascunho({ ...CONFIG_PADRAO, chavesPorProvedor: rascunho.chavesPorProvedor });
      return;
    }
    const alvo = PRESETS_PROVEDOR.find((p) => p.id === id);
    setRascunho({
      preset: id,
      baseUrl: alvo?.baseUrl ?? "",
      modelo: alvo?.modelos[0] ?? "",
      // lembra a chave já usada neste navegador para o provedor escolhido
      chave:
        rascunho.preset === id ? rascunho.chave : (rascunho.chavesPorProvedor[id] ?? ""),
      chavesPorProvedor: rascunho.chavesPorProvedor,
    });
  }

  function confirmar() {
    if (rascunho.preset === "lovable") {
      salvar({ ...CONFIG_PADRAO, chavesPorProvedor: rascunho.chavesPorProvedor });
      toast.success("Gestor IA voltou a usar a IA nativa da plataforma");
      setAberto(false);
      return;
    }
    if (!provedorAtivo(rascunho)) {
      toast.error("Preencha a URL base, o modelo e a chave de API do provedor");
      return;
    }
    salvar(rascunho);
    toast.success("Provedor de IA configurado", {
      description: `${preset?.nome ?? "Personalizado"} · ${rascunho.modelo} · salvo neste navegador`,
    });
    setAberto(false);
  }


  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 shrink-0 rounded-full px-3 ${ativo ? "border-primary/60 bg-primary/10 text-primary" : ""}`}
          aria-label="Configurar provedores de IA gratuitos"
          title="Configurar provedores de IA gratuitos"
        >
          <Plug className="size-4 shrink-0 sm:mr-1.5" />
          <span className="hidden truncate sm:inline">Provedor IA</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary size-5" /> Provedores de IA
          </DialogTitle>
          <DialogDescription>
            Use a IA nativa da plataforma ou conecte um provedor gratuito compatível com a API
            OpenAI. A chave fica salva apenas neste navegador e é usada só nas suas conversas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Provedor</Label>
            <Select value={rascunho.preset} onValueChange={escolherPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">IA nativa da plataforma (padrão)</SelectItem>
                {PRESETS_PROVEDOR.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {preset ? (
              <p className="text-muted-foreground text-xs">{preset.descricao}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Modelo gerenciado pela plataforma, sem chave nem custo extra para você.
              </p>
            )}
          </div>

          {rascunho.preset !== "lovable" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ia-base-url">URL base da API</Label>
                <Input
                  id="ia-base-url"
                  value={rascunho.baseUrl}
                  onChange={(e) => setRascunho({ ...rascunho, baseUrl: e.target.value })}
                  placeholder="https://openrouter.ai/api/v1"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ia-modelo">Modelo</Label>
                <Input
                  id="ia-modelo"
                  value={rascunho.modelo}
                  onChange={(e) => setRascunho({ ...rascunho, modelo: e.target.value })}
                  placeholder="deepseek/deepseek-chat-v3-0324:free"
                  autoComplete="off"
                />
                {(preset?.modelos.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {preset?.modelos.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setRascunho({ ...rascunho, modelo: m })}
                        className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                          rascunho.modelo === m
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ia-chave">Chave de API</Label>
                <Input
                  id="ia-chave"
                  type="password"
                  value={rascunho.chave}
                  onChange={(e) => setRascunho({ ...rascunho, chave: e.target.value })}
                  placeholder="sk-..."
                  autoComplete="off"
                />
                {preset?.urlChave && (
                  <a
                    href={preset.urlChave}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                  >
                    Obter chave gratuita <ExternalLink className="size-3" />
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={testando || !rascunho.baseUrl.trim() || !rascunho.chave.trim()}
                  onClick={testarConexao}
                >
                  {testando ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <PlugZap className="mr-1.5 size-4" />
                  )}
                  Testar conexão
                </Button>

                {teste && (
                  <div
                    className={`rounded-lg border p-3 text-xs ${
                      teste.ok
                        ? "border-positive/40 bg-positive/10 text-positive"
                        : "border-negative/40 bg-negative/10 text-negative"
                    }`}
                    role="status"
                  >
                    <p className="flex items-start gap-1.5 font-medium">
                      {teste.ok ? (
                        <CheckCircle2 className="mt-px size-3.5 shrink-0" />
                      ) : (
                        <XCircle className="mt-px size-3.5 shrink-0" />
                      )}
                      <span className="break-words">
                        {teste.mensagem}
                        {teste.status ? ` (HTTP ${teste.status})` : ""}
                      </span>
                    </p>
                  </div>
                )}

                {teste?.ok && teste.modelos.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs">
                      Modelos disponíveis — clique para usar:
                    </p>
                    <div className="border-border/60 max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                      {teste.modelos.map((m) => {
                        const selecionado = rascunho.modelo === m;
                        return (
                          <div
                            key={m}
                            className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 transition-colors ${
                              selecionado
                                ? "border-primary/60 bg-primary/10"
                                : "border-transparent hover:bg-muted/50"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setRascunho({ ...rascunho, modelo: m })}
                              className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                              title="Selecionar modelo"
                            >
                              <span
                                className={`flex h-2 w-2 shrink-0 rounded-full ${
                                  selecionado ? "bg-primary" : "bg-muted-foreground/40"
                                }`}
                              />
                              <span
                                className={`truncate font-mono text-[11px] ${
                                  selecionado
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {m}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={selecionado}
                              onClick={() => setRascunho({ ...rascunho, modelo: m })}
                              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                selecionado
                                  ? "bg-primary/20 text-primary"
                                  : "bg-primary/10 text-primary hover:bg-primary/20"
                              }`}
                            >
                              {selecionado ? (
                                <>
                                  <CheckCircle2 className="size-3" /> Em uso
                                </>
                              ) : (
                                <>
                                  <Sparkles className="size-3" /> Usar este modelo
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              limpar();
              setRascunho({ ...CONFIG_PADRAO });
              toast.success("Configuração removida");
              setAberto(false);
            }}
          >
            Restaurar padrão
          </Button>
          <Button onClick={confirmar}>Salvar provedor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
