import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, FileText, LineChart, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AbasPlanejamento } from "@/components/abas-planejamento";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
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
import logoIA from "@/assets/tecnico-ia.png";
import { urlAbsoluta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "Técnico IA — Assistente da sua carteira | Investidor em 15 Anos" },
      {
        name: "description",
        content:
          "Converse com o Técnico IA sobre a sua carteira: rebalanceamento, aportes, dividendos e metas de independência financeira.",
      },
      { property: "og:title", content: "Técnico IA — Assistente da sua carteira" },
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState("");
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
          };
        },
      }),
    [perfil],
  );

  const { messages, sendMessage, setMessages, status } = useChat({
    id: "tecnico-ia",
    transport,
    onError: (error) =>
      toast.error("Não foi possível falar com o Técnico IA", {
        description: error.message.includes("429")
          ? "Muitas mensagens em sequência. Aguarde alguns instantes."
          : error.message.includes("402")
            ? "Os créditos de IA do workspace acabaram."
            : error.message,
      }),
  });

  const hidratado = useRef(false);
  useEffect(() => {
    if (hidratado.current || !historico.isSuccess) return;
    hidratado.current = true;
    if (initialMessages.length > 0) setMessages(initialMessages);
  }, [historico.isSuccess, initialMessages, setMessages]);

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  const carregando = status === "submitted" || status === "streaming";

  async function enviar(texto: string) {
    const valor = texto.trim();
    if (!valor || carregando) return;
    setInput("");
    await sendMessage({ text: valor });
    queryClient.invalidateQueries({ queryKey: ["chat-mensagens"] });
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
      title="Técnico IA"
      description="Seu consultor PRO com auditoria de carteira, rebalanceamento, metas, notícias e agenda econômica."
    >
      <AbasPlanejamento />
      <div className="flex h-[calc(100dvh-13rem)] min-h-[28rem] flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <img
              src={logoIA}
              alt="Técnico IA"
              width={512}
              height={512}
              loading="lazy"
              className="size-9 shrink-0 rounded-xl object-contain ring-1 ring-border/60"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Técnico IA</p>
              <p className="truncate text-xs text-muted-foreground">
                Análises educativas — não é recomendação de investimento.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={() => enviar("Faça uma auditoria completa da minha carteira")}
              disabled={carregando}
              className="min-w-0 rounded-full shadow-[var(--shadow-lift)]"
            >
              <ShieldCheck className="mr-2 size-4 shrink-0" />
              <span className="truncate">Auditoria</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={gerarRelatorioPdf}
              disabled={gerandoRelatorio}
              className="min-w-0 rounded-full"
            >
              <FileText className="mr-2 size-4 shrink-0" />
              <span className="truncate">{gerandoRelatorio ? "Gerando..." : "Relatório PDF"}</span>
            </Button>
            <Select value={perfil} onValueChange={(v) => salvar(v as PerfilInvestidor)}>
              <SelectTrigger
                className="w-full min-w-0 rounded-full sm:w-40"
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
              size="sm"
              onClick={limpar}
              disabled={messages.length === 0 || carregando}
              className="min-w-0 rounded-full"
            >
              <Eraser className="mr-2 size-4 shrink-0" />
              <span className="truncate">Limpar</span>
            </Button>
          </div>
        </div>


        <Conversation className="flex-1 rounded-xl border border-border/60 bg-card/40">
          <ConversationContent>
            {historico.isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Shimmer>Carregando conversa...</Shimmer>
              </div>
            ) : messages.length === 0 ? (
              <ConversationEmptyState
                icon={
                  <img
                    src={logoIA}
                    alt=""
                    width={512}
                    height={512}
                    loading="lazy"
                    className="size-14 object-contain"
                  />
                }
                title="Fale com o Técnico IA PRO"
                description="Ele conhece seus ativos, aportes, dividendos e metas — e usa dados reais de mercado, notícias e agenda econômica."
              >
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGESTOES.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => enviar(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message) => {
                const ferramentas = message.parts
                  .filter((part) => part.type.startsWith("tool-"))
                  .map((part) => part.type.replace("tool-", ""));
                const texto = message.parts
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join("");
                return (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {ferramentas.length > 0 ? (
                        <p className="mb-2 text-xs text-muted-foreground">
                          <LineChart className="mr-1 inline size-3" />
                          Consultou dados de mercado: {[...new Set(ferramentas)].join(", ")}
                        </p>
                      ) : null}
                      <MessageResponse>{texto}</MessageResponse>
                    </MessageContent>
                  </Message>
                );
              })
            )}
            {status === "submitted" ? (
              <div className="px-2 pt-2">
                <Shimmer>Analisando sua carteira...</Shimmer>
              </div>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          onSubmit={(message: PromptInputMessage, event) => {
            event.preventDefault();
            void enviar(message.text ?? input);
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Peça uma auditoria, rebalanceamento, comparação de ativos ou o que está acontecendo no mercado..."
          />
          <PromptInputFooter className="justify-between">
            <span className="text-xs text-muted-foreground">
              <RefreshCw className="mr-1 inline size-3" />
              Modo PRO · carteira, perfil{" "}
              {PERFIS.find((p) => p.valor === perfil)?.rotulo.toLowerCase()} e mercado em tempo real
            </span>
            <PromptInputSubmit status={status} disabled={!input.trim() && !carregando} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </AppShell>
  );
}
