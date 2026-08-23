import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, Eraser, FileText, LineChart, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { OnboardingGestorIA } from "@/components/ai-elements/onboarding-gestor-ia";


import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { DialogoAprendizado } from "@/components/ai-elements/dialogo-aprendizado";
import { DialogoProvedorIA } from "@/components/ai-elements/dialogo-provedor-ia";
import { ResumoCarteiraDialog } from "@/components/ai-elements/resumo-carteira-dialog";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { SkeletonAnalisando, SkeletonHistorico } from "@/components/ai-elements/skeleton-gestor-ia";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { listarMensagens, limparConversa } from "@/lib/chat.functions";
import { gerarRelatorioAuditoria } from "@/lib/relatorio.functions";
import { gerarPdfRelatorioAuditoria } from "@/lib/relatorio-auditoria-pdf";
import { PERFIS, usePerfilInvestidor, type PerfilInvestidor } from "@/lib/perfil-investidor";
import { cabecalhosProvedor, useProvedorIA } from "@/lib/provedor-ia";
import logoIA from "@/assets/tecnico-ia.png";
import { urlAbsoluta } from "@/lib/seo";
import { emitirRespostaGestorIA } from "@/lib/radar-sync";

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" ? { q: search["q"] } : {},

  component: ChatPage,

  head: () => ({
    meta: [
      { title: "Gestor IA — Assistente da sua carteira | Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Converse com o Gestor IA sobre a sua carteira: rebalanceamento, aportes, dividendos e metas de independência financeira.",
      },
      { property: "og:title", content: "Gestor IA — Assistente da sua carteira" },
      {
        property: "og:description",
        content:
          "Análises da sua carteira de ações, FIIs e renda fixa com inteligência artificial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: urlAbsoluta("/chat") }],
  }),
});

const SUGESTOES = [
  "Faça uma auditoria completa da minha carteira",
  "Como está minha diversificação e concentração?",
  "Quanto falta para eu viver de renda?",
  "Quanto devo aportar por mês para antecipar minha independência?",
  "Sugira um plano de rebalanceamento para minha carteira",
  "Quais ativos devo olhar para fortalecer minha carteira?",
  "Como está meu progresso rumo às minhas metas?",
  "O que está acontecendo no mercado hoje?",
];

function ChatPage() {
  const queryClient = useQueryClient();
  const fetchMensagens = useServerFn(listarMensagens);
  const clearFn = useServerFn(limparConversa);
  const { perfil, salvar } = usePerfilInvestidor();
  const { config: provedor } = useProvedorIA();
  const [showOnboarding, setShowOnboarding] = useState(() =>
    typeof window !== "undefined" ? !window.localStorage.getItem("gestor-ia-onboarded") : false,
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState("");
  const [citacoes, setCitacoes] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("chat-citacoes") === "on" : false,
  );
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const gerarRelatorio = useServerFn(gerarRelatorioAuditoria);

  const historico = useQuery({
    queryKey: ["chat-mensagens"],
    queryFn: () => fetchMensagens({ data: undefined }),
  });

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      (historico.data ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text" as const, text: m.texto }],
      })),
    [historico.data],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "X-Perfil-Investidor": perfil,
            "X-Modo-Citacoes": citacoes ? "on" : "off",
            ...cabecalhosProvedor(provedor),
          };
        },
      }),
    [perfil, citacoes, provedor],
  );

  const { messages, sendMessage, setMessages, status } = useChat({
    id: "gestor-ia",
    transport,
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("aborted") || message.includes("AbortError")) {
        return;
      }
      toast.error("Não foi possível falar com o Gestor IA", {
        description: message.includes("429")
          ? "Muitas mensagens em sequência. Aguarde alguns instantes."
          : message.includes("402") || /payment required/i.test(message)
            ? "Os créditos de IA do workspace acabaram. Adicite créditos em Configurações → Planos e uso dentro da Lovable."
            : message,
      });
    },
  });

  const hidratado = useRef(false);
  useEffect(() => {
    if (hidratado.current || !historico.isSuccess || initialMessages.length === 0) return;
    hidratado.current = true;
    setMessages(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historico.isSuccess]);

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  /* Pergunta vinda de outra tela (ex.: Radar de Oportunidades) via ?q=... */
  const { q: perguntaExterna } = Route.useSearch();
  const navigate = Route.useNavigate();
  const perguntaEnviadaRef = useRef<string | null>(null);
  useEffect(() => {
    if (!perguntaExterna || !historico.isSuccess) return;
    if (perguntaEnviadaRef.current === perguntaExterna) return; // Já enviou essa pergunta

    perguntaEnviadaRef.current = perguntaExterna;
    setShowOnboarding(false);
    void enviar(perguntaExterna);
    void navigate({ to: "/chat", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntaExterna, historico.isSuccess]);

  const carregando = status === "submitted" || status === "streaming";

  async function enviar(texto: string) {
    const valor = texto.trim();
    if (!valor || carregando) return;

    try {
      setInput(""); // Limpa otimisticamente
      await sendMessage({ text: valor });
      queryClient.invalidateQueries({ queryKey: ["chat-mensagens"] });
      const ticker = valor.toUpperCase().match(/\b[A-Z]{4}\d{1,2}\b/)?.[0] ?? null;
      emitirRespostaGestorIA(ticker);
    } catch {
      // Restaura input em caso de erro
      setInput(valor);
      // O erro já é tratado pelo onError do useChat
    }
  }

  async function limpar() {
    try {
      await clearFn({ data: undefined });
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["chat-mensagens"] });
      toast.success("Conversa apagada");
    } catch (error) {
      toast.error("Não foi possível apagar a conversa", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function alternarCitacoes(valor: boolean) {
    setCitacoes(valor);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chat-citacoes", valor ? "on" : "off");
    }
  }

  async function gerarRelatorioPdf() {
    if (gerandoRelatorio) return;
    setGerandoRelatorio(true);
    try {
      const dados = await gerarRelatorio({ data: { perfil } });
      await gerarPdfRelatorioAuditoria(dados);
      toast.success("Relatório PDF dos Auditores gerado");
    } catch (error) {
      toast.error("Não foi possível gerar o relatório", {
        description:
          error instanceof Error
            ? error.message.includes("403")
              ? "Você não tem permissão para gerar relatórios."
              : error.message
            : undefined,
      });
    } finally {
      setGerandoRelatorio(false);
    }
  }

  return (
    <AppShell
      title="Gestor IA"
      description="Seu consultor PRO com auditoria de carteira, rebalanceamento, metas, notícias e agenda econômica."
    >
      <a
        href="#conteudo-gestor"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Pular para conversa
      </a>
      <div
        id="conteudo-gestor"
        className="flex h-[calc(100dvh-var(--altura-cabecalho-app,0px)-3rem)] min-h-0 flex-col gap-2.5 sm:h-[calc(100dvh-var(--altura-cabecalho-app,0px)-4rem)]"
      >
        {showOnboarding ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <OnboardingGestorIA
              onComplete={() => {
                setShowOnboarding(false);
                window.localStorage.setItem("gestor-ia-onboarded", "true");
              }}
            />
          </div>
        ) : (
          <Conversation
            className="min-h-0 flex-1 rounded-xl border border-border/60 bg-card/40 focus-within:ring-1 focus-within:ring-ring/20"
            aria-label="Conversa com Gestor IA"
            aria-busy={historico.isLoading || carregando}
          >
            <ConversationContent aria-live="polite" aria-relevant="additions" aria-atomic="false">
              {historico.isLoading ? (
                <SkeletonHistorico />
              ) : messages.length === 0 ? (
                <ConversationEmptyState
                  icon={
                    <img
                      src={logoIA}
                      alt="Gestor IA"
                      width={512}
                      height={512}
                      loading="lazy"
                      className="size-14 object-contain"
                    />
                  }
                  title="Fale com o Gestor IA PRO"
                  description="Ele conhece seus ativos, aportes, dividendos e metas — e usa dados reais de mercado, notícias e agenda econômica."
                >
                  <div
                    role="group"
                    aria-label="Sugestões rápidas"
                    className="mt-4 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    {SUGESTOES.map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        onClick={() => enviar(s)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            enviar(s);
                          }
                        }}
                        aria-label={`Enviar sugestão: ${s}`}
                        className="h-auto w-full min-w-0 whitespace-normal break-words px-3 py-2 text-left text-xs leading-snug focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </ConversationEmptyState>
              ) : (
                messages.map((message, idx) => {
                  const ferramentas = message.parts
                    .filter((part) => part.type.startsWith("tool-"))
                    .map((part) => part.type.replace("tool-", ""));
                  const texto = message.parts
                    .map((part) => (part.type === "text" ? part.text : ""))
                    .join("");
                  const ehUsuario = message.role === "user";
                  return (
                    <Message
                      key={message.id}
                      from={message.role}
                      role="article"
                      aria-label={`${ehUsuario ? "Você" : "Gestor IA"} — mensagem ${idx + 1} de ${messages.length}`}
                      tabIndex={0}
                      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      <MessageContent>
                        {ferramentas.length > 0 ? (
                          <p
                            role="status"
                            aria-live="polite"
                            className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            <LineChart className="size-3 shrink-0" aria-hidden="true" />
                            <span>Consultou dados de mercado: {[...new Set(ferramentas)].join(", ")}</span>
                          </p>
                        ) : null}
                        <MessageResponse>{texto}</MessageResponse>
                      </MessageContent>
                    </Message>
                  );
                })
              )}
              {status === "submitted" ? <SkeletonAnalisando /> : null}
              {status === "streaming" ? (
                <div role="status" aria-live="polite" aria-label="Gestor IA está respondendo" className="px-2">
                  <span className="sr-only">Gestor IA está respondendo…</span>
                  <Shimmer aria-hidden="true">Gerando resposta…</Shimmer>
                </div>
              ) : null}
              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {carregando ? "Gestor IA processando" : "Pronto para nova mensagem"}
              </div>
            </ConversationContent>
            <ConversationScrollButton aria-label="Rolar para última mensagem" />
          </Conversation>
        )}

        <PromptInput
          onSubmit={(message: PromptInputMessage, event) => {
            event.preventDefault();
            void enviar(message.text ?? input);
          }}
          aria-label="Enviar mensagem ao Gestor IA"
        >
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Peça uma auditoria, rebalanceamento, comparação de ativos ou o que está acontecendo no mercado..."
            aria-label="Mensagem para o Gestor IA"
            aria-describedby="dica-gestor"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                void enviar(input);
              }
            }}
            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
          />
          <span id="dica-gestor" className="sr-only">
            Pressione Enter para enviar, Shift+Enter para nova linha, Ctrl+Enter para envio rápido
          </span>
          <PromptInputFooter className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => enviar("Faça uma auditoria completa da minha carteira")}
              disabled={carregando}
              aria-label="Solicitar auditoria completa da carteira"
              className="h-8 shrink-0 rounded-full px-3 shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ShieldCheck className="size-4 shrink-0 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden truncate sm:inline">Auditoria</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={gerarRelatorioPdf}
              disabled={gerandoRelatorio || carregando}
              className="h-8 shrink-0 rounded-full px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Gerar relatório de auditoria em PDF"
              aria-busy={gerandoRelatorio}
              title="Gerar relatório de auditoria em PDF"
            >
              <FileText className="size-4 shrink-0 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden truncate sm:inline">
                {gerandoRelatorio ? "Gerando..." : "Relatório"}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              role="switch"
              aria-checked={citacoes}
              aria-label="Modo citações e justificativas"
              title="Citações e justificativas: cada recomendação aponta os dados e critérios usados"
              onClick={() => alternarCitacoes(!citacoes)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  alternarCitacoes(!citacoes);
                }
              }}
              className={`h-8 shrink-0 rounded-full px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${citacoes ? "border-primary/60 bg-primary/10 text-primary" : ""}`}
            >
              <BookOpenText className="size-4 shrink-0 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden truncate sm:inline">Citações</span>
              <span
                aria-hidden
                className={`ml-1 hidden h-4 w-7 shrink-0 rounded-full border transition-colors sm:ml-2 sm:inline-flex sm:items-center ${citacoes ? "border-primary/60 bg-primary/30" : "border-border bg-muted"}`}
              >
                <span
                  className={`size-3 rounded-full bg-current transition-transform ${citacoes ? "translate-x-3.5" : "translate-x-0.5"}`}
                />
              </span>
            </Button>
            <DialogoAprendizado />
            <ResumoCarteiraDialog />
            <DialogoProvedorIA />

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden="true" />
              <Select value={perfil} onValueChange={(v) => salvar(v as PerfilInvestidor)}>
                <SelectTrigger
                  className="h-8 w-28 shrink-0 rounded-full text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-32"
                  aria-label="Perfil de investidor"
                >
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  {PERFIS.map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={limpar}
                disabled={messages.length === 0 || carregando}
                className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Limpar conversa"
                title="Limpar conversa"
              >
                <Eraser className="size-4 shrink-0" aria-hidden="true" />
              </Button>
              <PromptInputSubmit
                status={status}
                disabled={!input.trim() && !carregando}
                aria-label={carregando ? "Gestor IA está respondendo" : "Enviar mensagem"}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </AppShell>
  );
}
