import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
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
  CONFIG_IA_NATIVA,
  CONFIG_PADRAO,
  PRESETS_PROVEDOR,
  provedorAtivo,
  useProvedorIA,
  limparHistoricoTestes,
  lerHistoricoTestes,
  listarProvedoresBackend,
  registrarTeste,
  type ConfigProvedorIA,
  type ProvedorBackend,
  type RegistroTesteConexao,
} from "@/lib/provedor-ia";
import { testarProvedorIA, type ResultadoTesteProvedor } from "@/lib/testar-provedor.functions";

export function DialogoProvedorIA() {
  const { config, salvar, limpar, ativo } = useProvedorIA();
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<ConfigProvedorIA>(config);
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState<ResultadoTesteProvedor | null>(null);
  const [historico, setHistorico] = useState<RegistroTesteConexao[]>([]);
  const [apenasFree, setApenasFree] = useState(true);
  const [provedoresBackend, setProvedoresBackend] = useState<ProvedorBackend[]>([]);
  const presetAtual = PRESETS_PROVEDOR.find((p) => p.id === rascunho.preset);
  const modelos = teste?.modelos ?? [];
  const ehFree = (m: string) =>
    Boolean(presetAtual?.modelosGratuitos?.includes(m)) || /(:free\b|\bfree\b|-free)/i.test(m);
  const totalFree = modelos.filter(ehFree).length;
  const modelosVisiveis = apenasFree ? modelos.filter(ehFree) : modelos;
  const executarTeste = useServerFn(testarProvedorIA);

  useEffect(() => {
    if (aberto) {
      setRascunho(config);
      setTeste(null);
      setHistorico(lerHistoricoTestes());
      listarProvedoresBackend()
        .then(setProvedoresBackend)
        .catch(() => {});
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

  function provedorBackendConfigurado(id: string): ProvedorBackend | undefined {
    return provedoresBackend.find((p) => p.configurado && (p.id === id || p.nome === id));
  }

  const backendConfigurado = provedorBackendConfigurado(rascunho.preset);

  function escolherPreset(id: string) {
    setRascunho((r) => {
      const chaves =
        r.preset !== "lovable" && r.chave.trim()
          ? { ...r.chavesPorProvedor, [r.preset]: r.chave.trim() }
          : r.chavesPorProvedor;
      if (id === "lovable") {
        return { ...CONFIG_IA_NATIVA, chavesPorProvedor: chaves };
      }
      const alvo = PRESETS_PROVEDOR.find((p) => p.id === id);
      return {
        preset: id,
        baseUrl: alvo?.baseUrl ?? "",
        modelo: alvo?.modelos[0] ?? r.modelo,
        chave: chaves[id] ?? "",
        chavesPorProvedor: chaves,
      };
    });
  }

  function confirmar() {
    if (rascunho.preset === "lovable") {
      salvar({ ...CONFIG_IA_NATIVA, chavesPorProvedor: rascunho.chavesPorProvedor });
      toast.success("Gestor IA voltou a usar a IA nativa da plataforma");
      setAberto(false);
      return;
    }
    const backend = provedorBackendConfigurado(rascunho.preset);
    if (backend) {
      salvar({ ...rascunho, chave: "" });
      toast.success("Provedor de IA configurado", {
        description: `${preset?.nome ?? "Personalizado"} · ${rascunho.modelo} · via servidor`,
      });
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
                <SelectItem value="lovable">IA nativa da plataforma</SelectItem>
                {PRESETS_PROVEDOR.map((p) => {
                  const backend = provedorBackendConfigurado(p.id);
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                      {backend ? " (servidor)" : ""}
                    </SelectItem>
                  );
                })}
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
                  placeholder="nvidia/nemotron-3-ultra-550b-a55b:free"
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
                <div className="relative">
                  <Input
                    id="ia-chave"
                    type="password"
                    value={rascunho.chave}
                    disabled={Boolean(backendConfigurado)}
                    onChange={(e) =>
                      setRascunho((r) => ({
                        ...r,
                        chave: e.target.value,
                        chavesPorProvedor:
                          r.preset !== "lovable"
                            ? { ...r.chavesPorProvedor, [r.preset]: e.target.value }
                            : r.chavesPorProvedor,
                      }))
                    }
                    placeholder={backendConfigurado ? "Configurado no servidor" : "sk-..."}
                    autoComplete="off"
                  />
                  {backendConfigurado && (
                    <Lock className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2" />
                  )}
                </div>
                {backendConfigurado ? (
                  <p className="text-muted-foreground text-xs">
                    Configurado no servidor • chave não precisa ser digitada
                  </p>
                ) : (
                  preset?.urlChave && (
                    <a
                      href={preset.urlChave}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                    >
                      Obter chave gratuita <ExternalLink className="size-3" />
                    </a>
                  )
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-muted-foreground text-xs">
                        {apenasFree
                          ? "Modelos gratuitos — clique para usar:"
                          : "Modelos disponíveis — clique para usar:"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setApenasFree((v) => !v)}
                        aria-pressed={apenasFree}
                        title={
                          apenasFree
                            ? "Mostrar todos os modelos"
                            : "Mostrar apenas modelos gratuitos"
                        }
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                          apenasFree
                            ? "border-primary/60 bg-primary/15 text-primary"
                            : "border-border/60 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Sparkles className="size-3" />
                        {apenasFree ? "Somente FREE" : "Mostrar todos"}
                        <span className="opacity-70">({totalFree})</span>
                      </button>
                    </div>
                    {apenasFree && modelosVisiveis.length === 0 && (
                      <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-[11px]">
                        Nenhum modelo gratuito encontrado neste provedor.
                      </p>
                    )}
                    <div className="border-border/60 max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                      {modelosVisiveis.map((m) => {
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
                                  selecionado ? "text-primary" : "text-muted-foreground"
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

                {/* Histórico de testes de conexão — diagnóstico client-side */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">
                      Histórico de testes ({historico.length})
                    </p>
                    {historico.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          limparHistoricoTestes();
                          setHistorico([]);
                          toast.success("Histórico de testes limpo");
                        }}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
                        title="Limpar histórico de testes"
                      >
                        <Trash2 className="size-3" /> Limpar
                      </button>
                    )}
                  </div>
                  {historico.length === 0 ? (
                    <p className="text-muted-foreground/70 py-2 text-center text-[11px]">
                      Nenhum teste registrado ainda. Use “Testar conexão” para começar.
                    </p>
                  ) : (
                    <ul className="border-border/60 max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                      {historico.map((r) => (
                        <li
                          key={r.timestamp}
                          className="flex items-start gap-2 rounded-md px-1.5 py-1 text-[11px]"
                        >
                          <span
                            className={`mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full ${
                              r.ok ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative"
                            }`}
                            aria-label={r.ok ? "Sucesso" : "Falha"}
                          >
                            {r.ok ? (
                              <CheckCircle2 className="size-2.5" />
                            ) : (
                              <XCircle className="size-2.5" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{r.provedor}</span>
                              <span className="text-muted-foreground shrink-0">
                                {new Date(r.timestamp).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {r.status ? (
                                <span
                                  className={`shrink-0 rounded px-1 font-mono text-[10px] ${
                                    r.ok
                                      ? "bg-positive/10 text-positive"
                                      : "bg-negative/10 text-negative"
                                  }`}
                                >
                                  {r.status}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-muted-foreground truncate">{r.resumo}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
