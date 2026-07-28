import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, LineChart, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
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
import { supabase } from "@/integrations/supabase/client";
import { listarMensagens, limparConversa } from "@/lib/chat.functions";
import logoIA from "@/assets/tecnico-ia.png";

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
        content: "Análises da sua carteira de ações, FIIs e renda fixa com inteligência artificial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SUGESTOES = [
  "Como PETR4 se comportou nos últimos 10 anos?",
  "Qual a projeção da Selic para os próximos anos?",
  "Compare BOVA11 com IVVB11 em retorno e risco",
  "Analise a diversificação da minha carteira",
];


function ChatPage() {
  const queryClient = useQueryClient();
  const fetchMensagens = useServerFn(listarMensagens);
  const clearFn = useServerFn(limparConversa);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState("");

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
          return token ? { Authorization: `Bearer ${token}` } : {};
        },

      }),
    [],
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

  return (
    <AppShell
      title="Técnico IA"
      description="Seu consultor de investimentos com acesso aos dados reais da sua carteira."
    >
      <div className="flex h-[calc(100vh-11rem)] min-h-[32rem] flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={logoIA}
              alt="Técnico IA"
              width={512}
              height={512}
              loading="lazy"
              className="size-9 rounded-lg object-contain"
            />
            <div>
              <p className="text-sm font-semibold">Técnico IA</p>
              <p className="text-xs text-muted-foreground">
                Análises educativas — não é recomendação de investimento.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={limpar} disabled={messages.length === 0 || carregando}>
            <Eraser className="mr-2 size-4" />
            Limpar
          </Button>
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
                title="Fale com o Técnico IA"
                description="Ele conhece seus ativos, aportes e dividendos registrados na plataforma."
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
            placeholder="Pergunte sobre aportes, rebalanceamento, dividendos..."
          />
          <PromptInputFooter className="justify-between">
            <span className="text-xs text-muted-foreground">
              <RefreshCw className="mr-1 inline size-3" />
              Respostas baseadas na sua carteira atual
            </span>
            <PromptInputSubmit status={status} disabled={!input.trim() && !carregando} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </AppShell>
  );
}
